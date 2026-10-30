"use client";

import { useState } from "react";

import { DEFAULT_OPEN_HOURS, formatHour } from "@/convex/lib/schedule";
import { ALL_HOURS } from "@/convex/lib/slots";
import { cn } from "@/lib/utils";

/** Hours from `from` up to (not including) `to`. If `to` <= `from` it wraps past midnight. */
export function hoursInRange(from: number, to: number): number[] {
  if (from === to) return [...ALL_HOURS]; // same start and end = the whole day
  const out: number[] = [];
  for (let h = from; h !== to; h = (h + 1) % 24) out.push(h);
  return out.sort((a, b) => a - b);
}

export const PRESET_24H = [...ALL_HOURS];
export const PRESET_DAY = [...DEFAULT_OPEN_HOURS]; // 09:00–21:00 (the default)
export const PRESET_NIGHT = hoursInRange(21, 9); // 21:00–09:00 (00–08 + 21–23)

const chip =
  "accent-card rounded-lg border bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-rose-600/20";

/**
 * Quick ways to set a day's hours: 24 hours, the usual day, a night shift, a
 * custom From/To (wraps past midnight), or closed. Calls `onApply` with the
 * hours; the page decides what to save (a weekday, every day, one date).
 */
export function HourPresets({
  onApply,
  className,
}: {
  onApply: (hours: number[]) => void;
  className?: string;
}) {
  const [from, setFrom] = useState(22);
  const [to, setTo] = useState(6);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        className={chip}
        onClick={() => onApply(PRESET_24H)}
      >
        24 hours
      </button>
      <button
        type="button"
        className={chip}
        onClick={() => onApply(PRESET_DAY)}
      >
        Day 09:00–21:00
      </button>
      <button
        type="button"
        className={chip}
        onClick={() => onApply(PRESET_NIGHT)}
      >
        Night 21:00–09:00
      </button>
      <button type="button" className={chip} onClick={() => onApply([])}>
        Closed
      </button>

      <span className="ml-1 flex items-center gap-1 text-xs text-zinc-400">
        From
        <select
          value={from}
          onChange={(e) => setFrom(Number(e.target.value))}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-1 font-mono text-xs text-zinc-100"
        >
          {ALL_HOURS.map((h) => (
            <option key={h} value={h}>
              {formatHour(h)}
            </option>
          ))}
        </select>
        to
        <select
          value={to}
          onChange={(e) => setTo(Number(e.target.value))}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-1 font-mono text-xs text-zinc-100"
        >
          {ALL_HOURS.map((h) => (
            <option key={h} value={h}>
              {formatHour(h)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={chip}
          onClick={() => onApply(hoursInRange(from, to))}
        >
          Set
        </button>
      </span>
    </div>
  );
}
