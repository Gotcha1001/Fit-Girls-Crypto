// "use client";

// import { useMemo, useState } from "react";
// import { useQuery } from "convex/react";

// import { api } from "@/convex/_generated/api";
// import type { Id } from "@/convex/_generated/dataModel";
// import {
//   GAP_MINUTES,
//   MAX_DAYS_AHEAD,
//   MIN_MS,
//   dayEndMs,
//   dayShiftLabel,
//   dayStartMs,
//   formatDayLong,
//   formatHour,
//   formatTime,
//   hourOf,
//   isSlotBookable,
//   relativeDayLabel,
//   slotExists,
//   slotStartMs,
// } from "@/convex/lib/schedule";
// import { slotStartsBetween } from "@/convex/lib/slots";
// import { useZonedClock } from "@/hooks/useZonedClock";
// import { useViewerTz } from "@/hooks/useViewerTz";
// import { Button } from "@/components/ui/button";
// import { cn } from "@/lib/utils";

// import { HourBar, type BarSegment } from "../HourBar";

// type Props = {
//   hostId: Id<"hosts">;
//   /** HER time zone. Needed up front so "today" is her today. */
//   hostTz: string;
//   /** Length of the call the client picked. The start times on screen depend on it. */
//   minutes: number;
//   /** Currently chosen start time (ms), or null. */
//   selected: number | null;
//   onSelectSlot: (startsAt: number) => void;
// };

// export function GirlCalendar({
//   hostId,
//   hostTz,
//   minutes,
//   selected,
//   onSelectSlot,
// }: Props) {
//   const { now, dayIndex: today } = useZonedClock(hostTz, 15_000);
//   const viewerTz = useViewerTz();
//   const sameZone = viewerTz === hostTz;
//   const maxDay = today + MAX_DAYS_AHEAD;

//   // null = "follow today", so the view stays right if the page is left open
//   // past HER midnight.
//   const [picked, setPicked] = useState<number | null>(null);
//   const dayIndex =
//     picked === null ? today : Math.min(Math.max(picked, today), maxDay);

//   const day = useQuery(api.calendar.getDay, { hostId, dayIndex, minutes });

//   function jump(delta: number) {
//     setPicked(Math.min(Math.max(dayIndex + delta, today), maxDay));
//   }

//   const view = useMemo(() => {
//     if (!day) return null;
//     const tz = day.timezone;
//     const dayStart = dayStartMs(day.dayIndex, tz);
//     const dayEnd = dayEndMs(day.dayIndex, tz);

//     // Free start times grouped by the (her-zone) hour they begin in. The
//     // 1-hour lead time is applied here, against the live clock.
//     const slotsByHour = new Map<number, number[]>();
//     let total = 0;
//     for (const s of day.slots) {
//       if (!isSlotBookable(s, now)) continue;
//       const h = hourOf(s, tz);
//       const list = slotsByHour.get(h) ?? [];
//       list.push(s);
//       slotsByHour.set(h, list);
//       total += 1;
//     }

//     // Her working hours, minus any hour that doesn't exist today (the
//     // spring-forward gap), plus any hour that holds a booking.
//     const working = new Set<number>(
//       day.hours.filter((h) => slotExists(day.dayIndex, h, tz)),
//     );
//     const shown = new Set<number>(working);
//     const hasBooking = new Set<number>();
//     for (const seg of day.segments) {
//       for (const t of slotStartsBetween(seg.startsAt, seg.endsAt, tz)) {
//         if (t >= dayStart && t < dayEnd) {
//           shown.add(hourOf(t, tz));
//           hasBooking.add(hourOf(t, tz));
//         }
//       }
//     }

//     const booked: BarSegment[] = day.segments.map((s) => ({
//       startsAt: s.startsAt,
//       endsAt: s.endsAt,
//       tone: s.mine ? "mine" : "booked",
//     }));

//     return {
//       tz,
//       slotsByHour,
//       total,
//       working,
//       hasBooking,
//       booked,
//       hours: [...shown].sort((a, b) => a - b),
//     };
//   }, [day, now]);

//   const selectedSegment: BarSegment[] =
//     selected === null
//       ? []
//       : [
//           {
//             startsAt: selected,
//             endsAt: selected + minutes * MIN_MS,
//             tone: "selected",
//           },
//         ];

