// app/components/TokenPackages.tsx
"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Coins, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useAppearance } from "@/app/context/AppearanceContext";
import { accentBackground, alpha } from "@/lib/appearance";
import { TOKEN_PACKAGES, formatRand } from "@/lib/tokenPackages";

export function TokenPackages(): React.JSX.Element {
  const { theme } = useAppearance();
  const hex = theme.hex400;
  const profile = useQuery(api.profiles.getMyProfile);
  const purchases = useQuery(api.tokens.listMyPurchases);
  const initializePayment = useAction(api.tokenPayments.initialize);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(packageId: string): Promise<void> {
    setError(null);
    setBusyId(packageId);
    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { url } = await initializePayment({ packageId, siteUrl });
      // On success the browser leaves for Paystack, so we never reset busyId.
      window.location.assign(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start the payment.",
      );
      setBusyId(null);
    }
  }

  const canBuy = Boolean(profile);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex items-center justify-between rounded-lg border px-4 py-3"
        style={{ borderColor: alpha(hex, 0.25) }}
      >
        <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-stone-300">
          <Coins className="h-4 w-4" style={{ color: hex }} />
          Your balance
        </span>
        <span className="text-lg font-bold text-slate-900 dark:text-stone-50">
          {profile ? profile.coins : "—"} tokens
        </span>
      </div>

      {profile === null && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Finish your profile before buying tokens.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TOKEN_PACKAGES.map((pkg) => {
          const busy = busyId === pkg.id;
          const perToken = (pkg.priceCents / 100 / pkg.tokens).toFixed(2);
          return (
            <div
              key={pkg.id}
              className="relative flex flex-col items-center gap-1 rounded-xl border p-4 text-center"
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
              <span className="text-2xl font-black text-slate-900 dark:text-stone-50">
                {pkg.tokens}
              </span>
              <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-stone-400">
                tokens
              </span>
              <span className="mt-1 text-sm font-semibold text-slate-800 dark:text-stone-100">
                {formatRand(pkg.priceCents)}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-stone-400">
                R{perToken} each
              </span>
              <button
                type="button"
                disabled={!canBuy || busyId !== null}
                onClick={() => void handleBuy(pkg.id)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: accentBackground(theme) }}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  "Buy"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      <p className="text-xs text-slate-500 dark:text-stone-400">
        Secure payment by Paystack. Tokens are added to your balance as soon as
        the payment is confirmed.
      </p>

      {purchases && purchases.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
            Recent purchases
          </p>
          <ul className="flex flex-col divide-y divide-slate-200 dark:divide-white/10">
            {purchases.slice(0, 5).map((p) => (
              <li
                key={p._id}
                className="flex items-center justify-between py-2 text-sm text-slate-700 dark:text-stone-200"
              >
                <span>
                  {p.tokens} tokens · {formatRand(p.priceCents)}
                </span>
                <span
                  className={
                    p.status === "paid"
                      ? "text-xs font-medium text-emerald-500"
                      : "text-xs text-slate-400"
                  }
                >
                  {p.status === "paid"
                    ? new Date(p.paidAt ?? p.createdAt).toLocaleDateString()
                    : "Not completed"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
