"use client";

import { useEffect, useState } from "react";
import { dayIndexOf, formatTime, tzLabel } from "@/convex/lib/schedule";

export function useZonedClock(tz: string, tickMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return {
    now,
    timeLabel: formatTime(now, tz),
    dayIndex: dayIndexOf(now, tz),
    tz,
    label: tzLabel(tz, now),
  };
}
