// app/tokens/[purchaseId]/success/page.tsx

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppearance } from "@/app/context/AppearanceContext";
import { accentBackground } from "@/lib/appearance";
import { CHARGE_CURRENCY } from "@/convex/lib/currency";
import { useMoney } from "@/hooks/useMoney";

interface PageProps {
  params: Promise<{ purchaseId: string }>;
}

export default function TokenPurchaseSuccessPage({
  params,
}: PageProps): React.JSX.Element {
  const { purchaseId } = use(params);

  const { theme } = useAppearance();
  // Package prices are saved in rand (the charge currency); show them in
  // the viewer's own currency.

  const { show } = useMoney();
  // Live query: flips to "paid" the moment the Paystack webhook lands.
  // (Paystack also adds ?reference=... to this URL; we don't need it.)

  const purchase = useQuery(api.tokens.getForPayment, {
    purchaseId: purchaseId as Id<"tokenPurchases">,
  });
  // Clients have no profile: the balance lives on the user.

  const summary = useQuery(api.tokens.getMySummary);

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // After ~45s stop the spinner and tell the user what to do.
    const timer = setTimeout(() => setTimedOut(true), 45_000);
    return () => clearTimeout(timer);
  }, []);

  const shell =
    "mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-20 text-center";

  const button =
    "mt-4 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90";

  if (purchase === undefined) {
    return (
      <div className={shell}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-stone-400">Loading…</p>
      </div>
    );
  }

  if (purchase === null) {
    return (
      <div className={shell}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-stone-50">
          Purchase not found
        </h1>
        <p className="text-slate-600 dark:text-stone-400">
          We couldn&apos;t find this purchase. If you just paid, wait a moment
          and refresh.
        </p>
        <Link
          href="/tokens"
          className={button}
          style={{ background: accentBackground(theme) }}
        >
          Back to tokens
        </Link>
      </div>
    );
  }

  if (purchase.status === "paid") {
    return (
      <div className={shell}>
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-stone-50">
          Payment received
        </h1>
        <p className="text-slate-600 dark:text-stone-400">
          {purchase.tokens} tokens ({show(purchase.priceCents, CHARGE_CURRENCY)}
          ) were added to your balance.
          {summary ? ` You now have ${summary.balance} tokens.` : ""}
        </p>
        <Link
          href="/hosts"
          className={button}
          style={{ background: accentBackground(theme) }}
        >
          Send a gift
        </Link>
      </div>
    );
  }

  // Still pending
  if (!timedOut) {
    return (
      <div className={shell}>
        <Loader2 className="h-12 w-12 animate-spin" />
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-stone-50">
          Confirming your payment…
        </h1>
        <p className="text-slate-600 dark:text-stone-400">
          Paystack is notifying us. This usually takes a few seconds, hang
          tight.
        </p>
      </div>
    );
  }

  return (
    <div className={shell}>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-stone-50">
        Still waiting for confirmation
      </h1>
      <p className="text-slate-600 dark:text-stone-400">
        Your payment hasn&apos;t been confirmed yet. If you were charged, your
        tokens will appear automatically once Paystack confirms it, no need to
        pay again.
      </p>
      <Link
        href="/tokens"
        className={button}
        style={{ background: accentBackground(theme) }}
      >
        Back to tokens
      </Link>
    </div>
  );
}
