import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

// Looks up the signed-in user's row. Move this to convex/lib/auth.ts
// when other files need it too.
async function getUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

// Returns the full-resolution image URL only to the buyer or the host who
// uploaded it. Everyone else gets null and only ever sees the blurred preview.
export const getFullImageUrl = query({
  args: { itemId: v.id("galleryItems") },
  handler: async (ctx, { itemId }) => {
    const user = await getUser(ctx);
    if (!user) return null;

    const item = await ctx.db.get(itemId);
    if (!item || item.moderation !== "approved") return null;

    const host = await ctx.db.get(item.hostId);
    const isOwner = host?.userId === user._id;

    const owns = await ctx.db
      .query("purchases")
      .withIndex("by_item_buyer", (q) =>
        q.eq("galleryItemId", itemId).eq("buyerId", user._id),
      )
      .unique();

    if (!owns && !isOwner) return null;
    return await ctx.storage.getUrl(item.storageId);
  },
});
