"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Star } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface RateCallPanelProps {
  bookingId: Id<"bookings">;
  hostName: string;
}

/** Shown to the client after the call. One rating (1-10) per booking. */
export function RateCallPanel({
  bookingId,
  hostName,
}: RateCallPanelProps): React.JSX.Element | null {
  const state = useQuery(api.ratings.getForBooking, { bookingId });
  const submit = useMutation(api.ratings.submit);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Not the client, or the call didn't happen: show nothing.
  if (!state) return null;

  if (state.score !== null) {
    return (
      <div className="accent-card rounded-xl border bg-zinc-900/60 p-4">
        <p className="text-sm text-neutral-300">
          You rated {hostName}{" "}
          <span className="font-semibold text-amber-300">{state.score}/10</span>
          . Thanks for your feedback.
        </p>
      </div>
    );
  }

  if (!state.canRate) return null;

  async function handleSubmit(): Promise<void> {
    if (selected === null) return;
    setBusy(true);
    try {
      await submit({ bookingId, score: selected });
      toast.success("Thanks for rating your call");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save rating");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="accent-card space-y-3 rounded-xl border bg-zinc-900/60 p-4">
      <div>
        <h2 className="font-semibold">How was your call with {hostName}?</h2>
        <p className="text-sm text-neutral-400">
          Rate her from 1 to 10. You can only rate once and it can&apos;t be
          changed.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Rating out of 10"
        className="grid grid-cols-5 gap-2 sm:grid-cols-10"
      >
        {SCORES.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={selected === n}
            onClick={(): void => setSelected(n)}
            className={`rounded-lg border py-2 text-sm font-semibold transition-colors ${
              selected === n
                ? "border-rose-500 bg-rose-600 text-white"
                : "border-rose-500/40 hover:bg-rose-600/20"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={selected === null || busy}
        onClick={(): void => {
          void handleSubmit();
        }}
        className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
      >
        {busy ? "Saving…" : selected ? `Submit ${selected}/10` : "Pick a score"}
      </button>
    </div>
  );
}

interface RatingBadgeProps {
  rating?: { average: number | null; count: number };
  className?: string;
}

/** "★ 8.6 (12)" or "New" when she has no ratings yet. */
export function RatingBadge({
  rating,
  className = "",
}: RatingBadgeProps): React.JSX.Element | null {
  if (!rating) return null;
  if (rating.average === null) {
    return <span className={`text-xs text-neutral-500 ${className}`}>New</span>;
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm text-amber-300 ${className}`}
      title={`${rating.average} out of 10 from ${rating.count} rating${rating.count === 1 ? "" : "s"}`}
    >
      <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
      {rating.average.toFixed(1)}
      <span className="text-xs text-neutral-500">({rating.count})</span>
    </span>
  );
}
