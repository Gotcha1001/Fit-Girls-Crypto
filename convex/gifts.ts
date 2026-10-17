// convex/gifts.ts
// Clients have no profile, so their token balance lives on the users row
// (users.tokens, added to the schema). Names and emails come from Clerk,
// which UserSync already copies into users.name / users.email.
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";
import type { Id } from "./_generated/dataModel";
import { GIFT_CATALOG, findGiftById, type GiftDefinition } from "../lib/gifts";

const MAX_NOTE_LENGTH = 200;

export type GiftRow = {
  _id: Id<"giftTransactions">;
  giftId: string;
  coinCost: number;
  message?: string;
  createdAt: number;
  seenAt?: number;
  otherName: string;
  // Only filled for RECEIVED gifts (the girl sees the sender's email).
  // Never filled for sent gifts, so clients can't read host emails.
  otherEmail?: string;
};

function findGift(giftId: string): GiftDefinition {
  const gift = findGiftById(giftId);
  if (!gift) throw new Error(`Unknown gift: ${giftId}`);
  return gift;
}

export const listGiftCatalog = query({
  args: {},
  handler: async (): Promise<GiftDefinition[]> => GIFT_CATALOG,
});

export const sendGift = mutation({
  args: {
    toUserId: v.id("users"),
    giftId: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"giftTransactions">> => {
    const user = await requireCurrentUser(ctx);

    if (user.role !== "user" || user.onboardingChoice !== "client") {
      throw new Error("Only clients can send gifts");
    }
    if (user._id === args.toUserId) {
      throw new Error("You can't send a gift to yourself");
    }

    // Recipient must be an approved host.
    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", args.toUserId))
      .first();
    if (!host || host.status !== "approved") {
      throw new Error("This host can't receive gifts right now");
    }

    const gift = findGift(args.giftId);

    const note = args.message?.trim();
    if (note && note.length > MAX_NOTE_LENGTH) {
      throw new Error(`Keep your note under ${MAX_NOTE_LENGTH} characters`);
    }

    const balance = user.tokens ?? 0;
    if (balance < gift.coinCost) {
      throw new Error("Not enough tokens for this gift");
    }

    // One transaction: the debit and the gift row both happen or neither does.
    await ctx.db.patch(user._id, { tokens: balance - gift.coinCost });
    return await ctx.db.insert("giftTransactions", {
      fromUserId: user._id,
      toUserId: args.toUserId,
      giftId: gift.id,
      coinCost: gift.coinCost,
      message: note || undefined,
      createdAt: Date.now(),
    });
  },
});

// The girl's page: gifts she received, with the sender's Clerk name + email.
// Takes no userId argument, so nobody can read someone else's gifts.
export const getGiftsReceived = query({
  args: {},
  handler: async (ctx): Promise<GiftRow[]> => {
    const user = await requireCurrentUser(ctx);
    const rows = await ctx.db
      .query("giftTransactions")
      .withIndex("by_recipient", (q) => q.eq("toUserId", user._id))
      .order("desc")
      .collect();
    return await Promise.all(
      rows.map(async (t) => {
        const sender = await ctx.db.get(t.fromUserId);
        return {
          _id: t._id,
          giftId: t.giftId,
          coinCost: t.coinCost,
          message: t.message,
          createdAt: t.createdAt,
          seenAt: t.seenAt,
          otherName: sender?.name?.trim() || sender?.email || "Someone",
          otherEmail: sender?.email,
        };
      }),
    );
  },
});

// The client's page: gifts they sent, with the girl's display name only.
export const getGiftsSent = query({
  args: {},
  handler: async (ctx): Promise<GiftRow[]> => {
    const user = await requireCurrentUser(ctx);
    const rows = await ctx.db
      .query("giftTransactions")
      .withIndex("by_sender", (q) => q.eq("fromUserId", user._id))
      .order("desc")
      .collect();
    return await Promise.all(
      rows.map(async (t) => {
        const host = await ctx.db
          .query("hosts")
          .withIndex("by_user", (q) => q.eq("userId", t.toUserId))
          .first();
        return {
          _id: t._id,
          giftId: t.giftId,
          coinCost: t.coinCost,
          message: t.message,
          createdAt: t.createdAt,
          seenAt: t.seenAt,
          otherName: host?.displayName ?? "Unknown",
        };
      }),
    );
  },
});

// Sidebar badge. Returns 0 when signed out, so it is safe to call anywhere.
export const unseenGiftCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    const unseen = await ctx.db
      .query("giftTransactions")
      .withIndex("by_recipient_unseen", (q) =>
        q.eq("toUserId", user._id).eq("seenAt", undefined),
      )
      .collect();
    return unseen.length;
  },
});

// Called when the girl opens /gifts: clears the badge.
export const markGiftsSeen = mutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    const user = await requireCurrentUser(ctx);
    const unseen = await ctx.db
      .query("giftTransactions")
      .withIndex("by_recipient_unseen", (q) =>
        q.eq("toUserId", user._id).eq("seenAt", undefined),
      )
      .collect();
    const now = Date.now();
    await Promise.all(unseen.map((t) => ctx.db.patch(t._id, { seenAt: now })));
  },
});
