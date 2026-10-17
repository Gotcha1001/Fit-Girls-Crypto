import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  QueryCtx,
} from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";
import { isValidTimeZone } from "./lib/schedule";
import { isValidCountry } from "./lib/timezones";
import { loadRates } from "./lib/fxRates";
import {
  currencyForCountry,
  formatMoney,
  limitsFor,
  withinLimits,
} from "./lib/currency";

// Rate limits in cents per minute: R5 to R100 (ZAR).
// Converted to the girl's currency at save time.
const MIN_RATE = 500;
const MAX_RATE = 10000;

// QueryCtx works for mutations too, because a mutation context is a superset.
async function userByClerkId(
  ctx: QueryCtx,
  clerkId: string,
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
}

async function myHost(ctx: QueryCtx): Promise<Doc<"hosts">> {
  const user = await requireCurrentUser(ctx);
  const host = await ctx.db
    .query("hosts")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  if (!host) throw new Error("Save your profile first");
  return host;
}

// Safe for the browser: never returns the wallet address
export const getMyHost = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!host) return null;
    return {
      _id: host._id,
      displayName: host.displayName,
      bio: host.bio,
      avatarUrl: host.avatarId ? await ctx.storage.getUrl(host.avatarId) : null,
      ratePerMinuteCents: host.ratePerMinuteCents,
      status: host.status,
      kycStatus: host.kycStatus,
      payoutReady: !!host.payoutAccountRef,
      bankLast4: host.bankLast4 ?? null,
      timezone: host.timezone ?? null,
      country: host.country ?? null,
    };
  },
});

// Step 1 of onboarding: create or update the public profile.
export const saveProfile = mutation({
  args: {
    displayName: v.string(),
    bio: v.string(),
    ratePerMinuteCents: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "host") {
      throw new Error("Activate your host access first");
    }

    // Her country and time zone are chosen once (onboarding / settings) and
    // copied onto the host row, so every booking rule can read host.timezone.
    // Destructured into consts so TypeScript narrows them to plain strings.
    const { country, timezone } = user;
    if (
      !country ||
      !timezone ||
      !isValidCountry(country) ||
      !isValidTimeZone(timezone)
    ) {
      throw new Error("Choose your country and time zone first");
    }
    const locale = { country, timezone };

    const displayName = args.displayName.trim();
    const bio = args.bio.trim();
    if (displayName.length < 2 || displayName.length > 40)
      throw new Error("Display name must be 2 to 40 characters");
    if (bio.length > 500)
      throw new Error("Bio must be 500 characters or fewer");

    // Convert the fixed ZAR limits (R5–R100) into her currency and validate.
    const rates = await loadRates(ctx);
    const currency = currencyForCountry(country, rates);
    const limits = limitsFor(MIN_RATE, MAX_RATE, currency, rates);
    if (!withinLimits(args.ratePerMinuteCents, limits)) {
      throw new Error(
        `Rate must be between ${formatMoney(limits.min, currency)} and ${formatMoney(limits.max, currency)} per minute`,
      );
    }

    const existing = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName,
        bio,
        ratePerMinuteCents: args.ratePerMinuteCents,
        ...locale,
      });
      return existing._id;
    }

    // The admin already checked her ID when approving her application,
    // so a girl who activated her code is bookable once her payout is set up.
    const application = await ctx.db
      .query("hostApplications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    const preApproved =
      application?.status === "activated" && application.idChecked === true;

    return await ctx.db.insert("hosts", {
      userId: user._id,
      displayName,
      bio,
      ratePerMinuteCents: args.ratePerMinuteCents,
      minMinutes: 10,
      status: preApproved ? "approved" : "pending",
      kycStatus: preApproved ? "verified" : "none",
  payoutProvider: "plisio",
      isOnline: false,
      ...locale,
    });
  },
});

// Used by the payout action (the action passes the clerkId it verified).
export const getHostForPayout = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await userByClerkId(ctx, clerkId);
    if (!user) return null;
    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!host) return null;
    return { hostId: host._id, hasPayout: !!host.payoutAccountRef };
  },
});

export const savePayout = internalMutation({
  args: {
    hostId: v.id("hosts"),
    payoutAccountRef: v.string(),
    bankLast4: v.string(),
  },
  handler: async (ctx, { hostId, payoutAccountRef, bankLast4 }) => {
    await ctx.db.patch(hostId, {
payoutProvider: "plisio",
      payoutAccountRef,
      bankLast4,
    });
  },
});

// Bookable hosts only: approved, ID verified, and bank/subaccount set up.
export const listApproved = query({
  args: {},
  handler: async (ctx) => {
    const hosts = await ctx.db
      .query("hosts")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    const bookable = hosts.filter(
      (h) => h.kycStatus === "verified" && !!h.payoutAccountRef,
    );
    return await Promise.all(
      bookable.map(async (h) => ({
        _id: h._id,
        displayName: h.displayName,
        bio: h.bio,
        avatarUrl: h.avatarId ? await ctx.storage.getUrl(h.avatarId) : null,
        ratePerMinuteCents: h.ratePerMinuteCents,
        minMinutes: h.minMinutes,
        timezone: h.timezone ?? null,
        country: h.country ?? null,
      })),
    );
  },
});

export const getPublic = query({
  // string, not v.id: a malformed ID in the URL should show "not found", not crash the page
  args: { hostId: v.string() },
  handler: async (ctx, { hostId: rawId }) => {
    const hostId = ctx.db.normalizeId("hosts", rawId);
    if (!hostId) return null;
    const h = await ctx.db.get(hostId);
    if (
      !h ||
      h.status !== "approved" ||
      h.kycStatus !== "verified" ||
      !h.payoutAccountRef
    ) {
      return null;
    }
    return {
      _id: h._id,
      userId: h.userId, // needed so clients can address gifts to her user
      displayName: h.displayName,
      avatarUrl: h.avatarId ? await ctx.storage.getUrl(h.avatarId) : null,
      bio: h.bio,
      ratePerMinuteCents: h.ratePerMinuteCents,
      minMinutes: h.minMinutes,
      timezone: h.timezone ?? null,
      country: h.country ?? null,
    };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await myHost(ctx); // only people with a host profile can upload
    return await ctx.storage.generateUploadUrl();
  },
});

export const setAvatar = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const host = await myHost(ctx);
    if (host.avatarId) await ctx.storage.delete(host.avatarId); // remove old photo
    await ctx.db.patch(host._id, { avatarId: storageId });
  },
});