//   return (
//     <div className="space-y-4">
//       <div className="flex flex-wrap items-center gap-2">
//         <Button
//           size="sm"
//           variant="outline"
//           disabled={dayIndex <= today}
//           onClick={() => jump(-1)}
//         >
//           ←
//         </Button>
//         <Button
//           size="sm"
//           variant={dayIndex === today ? "default" : "outline"}
//           onClick={() => setPicked(null)}
//         >
//           Today
//         </Button>
//         <Button
//           size="sm"
//           variant={dayIndex === today + 1 ? "default" : "outline"}
//           onClick={() => setPicked(today + 1)}
//         >
//           Tomorrow
//         </Button>
//         <Button
//           size="sm"
//           variant="outline"
//           disabled={dayIndex >= maxDay}
//           onClick={() => jump(1)}
//         >
//           →
//         </Button>
//         <Button
//           size="sm"
//           variant="outline"
//           disabled={dayIndex >= maxDay}
//           onClick={() => jump(7)}
//         >
//           +7 days
//         </Button>
//         <span className="ml-auto text-sm text-zinc-300">
//           {relativeDayLabel(dayIndex, today)} · {formatDayLong(dayIndex)}
//         </span>
//       </div>

//       <p className="text-xs text-zinc-500">
//         &ldquo;Today&rdquo; and &ldquo;Tomorrow&rdquo; are her days. Every start
//         time for a {minutes}-minute call. She keeps a {GAP_MINUTES}-minute break
//         between calls.
//         {view && ` ${view.total} time${view.total === 1 ? "" : "s"} available.`}
//       </p>

//       {day === undefined && (
//         <p className="text-sm text-zinc-500">Loading availability…</p>
//       )}
//       {day === null && (
//         <p className="text-sm text-zinc-500">No availability for this day.</p>
//       )}
//       {day && view && view.hours.length === 0 && (
//         <p className="text-sm text-zinc-500">
//           She isn&apos;t working this day.
//         </p>
//       )}

//       {day && view && view.hours.length > 0 && (
//         <div className="grid gap-3 sm:grid-cols-2">
//           {view.hours.map((h) => {
//             const tz = view.tz;
//             const hourStart = slotStartMs(day.dayIndex, h, tz);
//             const slots = view.slotsByHour.get(h) ?? [];
//             const isWorking = view.working.has(h);
//             const status =
//               slots.length > 0
//                 ? `${slots.length} available`
//                 : view.hasBooking.has(h)
//                   ? "Booked"
//                   : isWorking
//                     ? "No times left"
//                     : "Closed";

//             const free: BarSegment[] = slots.map((s) => ({
//               startsAt: s,
//               endsAt: s + minutes * MIN_MS,
//               tone: "free",
//             }));

//             return (
//               <div
//                 key={h}
//                 className={cn(
//                   "rounded-xl border p-3",
//                   isWorking
//                     ? "accent-card bg-zinc-900/60"
//                     : "border-zinc-800 bg-zinc-950/60",
//                 )}
//               >
//                 <div className="flex items-center justify-between">
//                   <span className="font-mono text-sm font-semibold text-zinc-100">
//                     {formatHour(h)}
//                     {!sameZone && (
//                       <span className="ml-2 font-sans text-[11px] font-normal text-zinc-500">
//                         you: {formatTime(hourStart, viewerTz)}
//                       </span>
//                     )}
//                   </span>
//                   <span className="text-[11px] text-zinc-500">{status}</span>
//                 </div>

//                 <HourBar
//                   hourStart={hourStart}
//                   segments={[...view.booked, ...free, ...selectedSegment]}
//                   closed={!isWorking}
//                 />

//                 {slots.length > 0 && (
//                   <div className="mt-3 flex flex-wrap gap-1.5">
//                     {slots.map((s) => {
//                       const isSelected = selected === s;
//                       const shift = sameZone
//                         ? ""
//                         : dayShiftLabel(s, tz, viewerTz);
//                       return (
//                         <button
//                           key={s}
//                           type="button"
//                           onClick={() => onSelectSlot(s)}
//                           aria-pressed={isSelected}
//                           className={cn(
//                             "rounded-lg px-2.5 py-1.5 text-left text-sm font-medium leading-tight transition",
//                             isSelected
//                               ? "bg-rose-600 text-white ring-2 ring-white"
//                               : "border border-rose-500/60 bg-rose-600/15 text-white hover:bg-rose-600/35",
//                           )}
//                         >
//                           {formatTime(s, tz)}
//                           <span className="block text-[10px] font-normal opacity-75">
//                             to {formatTime(s + minutes * MIN_MS, tz)}
//                           </span>
//                           {!sameZone && (
//                             <span className="mt-0.5 block text-[10px] font-normal opacity-90">
//                               you: {formatTime(s, viewerTz)}
//                               {shift && ` (${shift})`}
//                             </span>
//                           )}
//                         </button>
//                       );
//                     })}
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       )}

