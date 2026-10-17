// convex/notifications.ts
import { query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

export interface IncomingCall {
  callSessionId: Id<"callSessions">;
  requesterId: Id<"users">;
  callerName: string;
  scheduledFor?: number;
  createdAt: number;
}

export interface NavCounts {
  unreadMessages: number;
  unseenGifts: number;
  // Every pending call request addressed to me, newest first. The client
  // decides which of these are "ringing right now" (call-now + recent).
  incomingCalls: IncomingCall[];
}

const MAX_INCOMING_CALLS = 20;

// One reactive query that powers all three navbar badges. Returns null (rather
// than throwing) when signed out or before the users row exists, so the navbar
// never crashes during sign-in.
export const getNavCounts = query({
  args: {},
  handler: async (ctx): Promise<NavCounts | null> => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    // ---- Unread messages (sent to me, not yet read) ----
    const asA = await ctx.db
      .query("conversations")
      .withIndex("by_userA", (q) => q.eq("userAId", user._id))
      .collect();
    const asB = await ctx.db
      .query("conversations")
      .withIndex("by_userB", (q) => q.eq("userBId", user._id))
      .collect();

    const unreadPerConversation = await Promise.all(
      [...asA, ...asB].map(async (conversation): Promise<number> => {
        const unread = await ctx.db
          .query("messages")
          .withIndex("by_conversation_unread", (q) =>
            q.eq("conversationId", conversation._id).eq("readAt", undefined),
          )
          .collect();
        return unread.filter(
          (m) => m.senderId !== user._id && !m.deletedFor?.includes(user._id),
        ).length;
      }),
    );
    const unreadMessages = unreadPerConversation.reduce((a, b) => a + b, 0);

    // ---- Unseen gifts ----
    const unseen = await ctx.db
      .query("giftTransactions")
      .withIndex("by_recipient_unseen", (q) =>
        q.eq("toUserId", user._id).eq("seenAt", undefined),
      )
      .collect();

    // ---- Pending incoming call requests ----
    const pending = await ctx.db
      .query("callSessions")
      .withIndex("by_recipient_status", (q) =>
        q.eq("recipientId", user._id).eq("status", "pending"),
      )
      .order("desc")
      .take(MAX_INCOMING_CALLS);

    const incomingCalls: IncomingCall[] = await Promise.all(
      pending.map(async (session): Promise<IncomingCall> => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", session.requesterId))
          .first();
        const requester = profile
          ? null
          : await ctx.db.get(session.requesterId);
        return {
          callSessionId: session._id,
          requesterId: session.requesterId,
          callerName: profile?.displayName ?? requester?.name ?? "Someone",
          scheduledFor: session.scheduledFor,
          createdAt: session.createdAt,
        };
      }),
    );

    return { unreadMessages, unseenGifts: unseen.length, incomingCalls };
  },
});
