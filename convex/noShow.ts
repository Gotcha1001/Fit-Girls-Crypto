// convex/noShow.ts  (REPLACE whole file)
import { mutation, internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { GRACE_MS } from "./noShowConfig";
import { creditWallet } from "./wallet";
import { CHARGE_CURRENCY } from "./lib/currency";

/**
 * Attendance outcome lives in optional fields on bookings:
 *   noShowArmedAt, hostJoinedAt, guestJoinedAt, noShowCheckedAt, attendance
 *
 *   host_no_show  -> status "cancelled", guest credited in wallet, payout cancelled
 *   guest_no_show -> status stays "paid", host still paid
 *
 * Only bookings with noShowArmedAt (paid AFTER this feature shipped) are judged.
 */

function assertSecret(secret: string) {
  const expected = process.env.WEBHOOK_SHARED_SECRET;
  if (!expected || secret !== expected) throw new Error("Unauthorized");
}

/** Find the paid booking behind a LiveKit room name. */
async function findBookingByRoom(
  ctx: MutationCtx,
  roomName: string,
): Promise<Doc<"bookings"> | null> {
  const session = await ctx.db
    .query("callSessions")
    .withIndex("by_roomName", (q) => q.eq("roomName", roomName))
    .first();
  if (session?.bookingId) return await ctx.db.get(session.bookingId);
  return await ctx.db
    .query("bookings")
    .withIndex("by_roomName", (q) => q.eq("roomName", roomName))
    .first();
}

/** Which side of the booking is this LiveKit identity? (Clerk id or users._id) */
async function roleOf(
  ctx: MutationCtx,
  booking: Doc<"bookings">,
  identity: string,
): Promise<"host" | "guest" | null> {
  const host = await ctx.db.get(booking.hostId);
  const hostUser = host ? await ctx.db.get(host.userId) : null;
  const guestUser = await ctx.db.get(booking.guestId);
  const is = (u: Doc<"users"> | null) =>
    !!u && (u.clerkId === identity || (u._id as string) === identity);
  if (is(hostUser)) return "host";
  if (is(guestUser)) return "guest";
  return null;
}

/**
 * Called by the Next.js LiveKit webhook route after it verified LiveKit's
 * signature. Public (ConvexHttpClient can't call internal functions), so it is
 * protected by WEBHOOK_SHARED_SECRET.
 */
export const recordJoin = mutation({
  args: {
    secret: v.string(),
    roomName: v.string(),
    identity: v.string(),
    joinedAt: v.number(), // ms
  },
  handler: async (ctx, { secret, roomName, identity, joinedAt }) => {
    assertSecret(secret);
    const booking = await findBookingByRoom(ctx, roomName);
    if (!booking) return { ignored: "not a booking room" }; // e.g. dating calls
    const role = await roleOf(ctx, booking, identity);
    if (!role) return { ignored: "identity not part of booking" };

    if (role === "host") {
      if (!booking.hostJoinedAt) {
        await ctx.db.patch(booking._id, { hostJoinedAt: joinedAt });
      }
      return { recorded: "host" };
    }

    if (!booking.guestJoinedAt) {
      await ctx.db.patch(booking._id, { guestJoinedAt: joinedAt });
    }
    // Guest was late but host is waiting: clear the no-show mark
    if (booking.attendance === "guest_no_show" && booking.hostJoinedAt) {
      await ctx.db.patch(booking._id, { attendance: undefined });
    }
    return { recorded: "guest" };
  },
});

/**
 * Runs once per booking at startsAt + GRACE_MS (scheduled by
 * scheduleNoShowCheck) and is also re-triggered by the cron sweep.
 */
export const evaluate = internalMutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking || booking.status !== "paid") return;
    if (!booking.noShowArmedAt) return; // booking predates this feature
    if (booking.noShowCheckedAt) return;
    if (Date.now() < booking.startsAt + GRACE_MS - 1000) return;

    const now = Date.now();
    const hostIn = !!booking.hostJoinedAt;
    const guestIn = !!booking.guestJoinedAt;

    if (hostIn && guestIn) {
      await ctx.db.patch(bookingId, { noShowCheckedAt: now });
      return;
    }

    if (hostIn && !guestIn) {
      // Client missed it. Host still gets paid: payout untouched.
      await ctx.db.patch(bookingId, {
        attendance: "guest_no_show",
        noShowCheckedAt: now,
      });
      return;
    }

    // Host never joined (client may or may not have): host no-show.
    await ctx.db.patch(bookingId, {
      status: "cancelled",
      attendance: "host_no_show",
      noShowCheckedAt: now,
    });

    const payment = booking.paymentId
      ? await ctx.db.get(booking.paymentId)
      : null;

    // Full amount back to the client as wallet credit (idempotent per booking).
    await creditWallet(ctx, {
      userId: booking.guestId,
      bookingId,
      amountCents: booking.amountCents,
      currency: payment?.currency ?? CHARGE_CURRENCY,
      reason: "host_no_show",
    });

    // Stop the host being paid for a call she missed
    if (booking.paymentId) {
      const paymentId: Id<"payments"> = booking.paymentId;
      const payouts = await ctx.db
        .query("hostPayouts")
        .withIndex("by_payment", (q) => q.eq("paymentId", paymentId))
        .collect();
      for (const p of payouts) {
        if (p.status === "pending") {
          await ctx.db.patch(p._id, {
            status: "cancelled",
            error: "host no-show",
          });
        } else if (p.status !== "cancelled") {
          // Already processing/sent/failed: needs a human decision
          console.error(
            `[no-show] payout ${p._id} is "${p.status}" for host no-show booking ${bookingId}`,
          );
        }
      }
    }
  },
});

/**
 * Safety net, run by crons.ts every 5 minutes. Catches any armed booking whose
 * scheduled check was lost.
 */
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - GRACE_MS;
    const windowStart = now - 24 * 60 * 60 * 1000;
    const stale = await ctx.db
      .query("bookings")
      .withIndex("by_status_startsAt", (q) =>
        q
          .eq("status", "paid")
          .gt("startsAt", windowStart)
          .lt("startsAt", cutoff),
      )
      .filter((q) => q.neq(q.field("noShowArmedAt"), undefined))
      .filter((q) => q.eq(q.field("noShowCheckedAt"), undefined))
      .take(100);
    for (const b of stale) {
      await ctx.scheduler.runAfter(0, internal.noShow.evaluate, {
        bookingId: b._id,
      });
    }
  },
});
