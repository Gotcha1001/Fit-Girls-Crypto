// app/components/DeleteAllMessagesButton.tsx
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";

export function DeleteAllMessagesButton(): React.JSX.Element | null {
  const conversations = useQuery(api.messages.listConversations);
  const deleteAllMyMessages = useMutation(api.messages.deleteAllMyMessages);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!conversations || conversations.length === 0) return null;

  async function handleDeleteAll(): Promise<void> {
    setIsDeleting(true);
    try {
      // Server deletes in batches; keep going until it says it's finished.
      let hasMore = true;
      while (hasMore) {
        const result = await deleteAllMyMessages({});
        hasMore = result.hasMore;
      }
      toast.success("All your messages were deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't delete your messages",
      );
    } finally {
      setIsDeleting(false);
      setIsConfirming(false);
    }
  }

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-rose-500 hover:text-rose-600 dark:border-gray-700 dark:text-gray-300"
      >
        <Trash2 size={14} />
        Delete all
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">Delete every conversation?</span>
      <button
        type="button"
        onClick={handleDeleteAll}
        disabled={isDeleting}
        className="flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
      >
        {isDeleting && <Loader2 size={14} className="animate-spin" />}
        {isDeleting ? "Deleting..." : "Yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setIsConfirming(false)}
        disabled={isDeleting}
        className="rounded-full border border-gray-300 px-3 py-1.5 dark:border-gray-700"
      >
        Cancel
      </button>
    </div>
  );
}
