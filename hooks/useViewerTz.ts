"use client";

import { useUserContext } from "@/app/context/UserContext";
import { browserZone } from "@/convex/lib/timezones";

/** The signed-in person's zone, falling back to the browser's. */
export function useViewerTz(): string {
  const me = useUserContext();
  return me?.timezone ?? browserZone();
}
