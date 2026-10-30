"use client";

import { useMutation, useQuery } from "convex/react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface FavoriteButtonProps {
  hostId: Id<"hosts">;
  className?: string;
}

export function FavoriteButton({
  hostId,
  className = "",
}: FavoriteButtonProps): React.JSX.Element {
  // Convex de-dupes identical queries, so every card on the page shares one
  // subscription to this list.
  const favoriteIds = useQuery(api.favorites.getMyFavoriteIds);

  const toggle = useMutation(api.favorites.toggleFavorite).withOptimisticUpdate(
    (store, args) => {
      const current = store.getQuery(api.favorites.getMyFavoriteIds, {});
      if (current === undefined) return;
      store.setQuery(
        api.favorites.getMyFavoriteIds,
        {},
        current.includes(args.hostId)
          ? current.filter((id) => id !== args.hostId)
          : [...current, args.hostId],
      );
    },
  );

  const isFavorite = favoriteIds?.includes(hostId) ?? false;

  async function handleClick(
    e: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> {
    // The button sits on a card that is a link: don't navigate.
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggle({ hostId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't update favorites",
      );
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className={`z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur transition hover:scale-110 hover:bg-black/60 ${className}`}
    >
      <Star
        size={18}
        className={isFavorite ? "fill-amber-400 text-amber-400" : "text-white"}
      />
    </button>
  );
}
