import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fulfilSecretPhotoOrder } from "./lib/secretPhotoOrders";
import { createInvoice } from "./lib/plisio";
import { fulfilPaidBooking } from "./lib/fulfilBooking";

// Hosts are paid this long AFTER the call ends, so a no-show can still be refunded.
// Set to 0 if you want payouts as soon as the next cron run.

const GALLERY_HOLD_MS = 24 * 60 * 60 * 1000;

type PaystackInitResponse = {
  status: boolean;
  message?: string;
  data?: { authorization_url: string; reference: string };
};

export const initCheckout = action({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");

    const b = await ctx.runQuery(internal.bookings.getForCheckout, {
      bookingId,
      clerkId: identity.subject,
    });

    const reference = `bk_${bookingId}_${Date.now()}`;
    const bookingPage = `${process.env.SITE_URL}/bookings/${bookingId}`;

    const invoice = await createInvoice({
      orderName: reference,
      amountCents: b.amountCents,
      currency: "ZAR",
      email: b.guestEmail,
      description: "Booking",
      successUrl: bookingPage,
      failUrl: bookingPage,
    });

    await ctx.runMutation(internal.payments.record, {
      providerReference: reference,
      bookingId,
      hostId: b.hostId,
      payerId: b.payerId,
      amountCents: b.amountCents,
      platformFeeCents: b.platformFeeCents,
    });
    return invoice.invoiceUrl;
  },
});

export const record = internalMutation({
  args: {
    providerReference: v.string(),
    bookingId: v.id("bookings"),
    hostId: v.id("hosts"),
    payerId: v.id("users"),
    amountCents: v.number(),
    platformFeeCents: v.number(),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("payments", {
      providerReference: a.providerReference,
      refId: a.bookingId,
      kind: "booking",
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

export const markSucceeded = internalMutation({
  args: {
    reference: v.string(),
    amountCents: v.number(),
    currency: v.string(),
    txnId: v.string(),
    cryptoNet: v.number(), // USDT received after Plisio's commission
  },
  handler: async (
    ctx,
    { reference, amountCents, currency, txnId, cryptoNet },
  ) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("providerReference", reference))
      .unique();
    if (!payment) return; // unknown reference: acknowledge, don't retry
    if (payment.status !== "initiated") return; // idempotent

    const tolerance = Math.max(1, payment.amountCents * 0.01);
    if (
      currency !== payment.currency ||
      Math.abs(payment.amountCents - amountCents) > tolerance
    ) {
      await ctx.db.patch(payment._id, { status: "failed" });
      return;
    }
    await ctx.db.patch(payment._id, {
      status: "succeeded",
      plisioTxnId: txnId,
    });

    // Her share of the USDT we actually received, rounded down.
    const hostShareUsdt =
      Math.floor(
        cryptoNet * (payment.hostShareCents / payment.amountCents) * 100,
      ) / 100;

    if (payment.kind === "booking") {
      const bookingId = ctx.db.normalizeId("bookings", payment.refId);
      const booking = bookingId ? await ctx.db.get(bookingId) : null;
      if (!booking || booking.status !== "pending_payment") {
        // Paid, but the booking expired meanwhile: no payout, needs a refund by hand.
        await ctx.db.insert("failedPayments", {
          paymentId: reference,
          status: "BOOKING_EXPIRED",
          amount: amountCents / 100,
          reason: `Paid after the booking expired. Refund or re-book. Plisio txn ${txnId}`,
          timestamp: Date.now(),
          resolved: false,
        });
        return;
      }
      // paid + call room + payout + no-show check, shared with wallet payments
      await fulfilPaidBooking(ctx, {
        booking,
        paymentId: payment._id,
        hostShareUsdt,
      });
      return;
    }

    // gallery / secret photo order
    const orderId = ctx.db.normalizeId("secretPhotoOrders", payment.refId);
    if (orderId) await fulfilSecretPhotoOrder(ctx, orderId, payment._id);
    if (hostShareUsdt > 0) {
      await ctx.db.insert("hostPayouts", {
        hostId: payment.hostId,
        paymentId: payment._id,
        amountUsdt: hostShareUsdt,
        releaseAt: Date.now() + GALLERY_HOLD_MS,
        status: "pending",
        createdAt: Date.now(),
      });
    }
  },
});
