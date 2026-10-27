// app/directions/page.tsx
//
// Sidebar "Directions" for clients: how to get USDT and pay for a booking.
// Matches the real flow in the code:
//   - calls are paid through a Plisio invoice in USDT on Tron (TRC-20)
//     (convex/payments.ts -> initCheckout, convex/lib/plisio.ts, expire_min 30)
//   - wallet credit (from missed calls) can pay for a booking instead
//   - gifts use tokens, bought by card on /tokens
//
// Needs "/directions" in the client list in lib/roles.ts and a CLIENT_NAV
// entry in components/Appsidebar.tsx.
//
// Plain server-safe component: no hooks, no state.
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Info, ShieldCheck } from "lucide-react";

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
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

export default function DirectionsPage(): React.JSX.Element {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Directions</h1>
        <p className="text-sm text-muted-foreground">
          How to pay for a video call, and how to get USDT if you have never
          used it before. USDT is a digital dollar, so its value stays steady.
        </p>
      </header>

      {/* 1. How paying works */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          1. How paying for a call works
        </h2>
        <ol className="space-y-4 text-sm">
          <Step n={1} title="Pick a girl and a time">
            Open her profile, choose a free time slot and tap{" "}
            <b>Continue to payment</b>.
          </Step>
          <Step n={2} title="Open the payment page">
            You are taken to a secure payment page. It shows the{" "}
            <b>exact amount of USDT</b>, a wallet address and a QR code. The
            network is <b>Tron (TRC-20)</b>.
          </Step>
          <Step n={3} title="Send the payment within 30 minutes">
            Send exactly that amount of USDT on the Tron network to the address
            shown. The payment page expires after <b>30 minutes</b>, so have
            your USDT ready before you start (see part 3 if you do not have any
            yet).
          </Step>
          <Step n={4} title="Wait for confirmation">
            Once the network confirms your payment, your booking is confirmed.
            This usually takes a few minutes. You can follow it under{" "}
            <Link href="/bookings" className="text-rose-300 underline">
              My Bookings
            </Link>
            .
          </Step>
          <Step n={5} title="Join your call">
            At the start time, open My Bookings and join the call.
          </Step>
        </ol>
      </section>

      {/* 2. Wallet credit */}
      <section className="accent-card space-y-2 rounded-2xl border bg-white/5 p-5 text-sm">
        <h2 className="text-lg font-semibold">2. Pay with wallet credit</h2>
        <p className="text-muted-foreground">
          If a girl misses your call, the full amount is added to your{" "}
          <Link href="/wallet" className="text-rose-300 underline">
            Wallet
          </Link>{" "}
          as credit. When you book, you will see a <b>Pay with wallet credit</b>{" "}
          button. If your credit does not cover the full price, you pay the full
          price in USDT instead. Credit can only be used for bookings and cannot
          be withdrawn.
        </p>
      </section>

      {/* 3. Getting USDT */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          3. Don&apos;t have USDT yet? How to buy it
        </h2>
        <p className="text-sm text-muted-foreground">
          The easiest way is a South African crypto exchange such as <b>VALR</b>{" "}
          or <b>Luno</b>. Do steps 1 and 2 ahead of time, because account
          verification can take a while.
        </p>
        <ol className="space-y-4 text-sm">
          <Step n={1} title="Create an account and verify your ID">
            Exchanges ask for ID (this is called KYC). It is normal and required
            by law.
          </Step>
          <Step n={2} title="Deposit rands">
            Add money to the exchange by EFT, or another method it offers.
          </Step>
          <Step n={3} title="Buy USDT">
            Buy USDT with your rands. Buy a little more than the booking costs,
            because the exchange takes a withdrawal fee out of what you send.
          </Step>
          <Step n={4} title="Open the payment page for your booking">
            Only do this once your USDT is ready. Remember it expires after 30
            minutes. Copy the address and note the exact USDT amount.
          </Step>
          <Step n={5} title="Withdraw USDT to that address">
            In the exchange choose <b>Withdraw</b>, then <b>USDT</b>. Pick the{" "}
            <b>TRON (TRC-20)</b> network, paste the address from the payment
            page and enter the amount. Check the exchange&apos;s fee: the amount
            that <i>arrives</i> must be at least the amount on the payment page.
          </Step>
          <Step n={6} title="Wait for your booking to confirm">
            When the network confirms your payment, your booking is confirmed.
          </Step>
        </ol>
        <div className="flex gap-3 rounded-xl border p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <p className="text-muted-foreground">
            <b className="text-foreground">Using your own wallet instead</b>{" "}
            (for example Trust Wallet)? Sending USDT on Tron costs a small
            network fee paid in <b>TRX</b>, so your wallet needs some TRX as
            well as the USDT. The wallet shows the exact fee before you confirm.
            Sending from an exchange does not need this, because the exchange
            takes its fee from the withdrawal.
          </p>
        </div>
      </section>

      {/* 4. Safety */}
      <section className="space-y-3 text-sm">
        <h2 className="text-lg font-semibold">4. Stay safe</h2>
        <div className="flex gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <div className="space-y-1.5">
            <p>
              <b>Always choose the Tron (TRC-20) network.</b> Money sent on a
              different network, such as Ethereum, can be lost for good.
            </p>
            <p>
              Copy the address from the payment page each time. Do not reuse an
              address from an earlier payment, and never send to an address
              someone gave you in a message.
            </p>
            <p>
              <b>Never share your wallet&apos;s 12 secret words with anyone.</b>{" "}
              We will never ask for them.
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-xl border p-4">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <p className="text-muted-foreground">
            An exchange links your account to your real identity. A private
            wallet such as Trust Wallet does not ask for your name, but you
            still need an exchange to turn rands into USDT.
          </p>
        </div>
      </section>

      {/* 5. Problems */}
      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">
          If something goes wrong
        </h2>
        <p>
          <b className="text-foreground">The payment page expired.</b> Go back
          to your booking and start the payment again to get a fresh page.
          Don&apos;t send money to an expired one.
        </p>
        <p>
          <b className="text-foreground">I paid but nothing happened.</b> Wait a
          few minutes for the network to confirm. If your booking is still
          unconfirmed, contact support and include the transaction ID (TXID)
          from your exchange or wallet.
        </p>
        <p>
          <b className="text-foreground">
            I sent late, sent the wrong amount, or used the wrong network.
          </b>{" "}
          Contact support straight away with your TXID. A payment that arrives
          after the booking expired is flagged for a refund or re-booking.
        </p>
        <p>
          <b className="text-foreground">What are tokens for?</b> Tokens are
          used for gifts. You can buy them by card on the{" "}
          <Link href="/tokens" className="text-rose-300 underline">
            Tokens
          </Link>{" "}
          page. Calls are paid in USDT as described above.
        </p>
      </section>

      <Link
        href="/hosts"
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Browse girls
      </Link>
    </div>
  );
}
