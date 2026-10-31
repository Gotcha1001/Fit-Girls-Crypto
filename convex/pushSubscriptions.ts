// convex/pushSubscriptions.ts
import {
  mutation,
  query,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";

// Save (or refresh) this device's push subscription for the signed-in user.
// One row per device/browser, keyed by the push endpoint.
export const save = mutation({
  args: {
    endpoint: v.string(),
    subscription: v.string(), // JSON.stringify(PushSubscriptionJSON)
  },
  handler: async (ctx, { endpoint, subscription }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const now = Date.now();
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .first();

    if (existing) {
      // Same device: refresh it (and re-assign if another account used this browser)
      await ctx.db.patch(existing._id, {
        userId: user._id,
        clerkId: identity.subject,
        subscription,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("pushSubscriptions", {
      userId: user._id,
      clerkId: identity.subject,
      endpoint,
      subscription,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Remove this device's subscription (opt-out on this device only).
export const remove = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .first();

    if (existing && existing.clerkId === identity.subject) {
      await ctx.db.delete(existing._id);
      return { success: true };
    }
    return { success: false };
  },
});

// Is THIS device subscribed? Used for the toggle state.
export const hasSubscriptionForEndpoint = query({
  args: { endpoint: v.optional(v.string()) },
  handler: async (ctx, { endpoint }) => {
    if (!endpoint) return false;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .first();
    return !!existing && existing.clerkId === identity.subject;
  },
});

// Internal: every device a user has subscribed (used by the booking notifier)
export const getAllForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Internal: drop a subscription the push service says is gone (410/404)
export const removeExpired = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    const row = await ctx.db.get(subscriptionId);
    if (row) await ctx.db.delete(subscriptionId);
  },
});
