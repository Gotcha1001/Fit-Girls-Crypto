// convex/tokens.ts
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";
import { findGiftById } from "../lib/gifts";
import { findTokenPackage } from "../lib/tokenPackages";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";

// ---------------------------------------------------------------------------
// Checkout (signed-in user, called by the tokenPayments.initialize action)
// ---------------------------------------------------------------------------

export interface CreatedPurchase {
  purchaseId: Id<"tokenPurchases">;
  tokens: number;
  priceCents: number;
  name: string;
  email: string;
}

export const createPurchase = mutation({
  args: { packageId: v.string() },
  handler: async (ctx, { packageId }): Promise<CreatedPurchase> => {
    const user = await requireCurrentUser(ctx);

    // Price comes from the server-side catalog, never from the client.
    const pkg = findTokenPackage(packageId);
    if (!pkg) throw new Error("Unknown token package");

    const purchaseId = await ctx.db.insert("tokenPurchases", {
      userId: user._id,
      packageId: pkg.id,
      tokens: pkg.tokens,
      priceCents: pkg.priceCents,
      status: "pending",
      createdAt: Date.now(),
    });

    return {
      purchaseId,
      tokens: pkg.tokens,
      priceCents: pkg.priceCents,
      name: user.name,
      email: user.email,
    };
  },
});

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------

export interface PurchaseForPayment {
  _id: Id<"tokenPurchases">;
  status: "pending" | "paid";
  tokens: number;
  priceCents: number;
}

// The success page subscribes to this; it flips to "paid" when the webhook lands.
export const getForPayment = query({
  args: { purchaseId: v.id("tokenPurchases") },
  handler: async (ctx, { purchaseId }): Promise<PurchaseForPayment | null> => {
    const purchase = await ctx.db.get(purchaseId);
    if (!purchase) return null;
    return {
      _id: purchase._id,
      status: purchase.status,
      tokens: purchase.tokens,
      priceCents: purchase.priceCents,
    };
  },
});

export const listMyPurchases = query({
  args: {},
  handler: async (ctx): Promise<Doc<"tokenPurchases">[]> => {
    const user = await requireCurrentUser(ctx);
    return await ctx.db
      .query("tokenPurchases")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(10);
  },
});

// Used by the sidebar badge, the success page and the /tokens balance card.
export interface ActivityItem {
  id: string;
  kind: "purchase" | "gift";
  label: string;
  tokens: number; // positive = bought, negative = spent
  at: number;
}

export interface MySummary {
  balance: number;
  totalBought: number;
  totalSpent: number;
  activity: ActivityItem[];
}

export const getMySummary = query({
  args: {},
  handler: async (ctx): Promise<MySummary | null> => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const purchases = await ctx.db
      .query("tokenPurchases")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const paid = purchases.filter((p) => p.status === "paid");

    const gifts = await ctx.db
      .query("giftTransactions")
      .withIndex("by_sender", (q) => q.eq("fromUserId", user._id))
      .collect();

    const totalBought = paid.reduce((sum, p) => sum + p.tokens, 0);
    const totalSpent = gifts.reduce((sum, g) => sum + g.coinCost, 0);

    const activity: ActivityItem[] = [
      ...paid.map(
        (p): ActivityItem => ({
          id: p._id,
          kind: "purchase",
          label: `Bought ${p.tokens} tokens`,
          tokens: p.tokens,
          at: p.paidAt ?? p.createdAt,
        }),
      ),
      ...gifts.map(
        (g): ActivityItem => ({
          id: g._id,
          kind: "gift",
          label: `Sent ${findGiftById(g.giftId)?.name ?? "a gift"}`,
          tokens: -g.coinCost,
          at: g.createdAt,
        }),
      ),
    ]
      .sort((a, b) => b.at - a.at)
      .slice(0, 20);

    return {
      balance: user.tokens ?? 0,
      totalBought,
      totalSpent,
      activity,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal (only the Paystack webhook in http.ts calls these)
// ---------------------------------------------------------------------------

export const getForPaymentInternal = internalQuery({
  args: { purchaseId: v.id("tokenPurchases") },
  handler: async (ctx, { purchaseId }) => {
    const p = await ctx.db.get(purchaseId);
    return (
      p && {
        _id: p._id,
        status: p.status,
        tokens: p.tokens,
        priceCents: p.priceCents,
        userId: p.userId,
      }
    );
  },
});

// Marks the purchase paid AND credits the tokens in one atomic mutation,
// so a duplicate webhook can never credit twice.
export const markPaidFromWebhook = internalMutation({
  args: { purchaseId: v.id("tokenPurchases"), paystackReference: v.string() },
  handler: async (ctx, { purchaseId, paystackReference }) => {
    const purchase = await ctx.db.get(purchaseId);
    if (!purchase) throw new Error("Purchase not found");
    if (purchase.status === "paid") return; // Paystack retries webhooks

    const user = await ctx.db.get(purchase.userId);
    if (!user) {
      await ctx.db.insert("failedPayments", {
        paymentId: paystackReference,
        purchaseId,
        status: "NO_USER",
        amount: purchase.priceCents / 100,
        reason:
          "Payment received but user not found. Credit or refund by hand.",
        timestamp: Date.now(),
        resolved: false,
      });
      return;
    }

    await ctx.db.patch(purchase._id, {
      status: "paid",
      paidAt: Date.now(),
      paystackReference,
    });
    await ctx.db.patch(user._id, {
      tokens: (user.tokens ?? 0) + purchase.tokens,
    });
  },
});

export const logFailedPayment = internalMutation({
  args: {
    paymentId: v.string(),
    purchaseId: v.optional(v.id("tokenPurchases")),
    status: v.string(),
    amount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, entry) => {
    await ctx.db.insert("failedPayments", {
      ...entry,
      timestamp: Date.now(),
      resolved: false,
    });
  },
});
