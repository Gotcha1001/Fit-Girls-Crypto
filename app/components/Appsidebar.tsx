"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Video,
  CalendarCheck,
  CalendarDays,
  Coins,
  Gift,
  Images,
  Lock,
  Settings,
  BadgeCheck,
  ShieldCheck,
  KeyRound,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Role } from "@/lib/roles";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Video;
}

const CLIENT_NAV: NavItem[] = [
  { href: "/hosts", label: "Browse Girls", icon: Video },
  { href: "/bookings", label: "My Bookings", icon: CalendarCheck },
  { href: "/photos", label: "My Photos", icon: Images }, // NEW: unlocked secret photos
  { href: "/tokens", label: "Tokens", icon: Coins },
  { href: "/gifts", label: "Gifts", icon: Gift },
  { href: "/settings", label: "Settings", icon: Settings },
];

const HOST_NAV: NavItem[] = [
  { href: "/host/onboarding", label: "My Profile", icon: BadgeCheck },
  { href: "/host/schedule", label: "My Schedule", icon: CalendarDays },
  { href: "/host/photos", label: "Secret Photos", icon: Lock }, // NEW: upload + prices
  { href: "/bookings", label: "My Bookings", icon: CalendarCheck },
  { href: "/gifts", label: "My Gifts", icon: Gift },
  { href: "/settings", label: "Settings", icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Approve Girls", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

const GIRL_APPLICANT_NAV: NavItem[] = [
  { href: "/become-a-host", label: "Host Access", icon: KeyRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

const UNDECIDED_NAV: NavItem[] = [
  { href: "/choose-role", label: "Choose account type", icon: UserCog },
];

function navFor(
  me: { role: Role; onboardingChoice?: "client" | "girl" } | null | undefined,
): { label: string; items: NavItem[] } {
  if (!me) return { label: "Menu", items: [] };
  if (me.role === "admin") return { label: "Admin", items: ADMIN_NAV };
  if (me.role === "host") return { label: "Host", items: HOST_NAV };
  if (me.onboardingChoice === "client")
    return { label: "Client", items: CLIENT_NAV };
  if (me.onboardingChoice === "girl") {
    return { label: "Host application", items: GIRL_APPLICANT_NAV };
  }
  return { label: "Welcome", items: UNDECIDED_NAV };
}

export function AppSidebar(): React.JSX.Element {
  const { user } = useUser();
  const pathname = usePathname();
  const me = useQuery(api.user.getMe);
  const role: Role | null = me ? me.role : null;
  const { label: groupLabel, items } = navFor(me);

  const applications = useQuery(
    api.hostAccess.listApplications,
    role === "admin" ? {} : "skip",
  );
  const pendingCount =
    applications?.filter((a) => a.status === "pending").length ?? 0;

  const isClient = role === "user" && me?.onboardingChoice === "client";
  const unseenGifts =
    useQuery(api.gifts.unseenGiftCount, role === "host" ? {} : "skip") ?? 0;
  const tokenSummary = useQuery(
    api.tokens.getMySummary,
    isClient ? {} : "skip",
  );

  const isActive = (href: string): boolean =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-3 py-3">
          <span className="text-2xl">💫</span>
          <div>
            <p className="text-sm font-black text-sidebar-foreground">
              <span className="text-rose-500">FitGirls</span>
            </p>
            <p className="text-[10px] text-sidebar-foreground/60">
              Meet someone real
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
          <SidebarMenu>
            {items.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild isActive={isActive(href)}>
                  <Link href={href} className="flex items-center gap-2">
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
                {href === "/admin" && pendingCount > 0 && (
                  <SidebarMenuBadge className="bg-rose-600 text-white">
                    {pendingCount}
                  </SidebarMenuBadge>
                )}
                {href === "/gifts" && role === "host" && unseenGifts > 0 && (
                  <SidebarMenuBadge className="bg-rose-600 text-white">
                    {unseenGifts}
                  </SidebarMenuBadge>
                )}
                {href === "/tokens" && tokenSummary && (
                  <SidebarMenuBadge className="bg-rose-600 text-white">
                    {tokenSummary.balance}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {role === "user" && me?.onboardingChoice && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/choose-role")}>
                  <Link href="/choose-role" className="flex items-center gap-2">
                    <UserCog size={16} />
                    <span>
                      {me.onboardingChoice === "client"
                        ? "Are you a girl? Switch"
                        : "I'm a client instead"}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {user && (
          <div className="px-3 py-2 border-t border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-rose-600 flex items-center justify-center text-sm">
                💫
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">
                  {user.fullName ?? user.username}
                </p>
                <p className="text-[10px] text-sidebar-foreground/60 truncate">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          </div>
        )}
        <nav className="flex items-center justify-center whitespace-nowrap px-3 pb-3 pt-1 text-[10px] text-sidebar-foreground/60">
          <Link
            href="/terms"
            className="px-2 hover:text-sidebar-foreground hover:underline"
          >
            Terms of Use
          </Link>
          <Link
            href="/privacy"
            className="border-l border-sidebar-border px-2 hover:text-sidebar-foreground hover:underline"
          >
            Privacy Policy
          </Link>
          <span className="border-l border-sidebar-border px-2">18+ only</span>
        </nav>
      </SidebarFooter>
    </Sidebar>
  );
}