//       <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
//         <span className="flex items-center gap-1.5">
//           <span className="inline-block h-2 w-2 rounded-full bg-rose-500/70" />
//           Free call time
//         </span>
//         <span className="flex items-center gap-1.5">
//           <span className="inline-block h-2 w-2 rounded-full bg-zinc-500" />
//           Booked
//         </span>
//         <span className="flex items-center gap-1.5">
//           <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
//           Your booking
//         </span>
//         <span className="flex items-center gap-1.5">
//           <span className="inline-block h-2 w-2 rounded-full bg-white" />
//           Selected
//         </span>
//         <span className="flex items-center gap-1.5">
//           <span
//             className="inline-block h-2 w-3 rounded-sm"
//             style={{
//               backgroundImage:
//                 "repeating-linear-gradient(135deg, rgba(161,161,170,0.7) 0 2px, transparent 2px 4px)",
//             }}
//           />
//           {GAP_MINUTES}-min break
//         </span>
//       </div>
//     </div>
//   );
// }

"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  GAP_MINUTES,
  MAX_DAYS_AHEAD,
  MIN_MS,
  dayEndMs,
  dayShiftLabel,
  dayStartMs,
  formatDayLong,
  formatHour,
  formatTime,
  hourOf,
  isSlotBookable,
  relativeDayLabel,
  slotExists,
  slotStartMs,
} from "@/convex/lib/schedule";
import { slotStartsBetween } from "@/convex/lib/slots";
import { useZonedClock } from "@/hooks/useZonedClock";
import { useViewerTz } from "@/hooks/useViewerTz";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { HourBar, type BarSegment } from "../HourBar";

type Props = {
  hostId: Id<"hosts">;
  /** HER time zone. Needed up front so "today" is her today. */
  hostTz: string;
  /** Length of the call the client picked. The start times on screen depend on it. */
  minutes: number;
  /** Currently chosen start time (ms), or null. */
  selected: number | null;
  onSelectSlot: (startsAt: number) => void;
};

