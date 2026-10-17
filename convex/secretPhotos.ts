// convex/secretPhotos.ts
//
// A host sells up to 5 "secret photos". She prices them in HER currency (set by
// her country); clients see them converted into THEIR currency. The order is
// charged in CHARGE_CURRENCY (rand while Paystack is the test gateway): the
// platform keeps 20%, the host gets 80%.
// (Tokens/gifts are a separate system and are NOT used here.)
//
//   buyer taps Unlock  ->  createPhotoOrder / createBundleOrder  (pending order)
//                      ->  secretPhotoPayments.initCheckout      (Paystack link)
//                      ->  Paystack webhook -> payments.markSucceeded
//                      ->  fulfilSecretPhotoOrder: order paid, photos unlocked
//
// Only the watermarked full photo and a blurred preview are stored; both are
// made in the host's browser (lib/watermark.ts). Full-photo URLs are returned
// only to the buyer and to the host who owns the photo.
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type DatabaseReader,
  type MutationCtx,
} from "./_generated/server";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";
import {
  CHARGE_CURRENCY,
  convertMinor,
  currencyForCountry,
  formatMoney,
  limitsFor,
  withinLimits,
  type Limits,
  type Rates,
} from "./lib/currency";
import { split } from "./lib/fees";
import { loadRates } from "./lib/fxRates";

export const MAX_ACTIVE_PHOTOS = 5;
// Limits are defined in rand (CHARGE_CURRENCY) and converted to each girl's
// currency by limitsFor(), so R10 to R500 becomes about $0.55 to $28 for a girl
// paid in dollars.
export const MIN_PRICE_BASE = 1_000; // R10
export const MAX_PRICE_BASE = 50_000; // R500
export const MAX_BUNDLE_PRICE_BASE = 250_000; // R2 500
export const MIN_BUNDLE_PHOTOS = 2;
const MAX_BYTES = 4 * 1024 * 1024; // each uploaded file

// ── helpers ────────────────────────────────────────────────────────────────

async function requireSellingHost(ctx: MutationCtx): Promise<Doc<"hosts">> {
  const user = await requireCurrentUser(ctx);
  if (user.role !== "host") throw new Error("Only hosts can sell photos");
  const host = await ctx.db
    .query("hosts")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
  if (!host || host.status !== "approved") {
    throw new Error("Your host profile must be approved first");
  }
  if (!host.payoutAccountRef) {
    throw new Error("Set up your bank details first so we can pay you");
  }
  return host;
}

async function requireClient(ctx: MutationCtx): Promise<Doc<"users">> {
  const user = await requireCurrentUser(ctx);
  if (user.role !== "user" || user.onboardingChoice !== "client") {
    throw new Error("Only clients can buy photos");
  }
  return user;
}

// Her currency, today's rates and her price limits, in one place.
type Pricing = {
  currency: string;
  rates: Rates;
  photoLimits: Limits;
  bundleLimits: Limits;
};

async function pricingFor(
  ctx: { db: DatabaseReader },
  host: Doc<"hosts">,
): Promise<Pricing> {
  const rates = await loadRates(ctx);
  const currency = currencyForCountry(host.country, rates);
  return {
    currency,
    rates,
    photoLimits: limitsFor(MIN_PRICE_BASE, MAX_PRICE_BASE, currency, rates),
    bundleLimits: limitsFor(
      MIN_PRICE_BASE,
      MAX_BUNDLE_PRICE_BASE,
      currency,
      rates,
    ),
  };
}

function priceError(what: string, limits: Limits, currency: string): Error {
  return new Error(
    `${what} must be between ${formatMoney(limits.min, currency)} and ${formatMoney(limits.max, currency)}.`,
  );
}

async function activePhotos(
  ctx: { db: DatabaseReader },
  hostId: Id<"hosts">,
): Promise<Doc<"secretPhotos">[]> {
  const all = await ctx.db
    .query("secretPhotos")
    .withIndex("by_host", (q) => q.eq("hostId", hostId))
    .collect();
  return all.filter((p) => p.removedAt === undefined);
}

