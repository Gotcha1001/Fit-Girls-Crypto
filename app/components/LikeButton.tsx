"use client";

import { useMutation, useQuery } from "convex/react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface LikeButtonProps {
  toUserId: Id<"users">;
  className?: string;
}

export function LikeButton({
  toUserId,
  className = "",
}: LikeButtonProps): React.JSX.Element {
  // Convex de-dupes identical queries, so every card on the page shares
  // one subscription to this list.
  const likedIds = useQuery(api.likes.getMyLikedIds);

  const toggleLike = useMutation(api.likes.toggleLike).withOptimisticUpdate(
    (store, args) => {
      const current = store.getQuery(api.likes.getMyLikedIds, {});
      if (current === undefined) return;
      const alreadyLiked = current.includes(args.toUserId);
      store.setQuery(
        api.likes.getMyLikedIds,
        {},
        alreadyLiked
          ? current.filter((id) => id !== args.toUserId)
          : [...current, args.toUserId],
      );
    },
  );

  const liked = likedIds?.includes(toUserId) ?? false;

  async function handleClick(
    e: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleLike({ toUserId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update like");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className={`z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur transition hover:scale-110 hover:bg-black/60 ${className}`}
    >
      <Heart
        size={18}
        className={liked ? "fill-rose-500 text-rose-500" : "text-white"}
      />
    </button>
  );
}