export function GirlCalendar({
  hostId,
  hostTz,
  minutes,
  selected,
  onSelectSlot,
}: Props) {
  const { now, dayIndex: today } = useZonedClock(hostTz, 15_000);
  const viewerTz = useViewerTz();
  const sameZone = viewerTz === hostTz;
  const maxDay = today + MAX_DAYS_AHEAD;

  // null = "follow today", so the view stays right if the page is left open
  // past HER midnight.
  const [picked, setPicked] = useState<number | null>(null);
  const dayIndex =
    picked === null ? today : Math.min(Math.max(picked, today), maxDay);

  const fresh = useQuery(api.calendar.getDay, { hostId, dayIndex, minutes });

  // Keep showing the previous day while the next one loads, so the page
  // height doesn't collapse and the content below doesn't jump up.
  // `day` is only undefined on the very first load.
  const [day, setDay] = useState(fresh);
  if (fresh !== undefined && fresh !== day) setDay(fresh);
  const loading = fresh === undefined;

  function jump(delta: number) {
    setPicked(Math.min(Math.max(dayIndex + delta, today), maxDay));
  }

  const view = useMemo(() => {
    if (!day) return null;
    const tz = day.timezone;
    const dayStart = dayStartMs(day.dayIndex, tz);
    const dayEnd = dayEndMs(day.dayIndex, tz);

    // Free start times grouped by the (her-zone) hour they begin in. The
    // 1-hour lead time is applied here, against the live clock.
    const slotsByHour = new Map<number, number[]>();
    let total = 0;
    for (const s of day.slots) {
      if (!isSlotBookable(s, now)) continue;
      const h = hourOf(s, tz);
      const list = slotsByHour.get(h) ?? [];
      list.push(s);
      slotsByHour.set(h, list);
      total += 1;
    }

    // Her working hours, minus any hour that doesn't exist today (the
    // spring-forward gap), plus any hour that holds a booking.
    const working = new Set<number>(
      day.hours.filter((h) => slotExists(day.dayIndex, h, tz)),
    );
    const shown = new Set<number>(working);
    const hasBooking = new Set<number>();
    for (const seg of day.segments) {
      for (const t of slotStartsBetween(seg.startsAt, seg.endsAt, tz)) {
        if (t >= dayStart && t < dayEnd) {
          shown.add(hourOf(t, tz));
          hasBooking.add(hourOf(t, tz));
        }
      }
    }

    const booked: BarSegment[] = day.segments.map((s) => ({
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      tone: s.mine ? "mine" : "booked",
    }));

    return {
      tz,
      slotsByHour,
      total,
      working,
      hasBooking,
      booked,
      hours: [...shown].sort((a, b) => a - b),
    };
  }, [day, now]);

  const selectedSegment: BarSegment[] =
    selected === null
      ? []
      : [
          {
            startsAt: selected,
            endsAt: selected + minutes * MIN_MS,
            tone: "selected",
          },
        ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={dayIndex <= today}
          onClick={() => jump(-1)}
        >
          ←
        </Button>
        <Button
          size="sm"
          variant={dayIndex === today ? "default" : "outline"}
          onClick={() => setPicked(null)}
        >
          Today
        </Button>
        <Button
          size="sm"
          variant={dayIndex === today + 1 ? "default" : "outline"}
          onClick={() => setPicked(today + 1)}
        >
          Tomorrow
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={dayIndex >= maxDay}
          onClick={() => jump(1)}
        >
          →
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={dayIndex >= maxDay}
          onClick={() => jump(7)}
        >
          +7 days
        </Button>
        <span className="ml-auto text-sm text-zinc-300">
          {relativeDayLabel(dayIndex, today)} · {formatDayLong(dayIndex)}
        </span>
      </div>

      <p className="text-xs text-zinc-500">
        &ldquo;Today&rdquo; and &ldquo;Tomorrow&rdquo; are her days. Every start
        time for a {minutes}-minute call. She keeps a {GAP_MINUTES}-minute break
        between calls.
        {view && ` ${view.total} time${view.total === 1 ? "" : "s"} available.`}
      </p>

      {/* min-height keeps the page from shrinking when a quieter day loads,
          so the photos / gifts below don't jump up. Tune 32rem to taste. */}
      <div className="lg:min-h-[32rem]">
        {day === undefined && (
          <p className="text-sm text-zinc-500">Loading availability…</p>
        )}
        {day === null && (
          <p className="text-sm text-zinc-500">No availability for this day.</p>
        )}
        {day && view && view.hours.length === 0 && (
          <p className="text-sm text-zinc-500">
            She isn&apos;t working this day.
          </p>
        )}

        {day && view && view.hours.length > 0 && (
          <div
            className={cn(
              "grid gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
              loading && "pointer-events-none opacity-50",
            )}
            aria-busy={loading}
          >
            {view.hours.map((h) => {
              const tz = view.tz;
              const hourStart = slotStartMs(day.dayIndex, h, tz);
              const slots = view.slotsByHour.get(h) ?? [];
              const isWorking = view.working.has(h);
              const status =
                slots.length > 0
                  ? `${slots.length} available`
                  : view.hasBooking.has(h)
                    ? "Booked"
                    : isWorking
                      ? "No times left"
                      : "Closed";

              const free: BarSegment[] = slots.map((s) => ({
                startsAt: s,
                endsAt: s + minutes * MIN_MS,
                tone: "free",
              }));

              return (
                <div
                  key={h}
                  className={cn(
                    "rounded-xl border p-3",
                    isWorking
                      ? "accent-card bg-zinc-900/60"
                      : "border-zinc-800 bg-zinc-950/60",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-zinc-100">
                      {formatHour(h)}
                      {!sameZone && (
                        <span className="ml-2 font-sans text-[11px] font-normal text-zinc-500">
                          you: {formatTime(hourStart, viewerTz)}
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-zinc-500">{status}</span>
                  </div>

                  <HourBar
                    hourStart={hourStart}
                    segments={[...view.booked, ...free, ...selectedSegment]}
                    closed={!isWorking}
                  />

                  {slots.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {slots.map((s) => {
                        const isSelected = selected === s;
                        const shift = sameZone
                          ? ""
                          : dayShiftLabel(s, tz, viewerTz);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => onSelectSlot(s)}
                            aria-pressed={isSelected}
                            className={cn(
                              "rounded-lg px-2.5 py-1.5 text-left text-sm font-medium leading-tight transition",
                              isSelected
                                ? "bg-rose-600 text-white ring-2 ring-white"
                                : "border border-rose-500/60 bg-rose-600/15 text-white hover:bg-rose-600/35",
                            )}
                          >
                            {formatTime(s, tz)}
                            <span className="block text-[10px] font-normal opacity-75">
                              to {formatTime(s + minutes * MIN_MS, tz)}
                            </span>
                            {!sameZone && (
                              <span className="mt-0.5 block text-[10px] font-normal opacity-90">
                                you: {formatTime(s, viewerTz)}
                                {shift && ` (${shift})`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-rose-500/70" />
          Free call time
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-zinc-500" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
          Your booking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-white" />
          Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-3 rounded-sm"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(161,161,170,0.7) 0 2px, transparent 2px 4px)",
            }}
          />
          {GAP_MINUTES}-min break
        </span>
      </div>
    </div>
  );
}
