"use client";

import { usePresenceHeartbeat } from "../../hooks/usePresenceHeartbeat";

// Renders nothing; exists so the (server) root layout can mount the hook.
export function PresenceHeartbeat(): null {
  usePresenceHeartbeat();
  return null;
}
