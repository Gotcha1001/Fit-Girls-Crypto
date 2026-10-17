// One place that decides what each person can see.
// "user" = client (or a girl who hasn't activated yet), "host" = a girl, "admin" = owner.
export type Role = "user" | "host" | "admin";

export type AccountUser = {
  role: Role;
  onboardingChoice?: "client" | "girl";
  timezone?: string;
};

// Open to everyone, signed in or not.
const PUBLIC: string[] = ["/sign-in", "/sign-up", "/privacy", "/terms"];

// Pages each kind of account may open (prefix match).
// If one of your pages is wrongly blocked (e.g. a token payment return page),
// add its path to the right list.
function allowedFor(u: AccountUser): string[] {
  if (u.role === "admin") return ["/admin", "/settings"];
  if (u.role === "host")
    return ["/host", "/bookings", "/call", "/gifts", "/settings"];
  if (u.onboardingChoice === "client") {
    return [
      "/hosts",
      "/bookings",
      "/photos", // NEW: My Photos, and where Paystack sends them back after paying
      "/call",
      "/tokens",
      "/gifts",
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

// True when this account should already have a country/time zone but doesn't.
// Brand-new accounts (role "user" with no choice made yet) are excluded because
// /choose-role captures their locale. Old accounts, hosts and admins without a
// zone get sent to /set-locale by RouteGuard.
export function needsLocale(u: AccountUser): boolean {
  if (u.timezone) return false;
  return u.role !== "user" || !!u.onboardingChoice;
}

export function canAccess(u: AccountUser, pathname: string): boolean {
  if (isPublicPath(pathname)) return true;
  if (matches(pathname, "/set-locale")) return true; // any signed-in role
  return allowedFor(u).some((p) => matches(pathname, p));
}
