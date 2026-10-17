import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";
import type { Doc, Id } from "./_generated/dataModel";

// "Book" a call: either right now (scheduledFor omitted) or at a future time
// the requester picked on the booking page.
// NOTE: hosts are paid. Calls with a host go through createBooking + Paystack,
// never through this free request flow.
export const requestCall = mutation({
  args: {
    recipientId: v.id("users"),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"callSessions">> => {
    const user = await requireCurrentUser(ctx);
    if (user._id === args.recipientId) {
      throw new Error("You can't book a call with yourself");
    }

    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) throw new Error("User not found");

    const recipientHost = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", args.recipientId))
      .unique();
    if (recipientHost) {
      throw new Error("Hosts are booked and paid for from their profile page");
    }

    const roomName = `call-${user._id}-${args.recipientId}-${Date.now()}`;

    return await ctx.db.insert("callSessions", {
      requesterId: user._id,
      recipientId: args.recipientId,
      roomName,
      status: "pending",
      scheduledFor: args.scheduledFor,
      createdAt: Date.now(),
    });
  },
});

export const respondToCall = mutation({
  args: {
    callSessionId: v.id("callSessions"),
    accept: v.boolean(),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireCurrentUser(ctx);
    const session = await ctx.db.get(args.callSessionId);
    if (!session) throw new Error("Call session not found");
    if (session.recipientId !== user._id) {
      throw new Error("Only the recipient can respond to this call request");
    }
    // Paid booking sessions are created already-accepted and can't be declined here
    if (session.bookingId) {
      throw new Error("Paid bookings can't be accepted or declined here");
    }
    if (session.status !== "pending") {
      throw new Error("This request has already been answered");
    }

    await ctx.db.patch(args.callSessionId, {
      status: args.accept ? "accepted" : "declined",
    });
  },
});

export const endCall = mutation({
  args: { callSessionId: v.id("callSessions") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireCurrentUser(ctx);
    const session = await ctx.db.get(args.callSessionId);
    if (!session) throw new Error("Call session not found");
    if (session.requesterId !== user._id && session.recipientId !== user._id) {
      throw new Error("You're not part of this call");
    }
    // Paid booking calls stay joinable until the booking window closes, so a
    // hang-up or dropped connection must not end them. Silently do nothing.
    if (session.bookingId) return;

    await ctx.db.patch(args.callSessionId, { status: "ended" });
  },
});

// Returns null (not an error) for missing sessions and non-participants, so the
// call page shows "Call not found" instead of crashing.
export const getCallSession = query({
  args: { callSessionId: v.id("callSessions") },
  handler: async (ctx, args): Promise<Doc<"callSessions"> | null> => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const session = await ctx.db.get(args.callSessionId);
    if (!session) return null;
    if (session.requesterId !== user._id && session.recipientId !== user._id) {
      return null;
    }
    return session;
  },
});

// Pending/upcoming calls in either direction, newest first — used for a
// "call requests" / booking inbox on the dashboard.
export const listMyCallSessions = query({
  args: {},
  handler: async (ctx): Promise<Doc<"callSessions">[]> => {
    const user = await requireCurrentUser(ctx);

    const asRequester = await ctx.db
      .query("callSessions")
      .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
      .collect();
    const asRecipient = await ctx.db
      .query("callSessions")
      .withIndex("by_recipient", (q) => q.eq("recipientId", user._id))
      .collect();

    const combined = [...asRequester, ...asRecipient];
    combined.sort((a, b) => b.createdAt - a.createdAt);
    return combined;
  },
});
