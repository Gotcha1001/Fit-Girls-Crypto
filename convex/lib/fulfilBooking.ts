// convex/lib/fulfilBooking.ts  (NEW FILE)
//
// ONE place that turns a pending_payment booking into a paid, joinable one.
// Used by:
//   - payments.markSucceeded   (Plisio / card-style payment arrived)
//   - wallet.spendOnBooking    (paid with wallet credit)
//
// It: marks the booking paid, creates the call room (callSessions row),
// queues the host's payout, and arms the no-show check.
import { MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { scheduleNoShowCheck } from "../noShowConfig";

const MIN_MS = 60_000;

// Hosts are paid this long AFTER the call ends (moved here from payments.ts).
export const BOOKING_HOLD_MS = 24 * 60 * 60 * 1000;

export async function fulfilPaidBooking(
  ctx: MutationCtx,
  args: {
    booking: Doc<"bookings">;
    paymentId: Id<"payments">;
    /** Host's share in USDT. 0 = no payout row. */
    hostShareUsdt: number;
  },
) {
  const { booking, paymentId, hostShareUsdt } = args;
  const roomName = `call_${booking._id}`;

  // 1. booking -> paid
  await ctx.db.patch(booking._id, {
    status: "paid",
    paymentId,
    roomName,
  });

  // 2. call room (never create two for the same booking)
  const host = await ctx.db.get(booking.hostId);
  if (host) {
    const existingSession = await ctx.db
      .query("callSessions")
      .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
      .first();
    if (!existingSession) {
      await ctx.db.insert("callSessions", {
        requesterId: booking.guestId,
        recipientId: host.userId,
        roomName,
        status: "accepted",
        scheduledFor: booking.startsAt,
        createdAt: Date.now(),
        bookingId: booking._id,
      });
    }
  }

  // 3. host payout (never create two for the same payment)
  if (hostShareUsdt > 0) {
    const existingPayout = await ctx.db
      .query("hostPayouts")
      .withIndex("by_payment", (q) => q.eq("paymentId", paymentId))
      .first();
    if (!existingPayout) {
      const releaseAt =
        (booking.endsAt ?? booking.startsAt + booking.minutes * MIN_MS) +
        BOOKING_HOLD_MS;
      await ctx.db.insert("hostPayouts", {
        hostId: booking.hostId,
        paymentId,
        amountUsdt: hostShareUsdt,
        releaseAt,
        status: "pending",
        createdAt: Date.now(),
      });
    }
  }

  // 4. arm the no-show check
  await scheduleNoShowCheck(ctx, booking);
}
