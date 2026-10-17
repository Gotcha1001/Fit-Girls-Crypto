"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserContext } from "./context/UserContext";

export default function Provider({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn } = useUser();
  const createOrGet = useMutation(api.user.createOrGet);
  const currentUser = useQuery(api.user.getMe, isSignedIn ? {} : "skip");

  useEffect(() => {
    if (isSignedIn) {
      createOrGet().catch(console.error);
    }
  }, [isSignedIn, createOrGet]);

  return (
    <UserContext.Provider value={currentUser ?? null}>
      {children}
    </UserContext.Provider>
  );
}