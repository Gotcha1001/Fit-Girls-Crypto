// app/tokens/[purchaseId]/cancel/page.tsx

"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppearance } from "@/app/context/AppearanceContext";
import { accentBackground } from "@/lib/appearance";
import { CHARGE_CURRENCY } from "@/convex/lib/currency";
import { useMoney } from "@/hooks/useMoney";

interface PageProps {
  params: Promise<{ purchaseId: string }>;
}

export default function TokenPurchaseCancelPage({
  params,
}: PageProps): React.JSX.Element {
  const { purchaseId } = use(params);

  const { theme } = useAppearance();
  // Package prices are saved in rand (the charge currency); show them in
  // the viewer's own currency.

  const { show } = useMoney();

  const purchase = useQuery(api.tokens.getForPayment, {
    purchaseId: purchaseId as Id<"tokenPurchases">,
  });

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

  // PayFast's cancel link can be opened after a payment already went through
  // (e.g. the user pressed back). Never tell someone they weren't charged if
  // the purchase is actually paid.
  if (purchase?.status === "paid") {
    return (
      <div className={shell}>
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-stone-50">
          This payment already went through
        </h1>
        <p className="text-slate-600 dark:text-stone-400">
          {purchase.tokens} tokens ({show(purchase.priceCents, CHARGE_CURRENCY)}
          ) were added to your balance.
        </p>
        <Link
          href="/settings#tokens"
          className={button}
          style={{ background: accentBackground(theme) }}
        >
          Back to settings
        </Link>
      </div>
    );
  }

  return (
    <div className={shell}>
      <XCircle className="h-14 w-14 text-slate-400 dark:text-stone-500" />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-stone-50">
        Payment cancelled
      </h1>
      <p className="text-slate-600 dark:text-stone-400">
        {purchase
          ? `You cancelled the ${purchase.tokens} token package (${show(purchase.priceCents, CHARGE_CURRENCY)}). `
          : ""}
        You haven&apos;t been charged and your balance is unchanged.
      </p>
      <Link
        href="/settings#tokens"
        className={button}
        style={{ background: accentBackground(theme) }}
      >
        Choose a package
      </Link>
    </div>
  );
}
