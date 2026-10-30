// convex/ratings.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";

export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

/**
 * A client may rate a call once, and only if the call really happened:
 * they are the booking's guest, it was paid, it has started, and BOTH people
 * joined the room (recorded by the LiveKit webhook). No-shows can't be rated.
 */
export const getForBooking = query({
  args: { bookingId: v.string() },
  handler: async (ctx, { bookingId: rawId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const bookingId = ctx.db.normalizeId("bookings", rawId);
    if (!bookingId) return null;
    const booking = await ctx.db.get(bookingId);
    if (!booking || booking.guestId !== user._id) return null; // clients only

    const existing = await ctx.db
      .query("ratings")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
      .unique();
    if (existing) return { canRate: false as const, score: existing.score };

    const happened =
      (booking.status === "paid" || booking.status === "completed") &&
      booking.startsAt <= Date.now() &&
      !!booking.hostJoinedAt &&
      !!booking.guestJoinedAt;

    return { canRate: happened, score: null };
  },
});

export const submit = mutation({
  args: { bookingId: v.id("bookings"), score: v.number() },
  handler: async (ctx, { bookingId, score }) => {
    const user = await requireCurrentUser(ctx);

    if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
      throw new Error(
        `Rating must be a whole number from ${MIN_SCORE} to ${MAX_SCORE}`,
      );
    }

    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.guestId !== user._id) {
      throw new Error("Only the client who booked this call can rate it");
    }
    if (booking.status !== "paid" && booking.status !== "completed") {
      throw new Error("Only completed calls can be rated");
    }
    if (booking.startsAt > Date.now()) {
      throw new Error("You can rate once the call has taken place");
    }
    if (!booking.hostJoinedAt || !booking.guestJoinedAt) {
      throw new Error("This call didn't take place, so it can't be rated");
    }

    // One rating per booking
    const existing = await ctx.db
      .query("ratings")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
      .unique();
    if (existing) throw new Error("You've already rated this call");

    const host = await ctx.db.get(booking.hostId);
    if (!host) throw new Error("Host not found");

    await ctx.db.insert("ratings", {
      bookingId,
      hostId: booking.hostId,
      guestId: user._id,
      score,
      createdAt: Date.now(),
    });

    // Keep the running totals on the host so lists don't have to scan ratings
    await ctx.db.patch(host._id, {
      ratingSum: (host.ratingSum ?? 0) + score,
      ratingCount: (host.ratingCount ?? 0) + 1,
    });
  },
});

export type MyRatingSummary = {
  average: number | null; // null until she has her first rating
  count: number;
  distribution: number[]; // index 0 = how many 10s, ... index 9 = how many 1s
  recent: { id: string; score: number; createdAt: number }[];
};

/**
 * The signed-in girl's own rating status. Clients stay anonymous: only the
 * score and date are returned, never who gave it.
 */
export const getMine = query({
  args: {},
  handler: async (ctx): Promise<MyRatingSummary | null> => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!host) return null;

    const rows = await ctx.db
      .query("ratings")
      .withIndex("by_host", (q) => q.eq("hostId", host._id))
      .order("desc")
      .take(500);

    // Totals kept on the host row are the source of truth for the average
    // (same numbers clients see on her card).
    const count = host.ratingCount ?? 0;
    const average =
      count === 0
        ? null
        : Math.round(((host.ratingSum ?? 0) / count) * 10) / 10;

    const distribution = Array<number>(10).fill(0);
    for (const r of rows) {
      const i = MAX_SCORE - r.score; // 10 -> 0, 1 -> 9
      if (i >= 0 && i < 10) distribution[i] += 1;
    }

    return {
      average,
      count,
      distribution,
      recent: rows
        .slice(0, 20)
        .map((r) => ({ id: r._id, score: r.score, createdAt: r.createdAt })),
    };
  },
});
