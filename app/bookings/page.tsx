"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { LEGACY_TZ } from "@/convex/lib/schedule";
import { CHARGE_CURRENCY } from "@/convex/lib/currency";
import { useMoney } from "@/hooks/useMoney";
import { cn } from "@/lib/utils";

import { DualTime } from "../components/DualTime";

type Row = {
  _id: string;
  startsAt: number;
  endsAt: number;
  minutes: number;
  status: string;
  otherName: string;
  hostTimezone: string | null;
  guestTimezone: string | null;
  callSessionId: string | null;
  amountCents?: number; // guest side
  hostShareCents?: number; // host side
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  completed: "Completed",
  refunded: "Refunded",
};

// Status pills keep their own colours (yellow / green / grey) because they
// carry meaning. Everything else follows the accent: rose-* is remapped to the
// chosen accent in globals.css, and "accent-card" adds the border + glow
// (glow needs data-glow="on" on <html>).
const STATUS_STYLE: Record<string, string> = {
  pending_payment: "bg-yellow-500/10 text-yellow-300",
  paid: "bg-green-500/10 text-green-300",
  completed: "bg-neutral-500/20 text-neutral-300",
  refunded: "bg-neutral-500/20 text-neutral-300",
};

// Clock lives in state (not read during render) and refreshes every 30s,
// so a booking drops off the list / loses its Join button while the page is open.
function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function BookingRow({
  row,
  side,
  now,
  upcoming,
}: {
  row: Row;
  side: "guest" | "host";
  now: number;
  /** Upcoming bookings get the themed glow; past ones stay quiet. */
  upcoming: boolean;
}) {
  // Amounts are saved in the charge currency; show them in the viewer's own.
  const { show } = useMoney();

  // Bookings made before time zones existed have no snapshot: treat as legacy.
  const hostTz = row.hostTimezone ?? LEGACY_TZ;
  const guestTz = row.guestTimezone ?? hostTz;

  // Only joinable while the booking window hasn't ended.
  const canJoin =
    row.status === "paid" && Boolean(row.callSessionId) && row.endsAt > now;

  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4",
        upcoming
          ? "accent-card bg-zinc-900/60"
          : "border-rose-500/20 bg-white/5 opacity-80",
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold">
          {side === "guest" ? "Call with" : "Booked by"} {row.otherName}
        </p>

        <DualTime
          className="my-1 text-neutral-200"
          ts={row.startsAt}
          endTs={row.endsAt}
          hostTz={hostTz}
          otherTz={guestTz}
          showDate
          hostLabel={side === "guest" ? "Her time" : "Your time"}
          otherLabel={side === "guest" ? "Your time" : "Client's time"}
        />

        <p className="text-sm text-neutral-400">
          {row.minutes} min
          {side === "guest" && row.amountCents !== undefined && (
            <> · {show(row.amountCents, CHARGE_CURRENCY)}</>
          )}
          {side === "host" &&
            row.hostShareCents !== undefined &&
            (row.status === "paid" || row.status === "completed") && (
              <> · you earn {show(row.hostShareCents, CHARGE_CURRENCY)}</>
            )}
        </p>

        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
            STATUS_STYLE[row.status] ?? ""
          }`}
        >
          {STATUS_LABEL[row.status] ?? row.status}
        </span>
      </div>

      <div className="flex gap-2">
        {canJoin && (
          <Link
            href={`/call/${row.callSessionId}`}
            className="accent-card rounded-lg border bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
          >
            Join call
          </Link>
        )}
        <Link
          href={`/bookings/${row._id}`}
          className="rounded-lg border border-rose-500/60 px-4 py-2 text-sm text-white transition-colors hover:bg-rose-600/20"
        >
          Details
        </Link>
      </div>
    </li>
  );
}

function Section({
  title,
  rows,
  side,
  empty,
}: {
  title: string;
  rows: Row[];
  side: "guest" | "host";
  empty: string;
}) {
  const now = useNow();
  const [showPast, setShowPast] = useState(false);

  // Upcoming = not finished yet (soonest first).
  const upcoming = rows
    .filter(
      (r) =>
        r.endsAt > now &&
        (r.status === "paid" || r.status === "pending_payment"),
    )
    .sort((a, b) => a.startsAt - b.startsAt);

  // Past = finished / refunded / expired. Hidden by default (latest first).
  const past = rows
    .filter((r) => !upcoming.includes(r))
    .sort((a, b) => b.startsAt - a.startsAt);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">{title}</h2>

      {upcoming.length === 0 && (
        <p className="text-sm text-neutral-400">
          {rows.length === 0 ? empty : "No upcoming bookings."}
        </p>
      )}

      {upcoming.length > 0 && (
        <ul className="space-y-3">
          {upcoming.map((r) => (
            <BookingRow key={r._id} row={r} side={side} now={now} upcoming />
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
            className="text-sm text-rose-300 underline hover:text-rose-200"
          >
            {showPast
              ? "Hide past bookings"
              : `Show past bookings (${past.length})`}
          </button>

          {showPast && (
            <ul className="space-y-2">
              {past.map((r) => (
                <BookingRow
                  key={r._id}
                  row={r}
                  side={side}
                  now={now}
                  upcoming={false}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default function BookingsPage() {
  const data = useQuery(api.bookings.listMine);

  if (data === undefined) return <p className="p-8">Loading…</p>;
  if (data === null) return <p className="p-8">Please sign in.</p>;

  return (
    <main className="mx-auto max-w-2xl space-y-10 p-6">
      <h1 className="text-3xl font-bold">My bookings</h1>

      {data.isHost && (
        <Section
          title="Bookings with me"
          rows={data.asHost}
          side="host"
          empty="No one has booked you yet."
        />
      )}

      <Section
        title={data.isHost ? "Calls I booked" : "My calls"}
        rows={data.asGuest}
        side="guest"
        empty="You haven't booked a call yet."
      />

      <Link
        href="/hosts"
        className="inline-block text-rose-300 underline hover:text-rose-200"
      >
        Browse hosts
      </Link>
    </main>
  );
}
