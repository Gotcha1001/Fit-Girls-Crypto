"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { canAccess, homeFor, isPublicPath, needsLocale } from "@/lib/roles";

// Sends people away from pages that aren't theirs. This is for a clean
// experience; the real protection is the checks inside each Convex function.
export function RouteGuard({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element | null {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.user.getMe);

  const publicPath = isPublicPath(pathname);

  // Work out what to do. `target` is where to redirect, if anywhere.
  let state: "wait" | "allow" | "redirect" = "allow";
  let target: string | null = null;

  if (publicPath) {
    state = "allow";
  } else if (isLoading) {
    state = "wait";
  } else if (!isAuthenticated) {
    state = "allow"; // signed-out visitors are handled by your Clerk middleware
  } else if (me === undefined || me === null) {
    state = "wait"; // signed in, waiting for the Convex user row
  } else if (needsLocale(me)) {
    // Safety net: accounts with no country/time zone must set one first.
    if (pathname !== "/set-locale") {
      state = "redirect";
      target = "/set-locale";
    }
  } else if (pathname === "/set-locale") {
    // Already has a locale; changing it happens in Settings, with a warning.
    state = "redirect";
    target = homeFor(me);
  } else if (pathname === "/") {
    state = "redirect";
    target = homeFor(me);
  } else if (!canAccess(me, pathname)) {
    state = "redirect";
    target = homeFor(me);
  }

  useEffect(() => {
    if (state === "redirect" && target) router.replace(target);
  }, [state, target, router]);

  if (state === "wait") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (state === "redirect") return null;
  return <>{children}</>;
}
