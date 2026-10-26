// convex/wallet.ts  (REPLACE whole file)
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { CHARGE_CURRENCY } from "./lib/currency";
import { loadRates } from "./lib/fxRates";
import { fulfilPaidBooking } from "./lib/fulfilBooking";

/**
 * Wallet = append-only ledger (walletTransactions), separate from the
 * existing users.tokens / profiles.coins dating currencies.
 * Balance = credits - debits. Single currency (CHARGE_CURRENCY = ZAR).
 */
const WALLET_PAYMENTS_ENABLED = true;

async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

async function balanceFor(ctx: QueryCtx, userId: Id<"users">) {
  const rows = await ctx.db
    .query("walletTransactions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return rows.reduce(
    (sum, r) => sum + (r.type === "credit" ? r.amountCents : -r.amountCents),
    0,
  );
}

/**
 * Idempotent credit: calling twice for the same booking + reason is a
 * no-op, so retried jobs can never credit a guest twice.
 */
export async function creditWallet(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    bookingId: Id<"bookings">;
    amountCents: number;
    currency: string;
    reason: "host_no_show";
  },
) {
  const existing = await ctx.db
    .query("walletTransactions")
    .withIndex("by_booking_reason", (q) =>
      q.eq("bookingId", args.bookingId).eq("reason", args.reason),
    )
    .first();
  if (existing) return existing._id;
  return await ctx.db.insert("walletTransactions", {
    userId: args.userId,
    bookingId: args.bookingId,
    type: "credit",
    amountCents: args.amountCents,
    currency: args.currency,
    reason: args.reason,
    createdAt: Date.now(),
  });
}

export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return 0;
    return await balanceFor(ctx, user._id);
  },
});

export const getTransactions = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("walletTransactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    return await Promise.all(
      rows.map(async (r) => {
        const booking = r.bookingId ? await ctx.db.get(r.bookingId) : null;
        return { ...r, bookingStartsAt: booking?.startsAt ?? null };
      }),
    );
  },
});

/**
 * Pay for a NEW booking with wallet credit. Credit must cover the full price
 * (no part-payments yet).
 *
 * Returns { ok: false, reason: "insufficient", ... } instead of throwing when
 * the balance is too low, so the UI can offer card payment instead.
 */
export const spendOnBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    if (!WALLET_PAYMENTS_ENABLED) {
      throw new Error("Wallet payments are not enabled yet");
    }
    const user = await currentUser(ctx);
    if (!user) throw new Error("Not signed in");

    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.guestId !== user._id) throw new Error("Not your booking");

    // Retried call after success: already paid, nothing to do.
    const already = await ctx.db
      .query("walletTransactions")
      .withIndex("by_booking_reason", (q) =>
        q.eq("bookingId", bookingId).eq("reason", "booking_payment"),
      )
      .first();
    if (already) return { ok: true as const };

    if (booking.status !== "pending_payment") {
      throw new Error("Booking is not awaiting payment");
    }
    if (booking.startsAt <= Date.now()) {
      throw new Error("That time has already started. Pick another slot.");
    }
    const host = await ctx.db.get(booking.hostId);
    if (!host || host.status !== "approved" || !host.payoutAccountRef) {
      throw new Error("Host unavailable");
    }

    const balance = await balanceFor(ctx, user._id);
    if (balance < booking.amountCents) {
      return {
        ok: false as const,
        reason: "insufficient" as const,
        balanceCents: balance,
        neededCents: booking.amountCents,
      };
    }

    // The host's share is paid in USDT. A wallet payment brings no new USDT,
    // so convert her ZAR share at today's rate (rates are USD-based, USDT ~ USD).
    const rates = await loadRates(ctx);
    const zarPerUsd = rates[CHARGE_CURRENCY];
    if (!zarPerUsd || zarPerUsd <= 0) {
      throw new Error("Exchange rate unavailable, please try again shortly");
    }
    const hostShareUsdt =
      Math.floor((booking.hostShareCents / 100 / zarPerUsd) * 100) / 100;

    // 1. debit the ledger
    await ctx.db.insert("walletTransactions", {
      userId: user._id,
      bookingId,
      type: "debit",
      amountCents: booking.amountCents,
      currency: CHARGE_CURRENCY,
      reason: "booking_payment",
      createdAt: Date.now(),
    });

    // 2. record it as a payment so the rest of the system sees a paid booking
    const paymentId = await ctx.db.insert("payments", {
      kind: "booking",
      refId: bookingId,
      payerId: user._id,
      hostId: booking.hostId,
      amountCents: booking.amountCents,
      platformFeeCents: booking.platformFeeCents,
      hostShareCents: booking.hostShareCents,
      currency: CHARGE_CURRENCY,
      providerReference: `wallet:${bookingId}`,
      status: "succeeded",
    });

    // 3. paid + call room + host payout + no-show check (same code as card/crypto)
    await fulfilPaidBooking(ctx, { booking, paymentId, hostShareUsdt });

    return { ok: true as const };
  },
});
