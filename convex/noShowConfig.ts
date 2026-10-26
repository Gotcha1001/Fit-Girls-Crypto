// convex/noShowConfig.ts  (REPLACE whole file)
import { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

/** How long after the scheduled start we wait before judging attendance. */
export const GRACE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Call this at the moment a booking becomes "paid". It is now called from ONE
 * place only: lib/fulfilBooking.ts (used by Plisio payments AND wallet payments).
 *
 * It does two things:
 *  1. stamps noShowArmedAt, so ONLY bookings paid after this code is deployed
 *     are ever judged. Older paid bookings (calls that already happened before
 *     the LiveKit webhook existed) are never marked as no-shows.
 *  2. schedules ONE check at startsAt + grace.
 */
export async function scheduleNoShowCheck(
  ctx: MutationCtx,
  booking: Pick<Doc<"bookings">, "_id" | "startsAt">,
) {
  await ctx.db.patch(booking._id, { noShowArmedAt: Date.now() });
  const runAt = Math.max(Date.now() + 1000, booking.startsAt + GRACE_MS);
  await ctx.scheduler.runAt(runAt, internal.noShow.evaluate, {
    bookingId: booking._id,
  });
}
