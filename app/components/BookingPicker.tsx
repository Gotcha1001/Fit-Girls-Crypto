"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Props = {
  hostId: Id<"hosts">;
  ratePerMinuteCents: number;
  minMinutes: number;
};

const MAX_MINUTES = 120; // must match the server limit in bookings.ts

// Value for <input type="datetime-local" min=...>, in local time
function localNowForInput(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

export function BookingPicker({
  hostId,
  ratePerMinuteCents,
  minMinutes,
}: Props) {
  const router = useRouter();
  const ageStatus = useQuery(api.ageVerification.myAgeStatus);
  const createBooking = useMutation(api.bookings.createBooking);
  const initCheckout = useAction(api.payments.initCheckout);

  const [when, setWhen] = useState("");
  const [minutes, setMinutes] = useState(minMinutes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = (ratePerMinuteCents * minutes) / 100;
  const durations = [1, 2, 3, 4]
    .map((n) => minMinutes * n)
    .filter((m) => m <= MAX_MINUTES);

  async function onPay() {
    setError(null);

    if (ageStatus === null) return setError("Please sign in to book.");
    if (ageStatus && !ageStatus.ageVerified) {
      // Come back to this host after confirming age
      router.push(`/verify-age?next=${encodeURIComponent(`/hosts/${hostId}`)}`);
      return;
    }

    if (!when) return setError("Pick a date and time");
    const startsAt = new Date(when).getTime();
    if (!Number.isFinite(startsAt) || startsAt < Date.now()) {
      return setError("Pick a time in the future");
    }

    setBusy(true);
    try {
      // The server works out the price. We only send who, when and how long.
      const bookingId = await createBooking({ hostId, startsAt, minutes });
      const url = await initCheckout({ bookingId });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
      <label className="block text-sm">
        Date & time
        <input
          type="datetime-local"
          value={when}
          min={localNowForInput()}
          onChange={(e) => setWhen(e.target.value)}
          className="mt-1 w-full rounded-lg bg-neutral-900 p-2"
        />
      </label>

      <label className="block text-sm">
        Duration
        <select
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="mt-1 w-full rounded-lg bg-neutral-900 p-2"
        >
          {durations.map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </select>
      </label>

      <p className="text-lg font-semibold">Total: R{total.toFixed(2)}</p>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={onPay}
        disabled={busy || ageStatus === undefined}
        className="w-full rounded-xl bg-pink-600 py-3 font-semibold disabled:opacity-50"
      >
        {busy ? "Redirecting to payment…" : "Book & pay"}
      </button>
    </div>
  );
}
