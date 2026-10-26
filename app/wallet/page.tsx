"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";

// Amounts are stored in cents. Set the currency your bookings are charged in.
const money = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(
    cents / 100,
  );

const REASON_LABEL: Record<string, string> = {
  host_no_show: "Credit: host missed the call",
  booking_payment: "Used to pay for a booking",
};

export default function WalletPage() {
  const balance = useQuery(api.wallet.getBalance);
  const transactions = useQuery(api.wallet.getTransactions);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Wallet</h1>
        <p className="text-sm text-muted-foreground">
          If a host misses your call, the full amount is added here as credit.
          Use it to book any other host.
        </p>
      </header>

      <section className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Available credit</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums">
          {balance === undefined ? "…" : money(balance)}
        </p>
        <Link
          href="/hosts"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Book another host
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">History</h2>

        {transactions === undefined && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {transactions?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No credit yet. If a host doesn&apos;t join within 5 minutes of the
            start time, your credit appears here automatically.
          </p>
        )}

        <ul className="divide-y rounded-lg border">
          {transactions?.map((t) => (
            <li
              key={t._id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div>
                <p className="text-sm font-medium">
                  {REASON_LABEL[t.reason] ?? t.reason}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(t.createdAt), "d MMM yyyy, HH:mm")}
                  {t.bookingStartsAt
                    ? ` · call was ${format(
                        new Date(t.bookingStartsAt),
                        "d MMM, HH:mm",
                      )}`
                    : ""}
                </p>
              </div>
              <p
                className={`text-sm font-semibold tabular-nums ${
                  t.type === "credit" ? "text-green-600" : ""
                }`}
              >
                {t.type === "credit" ? "+" : "−"}
                {money(t.amountCents)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
