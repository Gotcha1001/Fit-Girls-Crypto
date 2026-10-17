// convex/messages.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import type { Doc, Id } from "./_generated/dataModel";

// Deleting is per-user ("delete for me"): the message/conversation is hidden
// from the person who deleted it but the other person keeps their copy.
// The one exception is deleteMessage with forEveryone, which lets a sender
// remove a message they sent from both sides.

function sortedPair(
  a: Id<"users">,
  b: Id<"users">,
): [Id<"users">, Id<"users">] {
  return a < b ? [a, b] : [b, a];
}

async function getMyConversations(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<Doc<"conversations">[]> {
  const asA = await ctx.db
    .query("conversations")
    .withIndex("by_userA", (q) => q.eq("userAId", userId))
    .collect();
  const asB = await ctx.db
    .query("conversations")
    .withIndex("by_userB", (q) => q.eq("userBId", userId))
    .collect();
  return [...asA, ...asB];
}

function isParticipant(
  conversation: Doc<"conversations">,
  userId: Id<"users">,
): boolean {
  return conversation.userAId === userId || conversation.userBId === userId;
}

export const getOrCreateConversation = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args): Promise<Id<"conversations">> => {
    const user = await requireCurrentUser(ctx);
    if (user._id === args.otherUserId) {
      throw new Error("You can't start a conversation with yourself");
    }
    const [userAId, userBId] = sortedPair(user._id, args.otherUserId);
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_pair", (q) =>
        q.eq("userAId", userAId).eq("userBId", userBId),
      )
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("conversations", {
      userAId,
      userBId,
      lastMessageAt: Date.now(),
      lastMessagePreview: undefined,
    });
  },
});

export interface ConversationSummary {
  conversation: Doc<"conversations">;
  otherUserId: Id<"users">;
  // Preview of the latest message THIS user can still see (skips messages
  // they've deleted), so deleted text never leaks into the list.
  preview: string | undefined;
}

export const listConversations = query({
  args: {},
  handler: async (ctx): Promise<ConversationSummary[]> => {
    const user = await requireCurrentUser(ctx);
    const mine = await getMyConversations(ctx, user._id);
    const visible = mine.filter((c) => !c.hiddenFor?.includes(user._id));

    const summaries = await Promise.all(
      visible.map(async (conversation): Promise<ConversationSummary> => {
        const recent = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conversation._id),
          )
          .order("desc")
          .take(30);
        const lastVisible = recent.find(
          (m) => !m.deletedFor?.includes(user._id),
        );
        return {
          conversation,
          otherUserId:
            conversation.userAId === user._id
              ? conversation.userBId
              : conversation.userAId,
          preview: lastVisible?.body.slice(0, 120),
        };
      }),
    );

    summaries.sort(
      (a, b) => b.conversation.lastMessageAt - a.conversation.lastMessageAt,
    );
    return summaries;
  },
});

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args): Promise<Doc<"messages">[]> => {
    const user = await requireCurrentUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!isParticipant(conversation, user._id)) {
      throw new Error("You're not part of this conversation");
    }
    const all = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    return all.filter((m) => !m.deletedFor?.includes(user._id));
  },
});

export const sendMessage = mutation({
  args: { conversationId: v.id("conversations"), body: v.string() },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    const user = await requireCurrentUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!isParticipant(conversation, user._id)) {
      throw new Error("You're not part of this conversation");
    }
    const trimmed = args.body.trim();
    if (!trimmed) throw new Error("Message can't be empty");

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: user._id,
      body: trimmed,
      createdAt: now,
      readAt: undefined,
      deletedFor: undefined,
    });
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview: trimmed.slice(0, 120),
      // A new message brings the conversation back for anyone who had
      // cleared it with "delete all".
      hiddenFor: undefined,
    });
    return messageId;
  },
});

export const markConversationRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireCurrentUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!isParticipant(conversation, user._id)) {
      throw new Error("You're not part of this conversation");
    }
    const unread = await ctx.db
      .query("messages")
      .withIndex("by_conversation_unread", (q) =>
        q.eq("conversationId", args.conversationId).eq("readAt", undefined),
      )
      .collect();
    const now = Date.now();
    await Promise.all(
      unread
        .filter((m) => m.senderId !== user._id)
        .map((m) => ctx.db.patch(m._id, { readAt: now })),
    );
  },
});

// Delete ONE message. Default = delete for me. forEveryone = permanently
// remove a message you sent, from both sides.
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    forEveryone: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireCurrentUser(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) return; // already gone — nothing to do

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation || !isParticipant(conversation, user._id)) {
      throw new Error("You're not part of this conversation");
    }

    if (args.forEveryone) {
      if (message.senderId !== user._id) {
        throw new Error("You can only delete messages you sent for everyone");
      }
      await ctx.db.delete(message._id);
      return;
    }

    if (message.deletedFor?.includes(user._id)) return;
    await ctx.db.patch(message._id, {
      deletedFor: [...(message.deletedFor ?? []), user._id],
    });
  },
});

const DELETE_ALL_BATCH_SIZE = 400;

// Delete ALL of my messages (for me only) and clear my conversation list.
// Convex caps how much one mutation can write, so this works in batches:
// the client calls it repeatedly until hasMore is false.
export const deleteAllMyMessages = mutation({
  args: {},
  handler: async (ctx): Promise<{ hasMore: boolean }> => {
    const user = await requireCurrentUser(ctx);
    const mine = await getMyConversations(ctx, user._id);
    let budget = DELETE_ALL_BATCH_SIZE;

    for (const conversation of mine) {
      if (conversation.hiddenFor?.includes(user._id)) continue;

      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .collect();
      const remaining = messages.filter(
        (m) => !m.deletedFor?.includes(user._id),
      );
      const batch = remaining.slice(0, budget);

      await Promise.all(
        batch.map((m) =>
          ctx.db.patch(m._id, {
            deletedFor: [...(m.deletedFor ?? []), user._id],
          }),
        ),
      );
      budget -= batch.length;

      if (batch.length < remaining.length) return { hasMore: true };

      await ctx.db.patch(conversation._id, {
        hiddenFor: [...(conversation.hiddenFor ?? []), user._id],
      });
      if (budget <= 0) return { hasMore: true };
    }
    return { hasMore: false };
  },
});
