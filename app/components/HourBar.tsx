import { GAP_MS, HOUR_MS } from "@/convex/lib/schedule";
import { cn } from "@/lib/utils";

export type BarTone = "free" | "booked" | "mine" | "selected";

export type BarSegment = {
  startsAt: number;
  endsAt: number;
  tone: BarTone;
};

/** Hatching for the 5-minute break around a booking. */
const GAP_HATCH =
  "repeating-linear-gradient(135deg, rgba(161,161,170,0.55) 0 2px, transparent 2px 5px)";

const TONE_CLASS: Record<BarTone, string> = {
  free: "bg-emerald-500",
  booked: "bg-zinc-500",
  mine: "bg-sky-500",
  selected: "bg-pink-500",
};

/** Paint order: free calls first, selected call on top. */
const LAYER: Record<BarTone, number> = {
  free: 0,
  booked: 2,
  mine: 2,
  selected: 3,
};

function span(from: number, to: number, hourStart: number) {
  const a = Math.max(from, hourStart);
  const b = Math.min(to, hourStart + HOUR_MS);
  if (b <= a) return null;
  return {
    left: `${((a - hourStart) / HOUR_MS) * 100}%`,
    width: `${((b - a) / HOUR_MS) * 100}%`,
  };
}

/**
 * A 60-minute bar for one hour (left edge = :00, right edge = :60).
 *   green   = a call you can book starts and ends here
 *   grey    = booked by someone else      blue = your booking
 *   hatched = the 5-minute break kept around every booking
 *   pink    = the call you have selected
 * Pass every segment for the day; each bar clips to its own hour.
 */
export function HourBar({
  hourStart,
  segments,
  closed = false,
  showScale = true,
}: {
  hourStart: number;
  segments: readonly BarSegment[];
  closed?: boolean;
  showScale?: boolean;
}) {
  const layers = [...segments].sort((a, b) => LAYER[a.tone] - LAYER[b.tone]);
  const booked = segments.filter(
    (s) => s.tone === "booked" || s.tone === "mine",
  );

  return (
    <div className="mt-2" aria-hidden>
      <div
        className={cn(
          "relative h-3 overflow-hidden rounded-full",
          closed ? "bg-zinc-800" : "bg-zinc-700/40",
        )}
      >
        {/* free windows */}
        {layers
          .filter((s) => s.tone === "free")
          .map((s, i) => {
            const style = span(s.startsAt, s.endsAt, hourStart);
            return style ? (
              <div
                key={`f${i}`}
                className={cn("absolute inset-y-0", TONE_CLASS.free)}
                style={style}
              />
            ) : null;
          })}

        {/* the 5-minute break on both sides of every booking */}
        {booked.map((s, i) => {
          const before = span(s.startsAt - GAP_MS, s.startsAt, hourStart);
          const after = span(s.endsAt, s.endsAt + GAP_MS, hourStart);
          return (
            <span key={`g${i}`}>
              {before && (
                <div
                  className="absolute inset-y-0"
                  style={{ ...before, backgroundImage: GAP_HATCH }}
                />
              )}
              {after && (
                <div
                  className="absolute inset-y-0"
                  style={{ ...after, backgroundImage: GAP_HATCH }}
                />
              )}
            </span>
          );
        })}

        {/* booked / mine / selected */}
        {layers
          .filter((s) => s.tone !== "free")
          .map((s, i) => {
            const style = span(s.startsAt, s.endsAt, hourStart);
            return style ? (
              <div
                key={`s${i}`}
                className={cn(
                  "absolute inset-y-0",
                  TONE_CLASS[s.tone],
                  s.tone === "selected" && "ring-1 ring-pink-200",
                )}
                style={style}
              />
            ) : null;
          })}
      </div>

      {showScale && (
        <div className="mt-0.5 grid grid-cols-4 font-mono text-[9px] text-zinc-600">
          <span>:00</span>
          <span>:15</span>
          <span>:30</span>
          <span>:45</span>
        </div>
      )}
    </div>
  );
}
