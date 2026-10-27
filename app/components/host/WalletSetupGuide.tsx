// components/host/WalletSetupGuide.tsx
//
// One guide, used in two places:
//   - app/(host)/girl-help/page.tsx           (full version, sidebar "Help")
//   - the wallet section of host onboarding   (<WalletSetupGuide compact />)
//
// Plain server-safe component: no hooks, no state. The compact version is a
// native <details>, so it needs no JavaScript to open and close.
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";

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
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-300">
        {n}
      </span>
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="mt-0.5 text-neutral-300">{children}</p>
      </div>
    </li>
  );
}

function Steps(): React.JSX.Element {
  return (
    <ol className="space-y-4 text-sm">
      <Step n={1} title="Install Trust Wallet">
        Download <b>Trust Wallet</b> from the App Store or Google Play. Only use
        the official app. It is free, and it does not ask for your ID.
      </Step>
      <Step n={2} title="Create a new wallet">
        Open the app and choose <b>Create new wallet</b>. It shows you{" "}
        <b>12 secret words</b> (the recovery phrase).
      </Step>
      <Step n={3} title="Write the 12 words on paper">
        Write them down in order and keep the paper somewhere safe. If you lose
        your phone, these words are the only way to get your money back.
      </Step>
      <Step n={4} title="Turn on USDT (Tron)">
        On the home screen, tap the search icon (or the settings icon next to
        the token list), search for <b>USDT</b> and switch on the one that says{" "}
        <b>Tron / TRC-20</b>.
      </Step>
      <Step n={5} title="Copy your wallet address">
        Tap <b>USDT (Tron)</b>, then <b>Receive</b>. Check that the network says{" "}
        <b>Tron</b>, then tap <b>Copy</b>. This is your wallet number. It starts
        with a <b>T</b> and is 34 characters long.
      </Step>
      <Step n={6} title="Paste it into your profile">
        Paste the address into <b>My Profile</b> twice, once in each box, and
        tap <b>Save wallet</b>. Once saved it can only be changed by support,
        so check it carefully.
      </Step>
    </ol>
  );
}

function Warnings(): React.JSX.Element {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1.5">
          <p>
            <b>Never share your 12 secret words with anyone.</b> That includes
            us. We will never ask for them. Anyone who has them can take all
            your money.
          </p>
          <p>
            The wallet address (the one starting with T) is safe to share. It
            only lets people send money <i>to</i> you.
          </p>
        </div>
      </div>
      <div className="flex gap-3 rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 text-neutral-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
        <p>
          Trust Wallet itself does not link the wallet to your name. If you
          later move money to an exchange like VALR or Luno to get rands, the
          exchange will ask for ID.
        </p>
      </div>
    </div>
  );
}

export function WalletSetupGuide({
  compact = false,
}: {
  compact?: boolean;
}): React.JSX.Element {
  if (compact) {
    return (
      <details className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 text-sm">
        <summary className="cursor-pointer font-medium text-rose-300">
          Don&apos;t have a wallet yet? Set one up in 2 minutes
        </summary>
        <div className="mt-4 space-y-5">
          <Steps />
          <Warnings />
          <p className="text-neutral-400">
            Need help getting your money out as rands later?{" "}
            <Link href="/girl-help" className="text-rose-300 underline">
              See the full Help page
            </Link>
            .
          </p>
        </div>
      </details>
    );
  }
  return (
    <div className="space-y-5">
      <Steps />
      <Warnings />
    </div>
  );
}