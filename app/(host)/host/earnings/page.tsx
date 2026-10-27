"use client";

// app/(host)/host/earnings/page.tsx
//
// Lives under /host so your existing route guard (lib/roles.ts allows "/host")
// already lets hosts in. No roles.ts change needed.

import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Send,
  Wallet,
} from "lucide-react";
import { useNow } from "@/hooks/useNow";

type PayoutStatus = Doc<"hostPayouts">["status"];

// Only used until the live rate has loaded (fxRates row missing or still loading).
const FALLBACK_ZAR_PER_USDT = 17;

const usdt = (n: number): string => `${n.toFixed(2)} USDT`;

const zar = (n: number, rate: number): string =>
  `≈ R${Math.round(n * rate).toLocaleString("en-ZA")}`;

export default function HostEarningsPage(): React.JSX.Element {
  // Hooks first, before any early return.
  // `now` is state (refreshed each minute), so render never calls Date.now().
  const now = useNow(60_000);

  // Passing the minute to the query makes it re-run every minute, so
  // "On hold" turns into "Pending" on screen without a refresh.
  // `now` MUST be declared in myEarnings' args (convex/payoutQueue.ts);
  // with `args: {}` TypeScript reports "number is not assignable to never".
  const d = useQuery(api.payoutQueue.myEarnings, {
    now: Math.floor(now / 60_000) * 60_000,
  });

  const fx = useQuery(api.fx.getRates);

  // fxRates stores units of each currency per 1 USD; USDT is pegged to USD.
  const zarPerUsdt: number = fx?.rates["ZAR"] ?? FALLBACK_ZAR_PER_USDT;

  if (d === undefined) {
    return <Loader2 className="mx-auto mt-16 animate-spin text-rose-400" />;
  }

  if (d === null) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <p className="accent-card rounded-xl border bg-zinc-900/60 p-4 text-sm text-neutral-200">
          Your earnings appear here once your host profile is set up.
        </p>
      </main>
    );
  }

  const {
    minPayoutUsdt: min,
    releasedUsdt,
    heldUsdt,
    sentUsdt,
    problemUsdt,
    lifetimeUsdt,
  } = d;

  const waiting = releasedUsdt + heldUsdt;
  const releasedPct = Math.min(100, (releasedUsdt / min) * 100);
  const heldPct = Math.min(100 - releasedPct, (heldUsdt / min) * 100);
  const reached = releasedUsdt >= min;
  const toGo = Math.max(0, min - waiting);

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      {!d.hasWallet && (
        <div className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Add your USDT (Tron) wallet address so we can pay you.{" "}
            <Link href="/host/onboarding" className="underline">
              Go to My Profile
            </Link>
          </p>
        </div>
      )}

      {/* Balance + progress */}
      <section className="accent-card rounded-2xl border bg-zinc-900/60 p-6">
        <p className="text-sm text-neutral-400">
          Earned and waiting for payout
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-4xl font-bold text-white">{usdt(waiting)}</h1>
          <span className="text-neutral-400">{zar(waiting, zarPerUsdt)}</span>
        </div>

        <div
          className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-zinc-800"
          role="progressbar"
          aria-valuenow={Math.round(releasedPct + heldPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress to payout"
        >
          <div
            className="h-full bg-rose-400 transition-[width] duration-700"
            style={{ width: `${releasedPct}%` }}
          />
          <div
            className="h-full bg-rose-400/35 transition-[width] duration-700"
            style={{ width: `${heldPct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-neutral-500">
          <span>0</span>
          <span>Payout at {min} USDT</span>
        </div>

        <p className="mt-4 text-sm text-neutral-200">
          {reached ? (
            <>
              <strong>You&apos;ve reached the payout amount.</strong> It&apos;s
              sent to your wallet automatically, usually within 15 minutes.
            </>
          ) : toGo > 0 ? (
            <>
              You&apos;re <strong>{usdt(toGo)}</strong> away from your next
              payout. Everything you earn stays safely in your balance until
              then.
            </>
          ) : (
            <>
              You&apos;ve earned enough. Your last call is still in its short
              hold, and the payout goes out right after.
            </>
          )}
        </p>

        {heldUsdt > 0 && d.nextReleaseAt !== null && (
          <p className="mt-2 text-xs text-neutral-400">
            {usdt(heldUsdt)} is held for 24 hours after each call ends, in case
            a call needs a refund. The next part is released{" "}
            {format(d.nextReleaseAt, "d MMM, HH:mm")}.
          </p>
        )}
      </section>

      {/* Totals */}
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Earned in total" value={usdt(lifetimeUsdt)} />
        <Stat label="Paid to your wallet" value={usdt(sentUsdt)} />
        <Stat
          label="Needs attention"
          value={usdt(problemUsdt)}
          muted={problemUsdt === 0}
        />
      </section>

      {problemUsdt > 0 && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          One of your payouts didn&apos;t go through. Your money is safe.
          We&apos;re checking it and will resend it.
        </p>
      )}

      {/* Payout history */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Your earnings</h2>
        {d.recent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-neutral-400">
            Your first paid booking will show up here.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/60">
            {d.recent.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-medium text-white">
                    +{usdt(r.amountUsdt)}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {statusNote(r, now)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={r.status}
                    held={r.status === "pending" && r.releaseAt > now}
                  />
                  {r.txUrl && (
                    <a
                      href={r.txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-rose-300 hover:underline"
                    >
                      View transaction <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* How to withdraw */}
      <section className="accent-card rounded-2xl border bg-zinc-900/60 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Wallet className="h-5 w-5 text-rose-300" /> How to turn your USDT
          into rands
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          Payouts land in your wallet as USDT on the Tron network. To get rands
          in your bank:
        </p>
        <ol className="mt-4 space-y-4 text-sm">
          <Step n={1} title="Check your wallet">
            In Trust Wallet, look for <b>USDT (Tron)</b> on the home screen. If
            you can&apos;t see it, tap the search icon and turn it on. The
            history icon shows each payout.
          </Step>
          <Step n={2} title="Open an exchange account">
            Sign up with a South African exchange like <b>VALR</b> or{" "}
            <b>Luno</b>. They ask for ID verification, so do this before your
            first payout.
          </Step>
          <Step n={3} title="Copy your deposit address">
            In the exchange choose Deposit, then USDT, then the{" "}
            <b>Tron (TRC-20)</b> network, and copy the address.
          </Step>
          <Step n={4} title="Send from Trust Wallet">
            Tap USDT, then Send, paste the address and send. Try a small test
            amount first.
          </Step>
          <Step n={5} title="Sell for rands and withdraw">
            In the exchange, sell your USDT for ZAR and withdraw to your bank by
            EFT.
          </Step>
        </ol>
        <div className="mt-5 flex gap-3 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1.5">
            <p>
              <b>Always pick the Tron (TRC-20) network.</b> Any other network
              can lose your money for good.
            </p>
            <p>
              Sending USDT out of your wallet costs a small fee paid in{" "}
              <b>TRX</b> (roughly R35). Keep a little TRX in your wallet to
              cover it, and cash out less often to pay fewer fees.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

// `now` is passed in so these helpers stay pure (no Date.now() during render).
function statusNote(
  r: { status: PayoutStatus; releaseAt: number; sentAt: number | null },
  now: number,
): string {
  if (r.status === "sent" && r.sentAt !== null)
    return `Paid ${format(r.sentAt, "d MMM yyyy, HH:mm")}`;
  if (r.status === "failed") return "We're fixing this one";
  if (r.status === "processing") return "Being sent to your wallet";
  if (r.releaseAt > now)
    return `Released ${format(r.releaseAt, "d MMM, HH:mm")}`;
  return "Waiting for your payout amount";
}

function StatusBadge({
  status,
  held,
}: {
  status: PayoutStatus;
  held: boolean;
}): React.JSX.Element {
  if (status === "sent")
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400">
        <CheckCircle2 className="h-4 w-4" /> Paid
      </span>
    );
  if (status === "processing")
    return (
      <span className="inline-flex items-center gap-1 text-sky-300">
        <Send className="h-4 w-4" /> Sending
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-amber-400">
        <AlertTriangle className="h-4 w-4" /> Delayed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-neutral-300">
      <Clock className="h-4 w-4" /> {held ? "On hold" : "Pending"}
    </span>
  );
}

function Stat({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div
        className={`mt-1 text-sm font-semibold ${muted ? "text-neutral-500" : "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-medium text-white">
        {n}
      </span>
      <div>
        <div className="font-medium text-white">{title}</div>
        <p className="text-neutral-400">{children}</p>
      </div>
    </li>
  );
}
