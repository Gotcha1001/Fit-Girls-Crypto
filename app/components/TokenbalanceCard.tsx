"use client";

import { useQuery } from "convex/react";
import { Coins, Gift, Loader2, ShoppingBag } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useAppearance } from "@/app/context/AppearanceContext";
import { alpha } from "@/lib/appearance";
import { findGiftById } from "@/lib/gifts";

const PANEL = "rounded-xl border bg-white p-6 dark:bg-[#04070a]";

export function TokenBalanceCard(): React.JSX.Element {
  const { theme } = useAppearance();
  const hex = theme.hex400;
  const summary = useQuery(api.tokens.getMySummary);

  const panelStyle = {
    borderColor: alpha(hex, 0.2),
    boxShadow: `0 0 24px -10px ${alpha(hex, 0.35)}`,
  };

  if (summary === undefined) {
    return (
      <section className={PANEL} style={panelStyle}>
        <Loader2 className="animate-spin text-gray-400" />
      </section>
    );
  }
  if (summary === null) return <></>;

  const rose = findGiftById("rose");
  const roses = rose ? Math.floor(summary.balance / rose.coinCost) : 0;

  return (
    <>
      {/* Balance */}
      <section
        className={`${PANEL} flex items-center justify-between gap-4`}
        style={panelStyle}
      >
        <div>
          <p className="text-sm text-slate-500 dark:text-stone-400">
            Tokens left
          </p>
          <p className="text-4xl font-black tabular-nums text-slate-900 dark:text-stone-50">
            {summary.balance}
          </p>
          {rose && (
            <p className="mt-1 text-xs text-slate-500 dark:text-stone-400">
              Enough for {roses} {rose.emoji} {rose.name.toLowerCase()}
              {roses === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
          style={{
            background: alpha(hex, 0.12),
            boxShadow: `0 0 20px -4px ${alpha(hex, 0.5)}`,
          }}
        >
          <Coins className="h-7 w-7" style={{ color: hex }} />
        </span>
      </section>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4">
        <div className={PANEL} style={panelStyle}>
          <p className="text-xs text-slate-500 dark:text-stone-400">
            Total bought
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {summary.totalBought}
          </p>
        </div>
        <div className={PANEL} style={panelStyle}>
          <p className="text-xs text-slate-500 dark:text-stone-400">
            Spent on gifts
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {summary.totalSpent}
          </p>
        </div>
      </div>

      {/* Recent activity */}
      <section className={PANEL} style={panelStyle}>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-stone-50">
          Recent activity
        </h2>
        {summary.activity.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-stone-400">
            Nothing yet. Buy a package below to get started.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-stone-800">
            {summary.activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                {a.kind === "purchase" ? (
                  <ShoppingBag size={16} className="text-green-600" />
                ) : (
                  <Gift size={16} className="text-rose-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate">{a.label}</p>
                  <p className="text-xs text-slate-500 dark:text-stone-400">
                    {new Date(a.at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`font-semibold tabular-nums ${
                    a.tokens > 0 ? "text-green-600" : "text-rose-600"
                  }`}
                >
                  {a.tokens > 0 ? "+" : ""}
                  {a.tokens}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
