"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Coins, Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { GIFT_CATALOG } from "@/lib/gifts";
import type { GiftRow } from "@/convex/gifts";

// rose-* is remapped to the chosen accent in globals.css, and "accent-card"
// adds the themed border + glow (glow needs data-glow="on" on <html>).

function GiftCard({
  row,
  label,
  isNew,
}: {
  row: GiftRow;
  label: "From" | "To";
  isNew: boolean;
}): React.JSX.Element {
  const definition = GIFT_CATALOG.find((g) => g.id === row.giftId);

  return (
    <div className="accent-card flex items-start gap-3 rounded-xl border p-3 bg-zinc-900/70">
      {/* emoji in a small themed badge */}
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-rose-500/50 bg-rose-600/15 text-3xl">
        {definition?.emoji ?? "🎁"}
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {definition?.name ?? row.giftId}
          {isNew && (
            <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              New
            </span>
          )}
        </p>
        <p className="text-sm text-gray-300">
          {label} {row.otherName}
        </p>
        {row.otherEmail && (
          <p className="truncate text-xs text-gray-400">{row.otherEmail}</p>
        )}
        {row.message && (
          <p className="mt-1 text-sm text-gray-200">
            &ldquo;{row.message}&rdquo;
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          {new Date(row.createdAt).toLocaleString()}
        </p>
      </div>

      <span className="flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-600/15 px-2 py-0.5 text-xs font-semibold text-rose-300">
        <Coins size={14} />
        {row.coinCost}
      </span>
    </div>
  );
}

export default function GiftsPage(): React.JSX.Element {
  const me = useQuery(api.user.getMe);
  const isHost = me?.role === "host";

  // Each account type only asks for its own list.
  const received = useQuery(api.gifts.getGiftsReceived, isHost ? {} : "skip");
  const sent = useQuery(api.gifts.getGiftsSent, me && !isHost ? {} : "skip");
  const summary = useQuery(
    api.tokens.getMySummary,
    me && !isHost ? {} : "skip",
  );
  const markSeen = useMutation(api.gifts.markGiftsSeen);

  // Remember which gifts were unseen on arrival so "New" stays visible even
  // after we mark them seen (which clears the sidebar badge).
  // The snapshot is taken once, during render, the first time the list loads
  // (React's documented "adjust state while rendering" pattern, so no setState
  // inside an effect). The effect below only talks to the server.
  const [newIds, setNewIds] = useState<Set<string> | null>(null);
  if (received && newIds === null) {
    setNewIds(
      new Set(received.filter((r) => r.seenAt === undefined).map((r) => r._id)),
    );
  }
  useEffect(() => {
    if (newIds && newIds.size > 0) void markSeen({});
  }, [newIds, markSeen]);

  const rows = isHost ? received : sent;
  const totalTokens = (rows ?? []).reduce((sum, r) => sum + r.coinCost, 0);

  if (me === undefined) {
    return <Loader2 className="mx-auto mt-16 animate-spin text-rose-400" />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {isHost ? "My Gifts" : "Gifts"}
          </h1>
          <p className="text-sm text-gray-300">
            {isHost
              ? "Gifts clients sent you after your calls."
              : "Gifts you have sent. Open a girl's profile to send another."}
          </p>
        </div>

        {!isHost && summary && (
          <Link
            href="/tokens"
            className="accent-card flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-600 hover:text-white"
          >
            <Coins size={14} />
            {summary.balance}
          </Link>
        )}
      </div>

      {rows !== undefined && rows.length > 0 && (
        <p className="accent-card rounded-xl border px-4 py-2 text-sm text-gray-200 bg-zinc-900/70">
          {rows.length} gift{rows.length === 1 ? "" : "s"} &middot;{" "}
          <span className="font-semibold text-rose-300">
            {totalTokens} tokens
          </span>{" "}
          {isHost ? "received" : "spent"}
        </p>
      )}

      {rows === undefined ? (
        <Loader2 className="animate-spin text-rose-400" />
      ) : rows.length === 0 ? (
        <div className="accent-card space-y-2 rounded-xl border p-4 text-sm text-gray-200 bg-zinc-900/70">
          <p>{isHost ? "No gifts yet." : "You haven't sent any gifts yet."}</p>
          {!isHost && (
            <Link href="/hosts" className="text-rose-300 hover:underline">
              Browse girls
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <GiftCard
              key={row._id}
              row={row}
              label={isHost ? "From" : "To"}
              isNew={isHost && (newIds?.has(row._id) ?? false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
