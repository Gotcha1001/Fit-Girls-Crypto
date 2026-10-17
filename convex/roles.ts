// One place that decides what each person can see.
// "user" = client (or a girl who hasn't activated yet), "host" = a girl, "admin" = owner.

export type Role = "user" | "host" | "admin";
export type AccountUser = {
  role: Role;
  onboardingChoice?: "client" | "girl";
};

// Open to everyone, signed in or not.
const PUBLIC: string[] = ["/sign-in", "/sign-up", "/privacy", "/terms"];

// Pages each kind of account may open (prefix match).
// If one of your pages is wrongly blocked (e.g. a token payment return page),
// add its path to the right list.
function allowedFor(u: AccountUser): string[] {
  if (u.role === "admin") return ["/admin", "/settings"];
  if (u.role === "host") return ["/host", "/bookings", "/call", "/settings"];
  if (u.onboardingChoice === "client") {
    return [
      "/hosts",
      "/bookings",
      "/call",
      "/tokens",
      "/settings",
      "/verify-age",
      "/choose-role",
    ];
  }
  if (u.onboardingChoice === "girl") {
    return ["/become-a-host", "/choose-role", "/settings"];
  }
  return ["/choose-role"]; // hasn't chosen yet
}

export function homeFor(u: AccountUser): string {
  if (u.role === "admin") return "/admin";
  if (u.role === "host") return "/host/onboarding";
  if (u.onboardingChoice === "girl") return "/become-a-host";
  if (u.onboardingChoice === "client") return "/hosts";
  return "/choose-role";
}

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC.some((p) => matches(pathname, p));
}

export function canAccess(u: AccountUser, pathname: string): boolean {
  if (isPublicPath(pathname)) return true;
  return allowedFor(u).some((p) => matches(pathname, p));
}
