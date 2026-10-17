"use client";

import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Mount once in the root layout. Makes sure a Convex `users` row exists
// as soon as Clerk -> Convex auth is ready, on every page.
export function UserSync(): null {
  const { isAuthenticated } = useConvexAuth();
  const createOrGet = useMutation(api.user.createOrGet);

  useEffect(() => {
    if (isAuthenticated) void createOrGet();
  }, [isAuthenticated, createOrGet]);

  return null;
}