async function owns(
  ctx: { db: DatabaseReader },
  photoId: Id<"secretPhotos">,
  buyerId: Id<"users">,
): Promise<boolean> {
  const row = await ctx.db
    .query("secretPhotoPurchases")
    .withIndex("by_photo_buyer", (q) =>
      q.eq("photoId", photoId).eq("buyerId", buyerId),
    )
    .first();
  return row !== null;
}

async function checkUpload(
  ctx: MutationCtx,
  id: Id<"_storage">,
  label: string,
): Promise<void> {
  const meta = await ctx.db.system.get(id);
  if (!meta) throw new Error(`The ${label} didn't upload. Please try again.`);
  if (meta.contentType !== "image/jpeg") {
    throw new Error(`The ${label} must be a JPEG.`);
  }
  if (meta.size > MAX_BYTES) throw new Error(`The ${label} is too large.`);
}

// All amounts here are in the HOST's currency. What a bundle costs THIS buyer. They only pay for photos they don't own yet:
//   scaled = bundle price x (photos left / photos in the bundle)
//   price  = the cheaper of `scaled` and those photos' own prices added up,
// so a bundle never costs more than buying the photos one by one.
async function bundleQuote(
  ctx: { db: DatabaseReader },
  host: Doc<"hosts">,
  buyerId: Id<"users">,
  minPrice: number,
): Promise<{ unowned: Doc<"secretPhotos">[]; priceCents: number } | null> {
  const bundle = host.photoBundlePriceCents;
  if (bundle === undefined) return null;
  const photos = await activePhotos(ctx, host._id);
  if (photos.length < MIN_BUNDLE_PHOTOS) return null;

  const unowned: Doc<"secretPhotos">[] = [];
  for (const p of photos) {
    if (!(await owns(ctx, p._id, buyerId))) unowned.push(p);
  }
  if (unowned.length === 0) return null;

  const scaled = Math.ceil((bundle * unowned.length) / photos.length);
  const individually = unowned.reduce((sum, p) => sum + p.priceCents, 0);
  return {
    unowned,
    priceCents: Math.max(minPrice, Math.min(scaled, individually)),
  };
}

// ── host: upload ───────────────────────────────────────────────────────────

// Step 1. Checks the 5-photo limit BEFORE any upload, then hands out two
// one-time upload URLs (full photo + blurred preview).
export const prepareUpload = mutation({
  args: {},
  handler: async (ctx) => {
    const host = await requireSellingHost(ctx);
    if ((await activePhotos(ctx, host._id)).length >= MAX_ACTIVE_PHOTOS) {
      throw new Error(
        `You can have up to ${MAX_ACTIVE_PHOTOS} secret photos. Delete one to add another.`,
      );
    }
    return {
      fullUploadUrl: await ctx.storage.generateUploadUrl(),
      previewUploadUrl: await ctx.storage.generateUploadUrl(),
    };
  },
});

