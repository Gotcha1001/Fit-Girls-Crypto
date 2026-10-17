"use client";

import { useState } from "react";
import { useMutation, useAction, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  MIN_MS,
  dayIndexOf,
  dayShiftLabel,
  durationOptions,
  formatDayLong,
  formatTimeRange,
  tzLabel,
} from "@/convex/lib/schedule";
import { useViewerTz } from "@/hooks/useViewerTz";
import { useMoney } from "@/hooks/useMoney";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { GirlCalendar } from "./GirlCalendar";
import { AgeGateDialog } from "../AgeGateDialog";

export function BookCallPanel({
  hostId,
  hostTz,
  hostCurrency,
  minMinutes,
  ratePerMinuteCents,
}: {
  hostId: Id<"hosts">;
  hostTz: string;
  /** The currency her rate is set in (from her country). */
  hostCurrency: string;
  minMinutes: number;
  ratePerMinuteCents: number;
}) {
  const viewerTz = useViewerTz();
  // Her rate is in her currency; show() writes it in the client's.
  const { show } = useMoney();
  const [minutes, setMinutes] = useState(minMinutes);
  const [startsAt, setStartsAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ageOpen, setAgeOpen] = useState(false);

  const ageStatus = useQuery(api.ageVerification.myAgeStatus);
  const createBooking = useMutation(api.bookings.createBooking);
  const initCheckout = useAction(api.payments.initCheckout);

  const options = durationOptions(minMinutes, 120);

  function chooseMinutes(m: number) {
    setMinutes(m);
    setStartsAt(null); // start times change with the length, so drop the old pick
    setError(null);
  }

  // Creates the booking and sends the client to Paystack.
  async function book() {
    if (startsAt == null) return;
    setBusy(true);
    setError(null);
    try {
      const bookingId = await createBooking({ hostId, startsAt, minutes });
      // Ask Paystack for a payment link, then send the client there
      const url = await initCheckout({ bookingId });
      window.location.href = url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      // Safety net if the age query was still loading when they clicked.
      if (msg.includes("Age verification")) setAgeOpen(true);
      else setError(msg);
      setBusy(false);
    }
  }

  function confirm() {
    if (startsAt == null || busy) return;
    if (!ageStatus?.ageVerified) {
      setAgeOpen(true);
      return;
    }
    book();
  }

  const endsAt = startsAt == null ? 0 : startsAt + minutes * MIN_MS;
  const sameZone = viewerTz === hostTz;
  const shift =
    startsAt == null || sameZone
      ? ""
      : dayShiftLabel(startsAt, hostTz, viewerTz);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm text-zinc-400">Duration</p>
        <div className="flex flex-wrap gap-2">
          {options.map((m) => {
            const isSelected = minutes === m;
            return (
              // Plain <button>, not the shadcn Button: its outline variant sets
              // its own border colour and can fight the themed border.
              <button
                key={m}
                type="button"
                aria-pressed={isSelected}
                onClick={() => chooseMinutes(m)}
                className={cn(
                  "accent-card rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400",
                  isSelected
                    ? "bg-rose-600 text-white hover:bg-rose-500"
                    : "bg-zinc-900/60 text-zinc-100 hover:bg-rose-600/20",
                )}
              >
                {m} min · {show(ratePerMinuteCents * m, hostCurrency)}
              </button>
            );
          })}
        </div>
      </div>

      <GirlCalendar
        hostId={hostId}
        hostTz={hostTz}
        minutes={minutes}
        selected={startsAt}
        onSelectSlot={setStartsAt}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      {startsAt != null && (
        <div className="accent-card space-y-3 rounded-xl border bg-white/5 p-4">
          <div className="space-y-1 text-sm text-zinc-300">
            <p>
              <span className="text-zinc-500">Her time: </span>
              {formatDayLong(dayIndexOf(startsAt, hostTz))} ·{" "}
              {formatTimeRange(startsAt, endsAt, hostTz)}{" "}
              <span className="text-xs text-zinc-500">
                ({tzLabel(hostTz, startsAt)})
              </span>
            </p>
            {!sameZone && (
              <p>
                <span className="text-zinc-500">Your time: </span>
                {formatDayLong(dayIndexOf(startsAt, viewerTz))} ·{" "}
                {formatTimeRange(startsAt, endsAt, viewerTz)}{" "}
                <span className="text-xs text-zinc-500">
                  ({tzLabel(viewerTz, startsAt)})
                </span>
                {shift && (
                  <span className="ml-1 rounded bg-amber-500/20 px-1 text-xs text-amber-300">
                    {shift}
                  </span>
                )}
              </p>
            )}
          </div>
          <Button
            className="w-full bg-rose-600 text-white hover:bg-rose-500"
            onClick={confirm}
            disabled={busy}
          >
            {busy ? "Redirecting to payment…" : "Continue to payment"}
          </Button>
        </div>
      )}

      <AgeGateDialog
        open={ageOpen}
        onOpenChange={setAgeOpen}
        onVerified={() => {
          setAgeOpen(false);
          book(); // go straight on to payment, no second click
        }}
      />
    </div>
  );
}
