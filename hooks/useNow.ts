"use client";

import { useEffect, useState } from "react";

/** Returns Date.now(), refreshed every `intervalMs`. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
