// convex/favorites.ts
//
// A client can star as many girls as she likes. The "Favorites" tab on
// /hosts shows the starred girls using the same card as the main list.
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

// Star / unstar in one call. Returns the new state.
export const toggleFavorite = mutation({
  args: { hostId: v.id("hosts") },
  handler: async (ctx, { hostId }): Promise<{ favorite: boolean }> => {
    const user = await requireCurrentUser(ctx);

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_pair", (q) =>
        q.eq("userId", user._id).eq("hostId", hostId),
      )
      .first();

    // Always allow un-starring, even if she has since been suspended.
    if (existing) {
      await ctx.db.delete(existing._id);
      return { favorite: false };
    }

    const host = await ctx.db.get(hostId);
    if (!host || host.status !== "approved") {
      throw new Error("That girl isn't available right now");
    }
    if (host.userId === user._id) {
      throw new Error("You can't favorite yourself");
    }

    await ctx.db.insert("favorites", {
      userId: user._id,
      hostId,
      createdAt: Date.now(),
    });
    return { favorite: true };
  },
});

// Ids of every girl the current user has starred. Used to fill in the stars
// and to build the Favorites tab (the page matches these against the list of
// bookable girls, so someone who is later suspended simply drops out).
export const getMyFavoriteIds = query({
  args: {},
  handler: async (ctx): Promise<Id<"hosts">[]> => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return rows.map((r) => r.hostId);
  },
});
