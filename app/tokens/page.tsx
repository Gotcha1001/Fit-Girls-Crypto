// app/tokens/page.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction, useQuery } from "convex/react";
import { Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useAppearance } from "@/app/context/AppearanceContext";
import { accentBackground, alpha } from "@/lib/appearance";
import { GIFT_CATALOG, findGiftById } from "@/lib/gifts";
import { TOKEN_PACKAGES } from "@/lib/tokenPackages";
import { CHARGE_CURRENCY } from "@/convex/lib/currency";
import { useMoney } from "@/hooks/useMoney";
import { TokenBalanceCard } from "../components/TokenbalanceCard";

const PANEL = "rounded-xl border bg-white p-6 dark:bg-[#04070a]";

export default function TokensPage(): React.JSX.Element {
  const { theme } = useAppearance();
  // Package prices are saved in rand (the charge currency); show them in
  // the viewer's own currency.

  const { show } = useMoney();

  const hex = theme.hex400;
  // Clients have no profile: the balance lives on the user (users.tokens).

  const purchases = useQuery(api.tokens.listMyPurchases);
  // convex/tokenPayments.ts -> createPurchase (server-side price) -> Paystack
  // transaction/initialize. Returns the hosted Paystack checkout URL.

  const initializePayment = useAction(api.tokenPayments.initialize);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rose = findGiftById("rose");
  const ring = findGiftById("ring");

  async function handleBuy(packageId: string): Promise<void> {
    setError(null);
    setBusyId(packageId);

    try {
      // The action builds callback_url as `${siteUrl}/tokens/<purchaseId>/success`.
      // NEXT_PUBLIC_SITE_URL is the ngrok URL in dev; falls back to the current origin.
      const siteUrl = window.location.origin;
      const { url } = await initializePayment({ packageId, siteUrl });
      // On success the browser leaves for Paystack, so busyId stays set.
      window.location.assign(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start the payment.",
      );
      setBusyId(null);
    }
  }

  const panelStyle = {
    borderColor: alpha(hex, 0.2),
    boxShadow: `0 0 24px -10px ${alpha(hex, 0.35)}`,
  };

  return (
    <div className="relative mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1
          className="accent-gradient-text text-2xl font-black tracking-tight"
          style={{ filter: `drop-shadow(0 0 16px ${alpha(hex, 0.4)})` }}
        >
          Tokens
        </h1>
        <p className="text-sm text-slate-500 dark:text-stone-400">
          Tokens pay for the gifts you send. Buy a package and they&apos;re
          added as soon as Paystack confirms the payment.
        </p>
      </div>

      {/* Balance, totals and recent activity */}
      <TokenBalanceCard />

      {/* Packages */}
      <section className={PANEL} style={panelStyle}>
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-stone-50">
          Choose a package
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {TOKEN_PACKAGES.map((pkg) => {
            const busy = busyId === pkg.id;
            const perToken = show(
              Math.round(pkg.priceCents / pkg.tokens),
              CHARGE_CURRENCY,
            );
            const roses = rose ? Math.floor(pkg.tokens / rose.coinCost) : 0;
            const coversRing = ring ? pkg.tokens >= ring.coinCost : false;

            return (
              <div
                key={pkg.id}
                className="relative flex flex-col items-center gap-1 rounded-xl border p-4 pt-5 text-center"
                style={{
                  borderColor: alpha(hex, pkg.badge ? 0.6 : 0.25),
                  boxShadow: pkg.badge
                    ? `0 0 20px -8px ${alpha(hex, 0.5)}`
                    : undefined,
                }}
              >
                {pkg.badge && (
                  <span
                    className="absolute -top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                    style={{ background: accentBackground(theme) }}
                  >
                    {pkg.badge}
                  </span>
                )}
                <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-stone-50">
                  {pkg.tokens}
                </span>
                <span className="text-xs text-slate-500 dark:text-stone-400">
                  tokens
                </span>
                <span className="mt-1 text-base font-semibold text-slate-800 dark:text-stone-100">
                  {show(pkg.priceCents, CHARGE_CURRENCY)}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-stone-400">
                  {perToken} per token
                </span>
                {rose && (
                  <span className="mt-1 text-[11px] text-slate-500 dark:text-stone-400">
                    {roses} {rose.emoji}
                    {coversRing && ring ? ` or 1 ${ring.emoji}` : ""}
                  </span>
                )}
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void handleBuy(pkg.id)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: accentBackground(theme) }}
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Redirecting…
                    </>
                  ) : (
                    `Buy ${pkg.tokens}`
                  )}
                </button>
              </div>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-500">
            {error}
          </p>
        )}
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-stone-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Secure payment by Paystack. Your card details never touch Spark.
        </p>
      </section>

      {/* What tokens buy */}
      <section className={PANEL} style={panelStyle}>
        <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-stone-50">
          What tokens buy
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-stone-400">
          Each gift costs a fixed number of tokens.
        </p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GIFT_CATALOG.map((gift) => (
            <li
              key={gift.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2"
              style={{ borderColor: alpha(hex, 0.15) }}
            >
              <span className="text-2xl" aria-hidden>
                {gift.emoji}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800 dark:text-stone-100">
                  {gift.name}
                </span>
                <span className="text-xs tabular-nums" style={{ color: hex }}>
                  {gift.coinCost} tokens
                </span>
              </span>
            </li>
          ))}
        </ul>
        <Link
          href="/hosts"
          className="mt-4 inline-block text-sm font-medium underline"
          style={{ color: hex }}
        >
          Browse girls to send a gift
        </Link>
      </section>

      {/* History */}
      <section className={PANEL} style={panelStyle}>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-stone-50">
          Purchase history
        </h2>
        {purchases === undefined ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : purchases.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-stone-400">
            No purchases yet. Pick a package above to get started.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-200 dark:divide-white/10">
            {purchases.map((p) => (
              <li
                key={p._id}
                className="flex items-center justify-between py-2.5 text-sm text-slate-700 dark:text-stone-200"
              >
                <span>
                  {p.tokens} tokens · {show(p.priceCents, CHARGE_CURRENCY)}
                </span>
                <span
                  className={
                    p.status === "paid"
                      ? "text-xs font-medium text-emerald-500"
                      : "text-xs text-slate-400"
                  }
                >
                  {p.status === "paid"
                    ? `Paid ${new Date(p.paidAt ?? p.createdAt).toLocaleDateString()}`
                    : "Not completed"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
