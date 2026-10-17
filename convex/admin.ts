import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

// Who am I? Lets /admin decide whether to render. The real protection is
// requireAdmin inside every function below, not this UI check.
export const amIAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    return user?.role === "admin";
  },
});

// Hosts waiting for review. Never returns the Paystack subaccount code.
export const listPendingHosts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const hosts = await ctx.db
      .query("hosts")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return await Promise.all(
      hosts.map(async (h) => {
        const user = await ctx.db.get(h.userId);
        return {
          _id: h._id,
          displayName: h.displayName,
          bio: h.bio,
          email: user?.email ?? "",
          avatarUrl: h.avatarId ? await ctx.storage.getUrl(h.avatarId) : null,
          ratePerMinuteCents: h.ratePerMinuteCents,
          payoutReady: !!h.payoutAccountRef,
          bankLast4: h.bankLast4 ?? null,
          kycStatus: h.kycStatus,
          country: h.country ?? null,
        };
      }),
    );
  },
});

// Active hosts: approved girls who can currently take bookings. This is what
// the admin uses to remove one (Suspend). Never returns the Paystack
// subaccount code.
export const listApprovedHosts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const hosts = await ctx.db
      .query("hosts")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    return await Promise.all(
      hosts.map(async (h) => {
        const user = await ctx.db.get(h.userId);
        return {
          _id: h._id,
          displayName: h.displayName,
          email: user?.email ?? "",
          avatarUrl: h.avatarId ? await ctx.storage.getUrl(h.avatarId) : null,
          ratePerMinuteCents: h.ratePerMinuteCents,
          isOnline: h.isOnline,
          payoutReady: !!h.payoutAccountRef,
          bankLast4: h.bankLast4 ?? null,
          country: h.country ?? null,
        };
      }),
    );
  },
});

// Admin ticks "ID checked" and approves. Refuses unless both are true,
// and unless the host finished bank setup (otherwise she can't be paid).
export const approveHost = mutation({
  args: { hostId: v.id("hosts"), idChecked: v.boolean() },
  handler: async (ctx, { hostId, idChecked }) => {
    await requireAdmin(ctx);

    if (!idChecked) throw new Error("Confirm the ID check first");

    const host = await ctx.db.get(hostId);
    if (!host) throw new Error("Host not found");
    if (!host.payoutAccountRef) {
      throw new Error("Host hasn't finished bank setup yet");
    }

    await ctx.db.patch(hostId, {
      kycStatus: "verified",
      status: "approved",
    });
  },
});

export const suspendHost = mutation({
  args: { hostId: v.id("hosts") },
  handler: async (ctx, { hostId }) => {
    await requireAdmin(ctx);
    const host = await ctx.db.get(hostId);
    if (!host) throw new Error("Host not found");
    await ctx.db.patch(hostId, { status: "suspended", isOnline: false });
  },
});