// Step 2. Saves the photo once both files are uploaded.
export const add = mutation({
  args: {
    fullStorageId: v.id("_storage"),
    previewStorageId: v.id("_storage"),
    priceCents: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"secretPhotos">> => {
    const host = await requireSellingHost(ctx);
    // Re-checked: two tabs could both pass prepareUpload.
    if ((await activePhotos(ctx, host._id)).length >= MAX_ACTIVE_PHOTOS) {
      throw new Error(`You can have up to ${MAX_ACTIVE_PHOTOS} secret photos.`);
    }
    const pricing = await pricingFor(ctx, host);
    if (!withinLimits(args.priceCents, pricing.photoLimits)) {
      throw priceError("Price", pricing.photoLimits, pricing.currency);
    }
    await checkUpload(ctx, args.fullStorageId, "photo");
    await checkUpload(ctx, args.previewStorageId, "preview");

    return await ctx.db.insert("secretPhotos", {
      hostId: host._id,
      fullStorageId: args.fullStorageId,
      previewStorageId: args.previewStorageId,
      priceCents: args.priceCents,
      createdAt: Date.now(),
    });
  },
});

export const updatePrice = mutation({
  args: { photoId: v.id("secretPhotos"), priceCents: v.number() },
  handler: async (ctx, { photoId, priceCents }) => {
    const host = await requireSellingHost(ctx);
    const photo = await ctx.db.get(photoId);
    if (!photo || photo.hostId !== host._id || photo.removedAt !== undefined) {
      throw new Error("Photo not found");
    }
    const pricing = await pricingFor(ctx, host);
    if (!withinLimits(priceCents, pricing.photoLimits)) {
      throw priceError("Price", pricing.photoLimits, pricing.currency);
    }
    // Past buyers keep what they paid; open orders keep the price they saw.
    await ctx.db.patch(photoId, { priceCents });
  },
});

// Stops selling the photo and frees a slot. If anyone bought it, or has a
// payment in flight for it, it is only hidden (they keep access). Otherwise it
// is deleted for real, files included.
export const remove = mutation({
  args: { photoId: v.id("secretPhotos") },
  handler: async (ctx, { photoId }) => {
    const host = await requireSellingHost(ctx);
    const photo = await ctx.db.get(photoId);
    if (!photo || photo.hostId !== host._id) throw new Error("Photo not found");
    if (photo.removedAt !== undefined) return;

    const sold = await ctx.db
      .query("secretPhotoPurchases")
      .withIndex("by_photo_buyer", (q) => q.eq("photoId", photoId))
      .first();
    const pending = (
      await ctx.db
        .query("secretPhotoOrders")
        .withIndex("by_host_status", (q) =>
          q.eq("hostId", host._id).eq("status", "pending"),
        )
        .collect()
    ).some((o) => o.items.some((i) => i.photoId === photoId));

    if (sold || pending) {
      await ctx.db.patch(photoId, { removedAt: Date.now() });
    } else {
      await ctx.storage.delete(photo.fullStorageId);
      await ctx.storage.delete(photo.previewStorageId);
      await ctx.db.delete(photoId);
    }
  },
});

// She sets (or clears) the price for buying ALL her photos at once.
export const setBundlePrice = mutation({
  args: { priceCents: v.union(v.number(), v.null()) },
  handler: async (ctx, { priceCents }) => {
    const host = await requireSellingHost(ctx);
    if (priceCents === null) {
      await ctx.db.patch(host._id, { photoBundlePriceCents: undefined });
      return;
    }
    const pricing = await pricingFor(ctx, host);
    if (!withinLimits(priceCents, pricing.bundleLimits)) {
      throw priceError("Bundle price", pricing.bundleLimits, pricing.currency);
    }
    if ((await activePhotos(ctx, host._id)).length < MIN_BUNDLE_PHOTOS) {
      throw new Error(
        `Add at least ${MIN_BUNDLE_PHOTOS} photos before setting a bundle price.`,
      );
    }
    await ctx.db.patch(host._id, { photoBundlePriceCents: priceCents });
  },
});

// ── host: her own photos ───────────────────────────────────────────────────

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "host") return null;
    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!host) return null;

    const photos = (
      await ctx.db
        .query("secretPhotos")
        .withIndex("by_host", (q) => q.eq("hostId", host._id))
        .collect()
    ).filter((p) => p.removedAt === undefined);

    const pricing = await pricingFor(ctx, host);
    const list = await Promise.all(
      photos.map(async (p) => {
        const sales = await ctx.db
          .query("secretPhotoPurchases")
          .withIndex("by_photo_buyer", (q) => q.eq("photoId", p._id))
          .collect();
        // Sales are recorded in the charge currency; show her earnings in hers.
        const earnedCharge = sales.reduce(
          (sum, s) => sum + s.hostShareCents,
          0,
        );
        return {
          _id: p._id,
          priceCents: p.priceCents,
          url: await ctx.storage.getUrl(p.fullStorageId),
          sales: sales.length,
          earnedCents: convertMinor(
            earnedCharge,
            CHARGE_CURRENCY,
            pricing.currency,
            pricing.rates,
          ),
        };
      }),
    );
    return {
      ready: host.status === "approved" && !!host.payoutAccountRef,
      currency: pricing.currency,
      photoLimits: pricing.photoLimits,
      bundleLimits: pricing.bundleLimits,
      photos: list,
      bundlePriceCents: host.photoBundlePriceCents ?? null,
      individualTotalCents: list.reduce((sum, p) => sum + p.priceCents, 0),
    };
  },
});

