"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { LEGACY_TZ, MIN_MS } from "@/convex/lib/schedule";
import { DualTime } from "@/app/components/DualTime";

// rose-* is remapped to the chosen accent in globals.css, and "accent-card"
// adds the themed border + glow (glow needs data-glow="on" on <html>).
// Status messages keep their own colours (yellow / green / red / grey) because
// they carry meaning.

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();

  // Live query: the webhook flips the status and this page updates by itself.
  // We never mark anything paid from the Paystack redirect.
  const booking = useQuery(api.bookings.getMine, { bookingId: id });

  if (booking === undefined) return <p className="p-8">Loading…</p>;
  if (booking === null) return <p className="p-8">Booking not found.</p>;

  const hostTz = booking.hostTimezone ?? LEGACY_TZ;
  const guestTz = booking.guestTimezone ?? hostTz;
  const endsAt = booking.endsAt ?? booking.startsAt + booking.minutes * MIN_MS;

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-2xl font-bold">Booking with {booking.hostName}</h1>

      <div className="accent-card space-y-1 rounded-xl border bg-zinc-900/60 p-4">
        <DualTime
          ts={booking.startsAt}
          endTs={endsAt}
          hostTz={hostTz}
          otherTz={guestTz}
          showDate
          hostLabel={booking.isHost ? "Your time" : "Her time"}
          otherLabel={booking.isHost ? "Client's time" : "Your time"}
        />
        <p className="text-sm text-neutral-400">{booking.minutes} minutes</p>
      </div>

      {booking.status === "pending_payment" && (
        <div className="space-y-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-300">
          <p>
            {booking.isHost
              ? "Waiting for the guest to pay."
              : "Confirming your payment… this page updates automatically."}
          </p>
          {!booking.isHost && (
            <p className="text-sm opacity-80">
              If you closed the payment page, this booking is released after 15
              minutes and you can book again.
            </p>
          )}
        </div>
      )}

      {booking.status === "paid" && (
        <div className="space-y-3">
          <p className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-300">
            Payment received. The call opens 5 minutes before the start time.
          </p>
          {booking.callSessionId ? (
            <Link
              href={`/call/${booking.callSessionId}`}
              className="accent-card block rounded-xl border bg-rose-600 py-3 text-center font-semibold text-white transition-colors hover:bg-rose-500"
            >
              Join call
            </Link>
          ) : (
            <p className="text-sm opacity-70">Setting up your call room…</p>
          )}
        </div>
      )}

      {booking.status === "completed" && (
        <p className="text-neutral-300">This call is complete.</p>
      )}

      {booking.status === "cancelled" && (
        <p className="text-red-400">This booking was cancelled.</p>
      )}

      {booking.status === "expired" && (
        <div className="space-y-2">
          <p className="text-red-400">
            This booking expired because payment wasn&apos;t received in time.
          </p>
          <Link
            href="/hosts"
            className="text-rose-300 underline hover:text-rose-200"
          >
            Back to hosts
          </Link>
        </div>
      )}

      {booking.status === "refunded" && (
        <p className="text-neutral-300">This booking was refunded.</p>
      )}

      <Link
        href="/bookings"
        className="inline-block text-sm text-rose-300 underline hover:text-rose-200"
      >
        ← All bookings
      </Link>
    </main>
  );
}
