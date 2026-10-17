import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";
import type { Doc, Id } from "./_generated/dataModel";

export interface LikeWithProfile {
  likeId: Id<"likes">;
  createdAt: number;
  profile: Doc<"profiles">;
}

// Like / unlike in one call. Returns the new state.
export const toggleLike = mutation({
  args: { toUserId: v.id("users") },
  handler: async (ctx, args): Promise<{ liked: boolean }> => {
    const user = await requireCurrentUser(ctx);
    if (user._id === args.toUserId) {
      throw new Error("You can't like yourself");
    }

    const existing = await ctx.db
      .query("likes")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", user._id).eq("toUserId", args.toUserId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false };
    }

    await ctx.db.insert("likes", {
      fromUserId: user._id,
      toUserId: args.toUserId,
      createdAt: Date.now(),
    });
    return { liked: true };
  },
});

// Ids of everyone the current user has liked — used to fill in the hearts.
export const getMyLikedIds = query({
  args: {},
  handler: async (ctx): Promise<Id<"users">[]> => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_sender", (q) => q.eq("fromUserId", user._id))
      .collect();
    return likes.map((l) => l.toUserId);
  },
});

// Everyone who liked the current user, newest first, with their profile.
export const getLikesReceived = query({
  args: {},
  handler: async (ctx): Promise<LikeWithProfile[]> => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const likes = await ctx.db
      .query("likes")
      .withIndex("by_recipient", (q) => q.eq("toUserId", user._id))
      .order("desc")
      .collect();

    const results: LikeWithProfile[] = [];
    for (const like of likes) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", like.fromUserId))
        .first();
      if (!profile) continue; // liker deleted / never finished their profile
      results.push({
        likeId: like._id,
        createdAt: like.createdAt,
        profile,
      });
    }
    return results;
  },
});

// Lightweight count for the sidebar badge.
export const getLikesCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_recipient", (q) => q.eq("toUserId", user._id))
      .collect();
    return likes.length;
  },
});
