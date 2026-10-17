// components/DualTime.tsx
import {
  dayIndexOf,
  dayShiftLabel,
  formatDayLong,
  formatTime,
  formatTimeRange,
  tzCity,
} from "@/convex/lib/schedule";

type Props = {
  ts: number;
  endTs?: number;
  /** Her zone: always the big line. */
  hostTz: string;
  /** The other zone shown small underneath (client's zone, or yours as a client). */
  otherTz: string;
  hostLabel?: string; // "Her time" | "Your time"
  otherLabel?: string; // "Your time" | "Client's time"
  /** Include the date (bookings lists/details). */
  showDate?: boolean;
  className?: string;
};

export function DualTime({
  ts,
  endTs,
  hostTz,
  otherTz,
  hostLabel,
  otherLabel = "Your time",
  showDate = false,
  className,
}: Props) {
  const fmt = (tz: string) => {
    const t = endTs ? formatTimeRange(ts, endTs, tz) : formatTime(ts, tz);
    return showDate ? `${formatDayLong(dayIndexOf(ts, tz))} · ${t}` : t;
  };
  const same = hostTz === otherTz;
  const shift = same ? "" : dayShiftLabel(ts, hostTz, otherTz);

  return (
    <span className={`inline-flex flex-col leading-tight ${className ?? ""}`}>
      <span className="text-base font-semibold">
        {hostLabel && (
          <span className="mr-1.5 text-xs font-normal text-neutral-400">
            {hostLabel}
          </span>
        )}
        {fmt(hostTz)}
      </span>
      {!same && (
        <span className="mt-0.5 text-xs text-neutral-400">
          {otherLabel} {fmt(otherTz)} · {tzCity(otherTz)}
          {shift && (
            <span className="ml-1 rounded bg-amber-500/20 px-1 text-amber-300">
              {shift}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
