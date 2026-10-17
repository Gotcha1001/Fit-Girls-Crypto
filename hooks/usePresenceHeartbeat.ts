"use client";

import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HEARTBEAT_INTERVAL_MS } from "../lib/presence";

/**
 * While the user is signed in and the tab is visible, keeps
 * profiles.lastActiveAt fresh so other users see them as online.
 */
export function usePresenceHeartbeat(): void {
  const { isAuthenticated } = useConvexAuth();
  const touchPresence = useMutation(api.profiles.touchPresence);

  useEffect(() => {
    if (!isAuthenticated) return;

    const beat = (): void => {
      if (document.visibilityState !== "visible") return;
      touchPresence().catch((): void => undefined); // presence is best-effort
    };

    beat(); // immediately on load / sign-in
    const id = window.setInterval(beat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", beat); // tab focused again

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [isAuthenticated, touchPresence]);
}
