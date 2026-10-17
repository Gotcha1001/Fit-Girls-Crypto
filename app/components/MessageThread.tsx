// app/components/MessageThread.tsx
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useUserContext } from "@/app/context/UserContext";
import type { Id } from "@/convex/_generated/dataModel";

interface MessageThreadProps {
  conversationId: Id<"conversations">;
}

export function MessageThread({
  conversationId,
}: MessageThreadProps): React.JSX.Element {
  const currentUser = useUserContext();
  const messages = useQuery(api.messages.getMessages, { conversationId });
  const sendMessage = useMutation(api.messages.sendMessage);
  const markConversationRead = useMutation(api.messages.markConversationRead);
  const deleteMessage = useMutation(api.messages.deleteMessage);

  const [draft, setDraft] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  // Tapping a bubble opens its action row (works on touch, unlike hover).
  const [selectedId, setSelectedId] = useState<Id<"messages"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"messages"> | null>(null);

  useEffect(() => {
    if (!messages || !currentUser) return;
    const hasUnread = messages.some(
      (m) => m.senderId !== currentUser._id && m.readAt === undefined,
    );
    if (hasUnread) void markConversationRead({ conversationId });
  }, [messages, currentUser, conversationId, markConversationRead]);

  async function handleSend(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    setIsSending(true);
    setDraft("");
    try {
      await sendMessage({ conversationId, body: trimmed });
    } finally {
      setIsSending(false);
    }
  }

  async function handleDelete(
    messageId: Id<"messages">,
    forEveryone: boolean,
  ): Promise<void> {
    setDeletingId(messageId);
    try {
      await deleteMessage({ messageId, forEveryone });
      setSelectedId(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't delete that message",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages === undefined && (
          <div className="flex justify-center py-8 text-gray-400">
            <Loader2 className="animate-spin" />
          </div>
        )}
        {messages?.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">
            No messages yet — say hi!
          </p>
        )}
        {messages?.map((message) => {
          const isMine = message.senderId === currentUser?._id;
          const isSelected = selectedId === message._id;
          const isDeleting = deletingId === message._id;
          return (
            <div
              key={message._id}
              className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(isSelected ? null : message._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(isSelected ? null : message._id);
                  }
                }}
                className={`max-w-[75%] cursor-pointer rounded-2xl px-4 py-2 text-sm ${
                  isMine
                    ? "bg-rose-600 text-white"
                    : "bg-gray-100 text-black dark:bg-gray-800 dark:text-white"
                } ${isSelected ? "ring-2 ring-rose-400" : ""}`}
              >
                {message.body}
              </div>
              {isSelected && (
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(message._id, false)}
                    className="flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {isDeleting ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    Delete for me
                  </button>
                  {isMine && (
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(message._id, true)}
                      className="flex items-center gap-1 rounded-full border border-rose-500 px-3 py-1 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 size={12} />
                      Delete for everyone
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-gray-200 p-3 dark:border-gray-800"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="rounded-full bg-rose-600 p-2 text-white hover:bg-rose-500 disabled:opacity-50"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
