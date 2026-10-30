"use client";

// app/(host)/host/ratings/page.tsx
//
// A girl's own rating status. Lives under /host so lib/roles.ts ("/host")
// already lets hosts in. Clients stay anonymous: only scores and dates show.

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import { Star } from "lucide-react";

function standing(average: number | null): { label: string; tip: string } {
  if (average === null) {
    return {
      label: "New",
      tip: "You have no ratings yet. After a client finishes a call with you they can rate it from 1 to 10.",
    };
  }
  if (average >= 9)
    return { label: "Top rated", tip: "Clients love your calls. Keep it up!" };
  if (average >= 8)
    return { label: "Great", tip: "Clients are very happy with your calls." };
  if (average >= 6)
    return {
      label: "Good",
      tip: "Solid ratings. Being on time and friendly raises them.",
    };
  return {
    label: "Needs attention",
    tip: "Try joining on time and being warm and engaged to bring your rating up.",
  };
}

export default function HostRatingsPage(): React.JSX.Element {
  const summary = useQuery(api.ratings.getMine);

  if (summary === undefined) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }
  if (summary === null) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Ratings appear here once your host profile is set up.
      </p>
    );
  }

  const { label, tip } = standing(summary.average);
  const maxBar = Math.max(1, ...summary.distribution);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">My Ratings</h1>
        <p className="text-sm text-muted-foreground">
          After a call, the client can rate it from 1 to 10. Ratings are
          anonymous and show on your profile card.
        </p>
      </header>

      <section className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Your rating</p>
        {summary.average === null ? (
          <p className="mt-1 text-4xl font-semibold">New</p>
        ) : (
          <p className="mt-1 flex items-center gap-2 text-4xl font-semibold tabular-nums">
            <Star
              className="h-8 w-8 fill-amber-400 text-amber-400"
              aria-hidden
            />
            {summary.average.toFixed(1)}
            <span className="text-lg font-normal text-muted-foreground">
              / 10
            </span>
          </p>
        )}
        <p className="mt-2 text-sm">
          <span className="rounded-full bg-rose-600/15 px-2 py-0.5 text-xs font-medium text-rose-500">
            {label}
          </span>{" "}
          <span className="text-muted-foreground">
            {summary.count} rating{summary.count === 1 ? "" : "s"}
          </span>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">{tip}</p>
      </section>

      {summary.count > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Breakdown</h2>
          <ul className="space-y-1.5">
            {summary.distribution.map((n, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-right tabular-nums">{10 - i}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-amber-400"
                    style={{ width: `${(n / maxBar) * 100}%` }}
                  />
                </div>
                <span className="w-8 tabular-nums text-muted-foreground">
                  {n}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Latest ratings</h2>
        {summary.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any ratings at the moment. They show up here
            after clients finish a call with you.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {summary.recent.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <p className="text-xs text-muted-foreground">
                  {format(new Date(r.createdAt), "d MMM yyyy, HH:mm")}
                </p>
                <p className="flex items-center gap-1 text-sm font-semibold tabular-nums">
                  <Star
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                    aria-hidden
                  />
                  {r.score}/10
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