// ── client: a girl's profile ───────────────────────────────────────────────

// Everyone gets the blurred preview. `fullUrl` is filled ONLY for photos the
// viewer has paid for.
export const listForHost = query({
  args: { hostId: v.id("hosts") },
  handler: async (ctx, { hostId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const host = await ctx.db.get(hostId);
    if (!host || host.status !== "approved" || !host.payoutAccountRef) {
      return null;
    }

    const photos = (
      await ctx.db
        .query("secretPhotos")
        .withIndex("by_host", (q) => q.eq("hostId", hostId))
        .collect()
    )
      .filter((p) => p.removedAt === undefined)
      .sort((a, b) => a.createdAt - b.createdAt);

    const list = await Promise.all(
      photos.map(async (p) => {
        const owned = await owns(ctx, p._id, user._id);
        return {
          _id: p._id,
          priceCents: p.priceCents,
          previewUrl: await ctx.storage.getUrl(p.previewStorageId),
          owned,
          fullUrl: owned ? await ctx.storage.getUrl(p.fullStorageId) : null,
        };
      }),
    );

    const pricing = await pricingFor(ctx, host);
    const quote = await bundleQuote(
      ctx,
      host,
      user._id,
      pricing.photoLimits.min,
    );
    return {
      currency: pricing.currency, // the prices below are in HER currency
      photos: list,
      bundle: quote
        ? {
            priceCents: quote.priceCents,
            photoCount: quote.unowned.length,
            individualCents: quote.unowned.reduce(
              (sum, p) => sum + p.priceCents,
              0,
            ),
          }
        : null,
    };
  },
});

// ── client: create an order (then call secretPhotoPayments.initCheckout) ───

export const createPhotoOrder = mutation({
  args: { photoId: v.id("secretPhotos") },
  handler: async (ctx, { photoId }): Promise<Id<"secretPhotoOrders">> => {
    const user = await requireClient(ctx);
    const photo = await ctx.db.get(photoId);
    if (!photo || photo.removedAt !== undefined) {
      throw new Error("This photo is no longer available");
    }
    const host = await ctx.db.get(photo.hostId);
    if (!host || host.status !== "approved" || !host.payoutAccountRef) {
      throw new Error("This host can't sell photos right now");
    }
    if (await owns(ctx, photoId, user._id)) {
      throw new Error("You already own this photo");
    }
    // Her price is in her currency; the gateway charges in CHARGE_CURRENCY.
    const { currency, rates } = await pricingFor(ctx, host);
    const amountCents = convertMinor(
      photo.priceCents,
      currency,
      CHARGE_CURRENCY,
      rates,
    );
    const fees = split(amountCents); // 20% platform / 80% host
    return await ctx.db.insert("secretPhotoOrders", {
      buyerId: user._id,
      hostId: host._id,
      kind: "single",
      items: [{ photoId, priceCents: photo.priceCents }],
      priceMinor: photo.priceCents,
      priceCurrency: currency,
      amountCents,
      platformFeeCents: fees.platformFeeCents,
      hostShareCents: fees.hostShareCents,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const createBundleOrder = mutation({
  args: { hostId: v.id("hosts") },
  handler: async (ctx, { hostId }): Promise<Id<"secretPhotoOrders">> => {
    const user = await requireClient(ctx);
    const host = await ctx.db.get(hostId);
    if (!host || host.status !== "approved" || !host.payoutAccountRef) {
      throw new Error("This host can't sell photos right now");
    }
    const pricing = await pricingFor(ctx, host);
    const quote = await bundleQuote(
      ctx,
      host,
      user._id,
      pricing.photoLimits.min,
    );
    if (!quote) throw new Error("This bundle isn't available");

    const amountCents = convertMinor(
      quote.priceCents,
      pricing.currency,
      CHARGE_CURRENCY,
      pricing.rates,
    );
    const fees = split(amountCents);
    return await ctx.db.insert("secretPhotoOrders", {
      buyerId: user._id,
      hostId,
      kind: "bundle",
      items: quote.unowned.map((p) => ({
        photoId: p._id,
        priceCents: p.priceCents,
      })),
      priceMinor: quote.priceCents,
      priceCurrency: pricing.currency,
      amountCents,
      platformFeeCents: fees.platformFeeCents,
      hostShareCents: fees.hostShareCents,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// The /photos page watches this after Paystack sends the buyer back, so it can
// say "confirming your payment" until the webhook lands.
export const getMyOrder = query({
  // string, not v.id: a malformed ID in the URL should read as "not found"
  args: { orderId: v.string() },
  handler: async (ctx, { orderId: raw }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const id = ctx.db.normalizeId("secretPhotoOrders", raw);
    if (!id) return null;
    const order = await ctx.db.get(id);
    if (!order || order.buyerId !== user._id) return null;
    return { status: order.status, photoCount: order.items.length };
  },
});

// ── client: library ────────────────────────────────────────────────────────

export const listPurchased = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("secretPhotoPurchases")
      .withIndex("by_buyer", (q) => q.eq("buyerId", user._id))
      .order("desc")
      .collect();

    const out = await Promise.all(
      rows.map(async (r) => {
        const photo = await ctx.db.get(r.photoId);
        if (!photo) return null;
        const host = await ctx.db.get(r.hostId);
        return {
          _id: r._id,
          hostId: r.hostId,
          hostName: host?.displayName ?? "Unknown",
          purchasedAt: r.createdAt,
          url: await ctx.storage.getUrl(photo.fullStorageId),
        };
      }),
    );
    return out.filter((x): x is NonNullable<typeof x> => x !== null);
  },
});

// ── internal: used by secretPhotoPayments.initCheckout ─────────────────────

// Same checks as bookings.getForCheckout: the caller must own a pending order.
export const getForCheckout = internalQuery({
  args: { orderId: v.id("secretPhotoOrders"), clerkId: v.string() },
  handler: async (ctx, { orderId, clerkId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "pending") throw new Error("Order is already paid");
    const buyer = await ctx.db.get(order.buyerId);
    if (!buyer || buyer.clerkId !== clerkId) throw new Error("Not your order");
    const host = await ctx.db.get(order.hostId);
    if (!host || host.status !== "approved")
      throw new Error("Host unavailable");
    if (!host.payoutAccountRef) throw new Error("Host has no payout account");
    return {
      hostId: host._id,
      payerId: buyer._id,
      buyerEmail: buyer.email,
      hostSubaccountCode: host.payoutAccountRef,
      amountCents: order.amountCents,
      platformFeeCents: order.platformFeeCents,
    };
  },
});

export const recordPayment = internalMutation({
  args: {
    providerReference: v.string(),
    orderId: v.id("secretPhotoOrders"),
    hostId: v.id("hosts"),
    payerId: v.id("users"),
    amountCents: v.number(),
    platformFeeCents: v.number(),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("payments", {
      providerReference: a.providerReference,
      refId: a.orderId,
      kind: "gallery", // the existing kind for photo sales
      hostId: a.hostId,
      payerId: a.payerId,
      amountCents: a.amountCents,
      platformFeeCents: a.platformFeeCents,
      hostShareCents: a.amountCents - a.platformFeeCents,
      currency: "ZAR",
      status: "initiated",
    });
  },
});
