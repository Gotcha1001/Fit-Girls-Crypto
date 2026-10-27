"use client";

// app/(host)/girl-help/page.tsx
//
// Sidebar "Help" for girls. Shown to approved hosts AND to applicants who are
// still waiting for approval, so she can get her wallet ready first.
// Needs "/girl-help" added to lib/roles.ts for both (see the notes).
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WalletSetupGuide } from "@/app/components/host/WalletSetupGuide";

export default function GirlHelpPage(): React.JSX.Element {
  // Live threshold, so this page never goes out of date when you change it.
  const cfg = useQuery(api.payoutQueue.minPayout);
  const min = cfg?.minPayoutUsdt;

  return (
    <main className="mx-auto max-w-xl space-y-8 p-6 text-white">
      <header>
        <h1 className="text-2xl font-semibold">Help</h1>
        <p className="mt-2 text-sm text-neutral-400">
          How to set up your wallet so you can get paid, and how to turn your
          earnings into rands.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          1. Set up your wallet and find your wallet number
        </h2>
        <p className="text-sm text-neutral-300">
          We pay you in <b>USDT</b>, a digital dollar, straight to your own
          wallet. You need a wallet address (your &quot;wallet number&quot;) to
          sign up. Here is how to get one:
        </p>
        <WalletSetupGuide />
      </section>

      <section className="accent-card space-y-2 rounded-2xl border bg-zinc-900/60 p-5 text-sm">
        <h2 className="text-lg font-semibold">2. How and when you get paid</h2>
        <p className="text-neutral-300">
          You keep 80% of every booking. Each call&apos;s earnings are held for
          24 hours in case a refund is needed, then they count toward your
          payout.{" "}
          {min !== undefined && (
            <>
              Once you have <b>{min} USDT</b> or more released, it is sent to
              your wallet automatically, usually within 15 minutes.
            </>
          )}
        </p>
        <p className="text-neutral-300">
          Watch your progress on the{" "}
          <Link href="/host/earnings" className="text-rose-300 underline">
            Earnings
          </Link>{" "}
          page. It also has the step-by-step guide for turning USDT into rands
          in your bank account.
        </p>
      </section>

      <section className="space-y-2 text-sm text-neutral-300">
        <h2 className="text-lg font-semibold text-white">Common questions</h2>
        <p>
          <b>I can&apos;t see my USDT.</b> In Trust Wallet, tap the search icon,
          search USDT and switch on the Tron (TRC-20) one.
        </p>
        <p>
          <b>I saved the wrong address.</b> Contact support straight away,
          before your next payout.
        </p>
        <p>
          <b>Someone asked for my 12 words.</b> Never send them. We will never
          ask. Report it to support.
        </p>
      </section>
    </main>
  );
}
