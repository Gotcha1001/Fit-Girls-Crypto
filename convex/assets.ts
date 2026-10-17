import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";

// Only callable from other Convex functions (actions), never from the
// client — that's what makes this a trustworthy ownership check.

export const recordAsset = internalMutation({
  args: { publicId: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireCurrentUser(ctx);
    await ctx.db.insert("uploadedAssets", {
      userId: user._id,
      publicId: args.publicId,
      createdAt: Date.now(),
    });
  },
});

export const assertOwnsAsset = internalQuery({
  args: { publicId: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const user = await requireCurrentUser(ctx);
    const asset = await ctx.db
      .query("uploadedAssets")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .first();
    return asset !== null && asset.userId === user._id;
  },
});

export const removeAssetRecord = internalMutation({
  args: { publicId: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const asset = await ctx.db
      .query("uploadedAssets")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .first();
    if (asset) await ctx.db.delete(asset._id);
  },
});
