// convex/noShowConfig.ts  (REPLACE whole file)
import { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { GRACE_MS } from "./lib/noShowGrace";

// Re-exported so any file that still imports GRACE_MS from here keeps working.
export { GRACE_MS };

/**
 * Call this at the moment a booking becomes "paid". It is called from ONE
 * place only: lib/fulfilBooking.ts (used by Plisio payments AND wallet payments).
 *
 *  1. stamps noShowArmedAt, so ONLY bookings paid after this code is deployed
 *     are ever judged.
 *  2. schedules ONE check at startsAt + grace.
 */
export async function scheduleNoShowCheck(
  ctx: MutationCtx,
  booking: Pick<Doc<"bookings">, "_id" | "startsAt">,
): Promise<void> {
  await ctx.db.patch(booking._id, { noShowArmedAt: Date.now() });
  const runAt = Math.max(Date.now() + 1000, booking.startsAt + GRACE_MS);
  await ctx.scheduler.runAt(runAt, internal.noShow.evaluate, {
    bookingId: booking._id,
  });
}
