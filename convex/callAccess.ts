import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./lib/auth";
import { EARLY_JOIN_MS, LATE_GRACE_MS, MIN_MS } from "../lib/bookingWindow";

type JoinInfo =
  | {
      ok: true;
      roomName: string;
      role: "guest" | "host" | "participant";
      bookingId: Id<"bookings"> | null;
      validUntil: number | null; // ms timestamp; tokens must not outlive this
    }
  | { ok: false; reason: string; retryable?: boolean };

// The single place that decides "may this person join this call?".
// Call it from the LiveKit token route (with the user's Convex token) BEFORE
// issuing a token, and from VideoCallRoom to decide whether to render.
export const getJoinInfo = query({
  // `tick` is ignored by the server. The client bumps it to force a re-run,
  // because Convex queries don't re-run just because time has passed.
  args: { callSessionId: v.id("callSessions"), tick: v.optional(v.number()) },
  handler: async (ctx, { callSessionId }): Promise<JoinInfo> => {
    const user = await getCurrentUser(ctx);
    if (!user) return { ok: false, reason: "Not signed in" };

    const session = await ctx.db.get(callSessionId);
    if (!session) return { ok: false, reason: "Call not found" };

    const isRequester = session.requesterId === user._id;
    const isRecipient = session.recipientId === user._id;
    if (!isRequester && !isRecipient) {
      return { ok: false, reason: "Not your call" };
    }
    // Only accepted calls can be joined. Give a specific reason for the rest.
    if (session.status !== "accepted") {
      const reason =
        session.status === "ended"
          ? "This call has ended"
          : session.status === "declined"
            ? "This call was declined"
            : "This call hasn't been accepted yet";
      return { ok: false, reason };
    }

    // ── Paid booking calls ──
    if (session.bookingId) {
      const booking = await ctx.db.get(session.bookingId);
      if (!booking) return { ok: false, reason: "Booking not found" };
      if (booking.status !== "paid") {
        return { ok: false, reason: "This booking is not paid" };
      }

      const host = await ctx.db.get(booking.hostId);
      if (!host || host.status !== "approved") {
        return { ok: false, reason: "Host unavailable" };
      }

      const now = Date.now();
      const endsAt =
        booking.endsAt ?? booking.startsAt + booking.minutes * MIN_MS;
      if (now < booking.startsAt - EARLY_JOIN_MS) {
        return {
          ok: false,
          reason: "Too early. The call opens 5 minutes before the start time.",
          retryable: true,
        };
      }
      if (now > endsAt + LATE_GRACE_MS) {
        return { ok: false, reason: "This booking window has passed" };
      }

      return {
        ok: true,
        roomName: session.roomName,
        role: booking.guestId === user._id ? "guest" : "host",
        bookingId: booking._id,
        validUntil: endsAt + LATE_GRACE_MS,
      };
    }

    // ── Dating-style call requests (existing behaviour: participants only) ──
    return {
      ok: true,
      roomName: session.roomName,
      role: "participant",
      bookingId: null,
      validUntil: null,
    };
  },
});
