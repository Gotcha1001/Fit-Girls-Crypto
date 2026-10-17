// // app/components/Navbar.tsx
// "use client";

// import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
// import { useMutation, useQuery } from "convex/react";
// import { motion, useReducedMotion } from "framer-motion";
// import { Gift, Heart, MessageCircle, Phone } from "lucide-react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useMemo, useState } from "react";
// import { Button } from "@/components/ui/button";
// import { SidebarTrigger } from "@/components/ui/sidebar";
// import { api } from "@/convex/_generated/api";
// import type { IncomingCall } from "@/convex/notifications";
// import { useNow } from "@/hooks/useNow";
// import { useAppearance } from "@/app/context/AppearanceContext";
// import { accentBackground, alpha, type AccentTheme } from "@/lib/appearance";
// import { ThemeToggle } from "./ThemeToggle";

// // A "call now" request only counts as ringing for this long; after that it's
// // treated as a missed request and shows up as a normal (non-flashing) badge.
// const RING_WINDOW_MS = 60_000;

// function CountBadge({ count }: { count: number }): React.JSX.Element | null {
//   if (count <= 0) return null;
//   return (
//     <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold leading-none text-white">
//       {count > 99 ? "99+" : count}
//     </span>
//   );
// }

// interface NavIconLinkProps {
//   href: string;
//   label: string;
//   count: number;
//   children: React.ReactNode;
// }

// function NavIconLink({
//   href,
//   label,
//   count,
//   children,
// }: NavIconLinkProps): React.JSX.Element {
//   return (
//     <Link
//       href={href}
//       aria-label={count > 0 ? `${label} (${count})` : label}
//       title={label}
//       className="relative rounded-full p-2 text-gray-700 hover:bg-rose-500/10 dark:text-gray-200 dark:hover:bg-rose-500/20"
//     >
//       {children}
//       <CountBadge count={count} />
//     </Link>
//   );
// }

// function RingingCallButton({
//   call,
//   extraCount,
// }: {
//   call: IncomingCall;
//   extraCount: number;
// }): React.JSX.Element {
//   const router = useRouter();
//   const respondToCall = useMutation(api.calls.respondToCall);
//   const [isJoining, setIsJoining] = useState<boolean>(false);

//   async function handleAnswer(): Promise<void> {
//     setIsJoining(true);
//     try {
//       await respondToCall({ callSessionId: call.callSessionId, accept: true });
//       router.push(`/call/${call.callSessionId}`);
//     } finally {
//       setIsJoining(false);
//     }
//   }

//   return (
//     <motion.button
//       type="button"
//       onClick={handleAnswer}
//       disabled={isJoining}
//       aria-label={`${call.callerName} is calling — answer`}
//       title={`${call.callerName} is calling — tap to answer`}
//       className="relative flex items-center gap-2 rounded-full bg-green-600 px-3 py-2 text-white shadow-lg shadow-green-600/40 hover:bg-green-500 disabled:opacity-60"
//       animate={{ scale: [1, 1.12, 1], rotate: [0, -12, 12, -12, 12, 0] }}
//       transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
//     >
//       <Phone size={18} />
//       <span className="hidden max-w-32 truncate text-sm font-semibold sm:inline">
//         {call.callerName}
//       </span>
//       <CountBadge count={extraCount} />
//       <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-green-500/40" />
//     </motion.button>
//   );
// }

// // All three indicators live here so there is a single reactive Convex query.
// function NavNotifications(): React.JSX.Element | null {
//   const counts = useQuery(api.notifications.getNavCounts);
//   const now = useNow(5000);

//   if (!counts) return null;

//   const ringing = counts.incomingCalls.filter(
//     (c) => c.scheduledFor === undefined && now - c.createdAt < RING_WINDOW_MS,
//   );
//   const otherRequests = counts.incomingCalls.length - ringing.length;

//   return (
//     <>
//       {ringing.length > 0 ? (
//         // Newest ringing call is first; extra ringing calls show as a badge.
//         <RingingCallButton call={ringing[0]} extraCount={ringing.length - 1} />
//       ) : (
//         otherRequests > 0 && (
//           <NavIconLink
//             href="/calls"
//             label="Call requests"
//             count={otherRequests}
//           >
//             <Phone size={20} />
//           </NavIconLink>
//         )
//       )}
//       {/* If a call is ringing AND older requests exist, keep a link to them */}
//       {ringing.length > 0 && otherRequests > 0 && (
//         <NavIconLink href="/calls" label="Call requests" count={otherRequests}>
//           <Phone size={20} />
//         </NavIconLink>
//       )}
//       <NavIconLink
//         href="/messages"
//         label="Messages"
//         count={counts.unreadMessages}
//       >
//         <MessageCircle size={20} />
//       </NavIconLink>
//       <NavIconLink href="/gifts" label="Gifts" count={counts.unseenGifts}>
//         <Gift size={20} />
//       </NavIconLink>
//     </>
//   );
// }

// /* ------------------------------ animated brand ------------------------------ */

// const ORBIT_TOKENS = [
//   { label: "like", radius: 20, duration: 7, delay: 0, startAngle: 20 },
//   { label: "chat", radius: 20, duration: 7, delay: 3.5, startAngle: 200 },
// ];

// const flicker = {
//   opacity: [0.55, 0.9, 0.5, 1, 0.6, 0.85, 0.55],
//   scale: [0.95, 1.05, 0.92, 1.1, 0.97, 1.04, 0.95],
// };

// /** Tiled HUD grid as an SVG data-URI, drawn in the accent color. */
// function hudGridBackground(hex: string): string {
//   const svg =
//     `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'>` +
//     `<path d='M48 0H0V48' fill='none' stroke='${hex}' stroke-width='1' opacity='0.5'/>` +
//     `<circle cx='0' cy='0' r='1.5' fill='${hex}'/></svg>`;
//   return `data:image/svg+xml,${encodeURIComponent(svg)}`;
// }

// function BrandMark({ theme }: { theme: AccentTheme }): React.JSX.Element {
//   const reduceMotion = useReducedMotion();
//   const { hex400, shades } = theme;

//   const spin = (reverse = false) =>
//     reduceMotion ? undefined : { rotate: reverse ? -360 : 360 };
//   const spinTransition = (duration: number) =>
//     reduceMotion
//       ? { duration: 0 }
//       : { duration, repeat: Infinity, ease: "linear" as const };

//   return (
//     <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
//       {/* Words orbiting the mark */}
//       {!reduceMotion &&
//         ORBIT_TOKENS.map((t) => (
//           <motion.span
//             key={t.label}
//             className="pointer-events-none absolute font-mono text-[8px] font-medium uppercase tracking-wide"
//             style={{
//               left: "50%",
//               top: "50%",
//               color: shades[300],
//               opacity: 0.8,
//             }}
//             animate={{
//               x: Array.from({ length: 13 }, (_, i) => {
//                 const angle = ((t.startAngle + (i / 12) * 360) * Math.PI) / 180;
//                 return Math.cos(angle) * t.radius;
//               }),
//               y: Array.from({ length: 13 }, (_, i) => {
//                 const angle = ((t.startAngle + (i / 12) * 360) * Math.PI) / 180;
//                 return Math.sin(angle) * t.radius;
//               }),
//               opacity: [0, 1, 1, 1, 0],
//             }}
//             transition={{
//               duration: t.duration,
//               delay: t.delay,
//               repeat: Infinity,
//               ease: "linear",
//               opacity: {
//                 duration: t.duration,
//                 delay: t.delay,
//                 repeat: Infinity,
//                 times: [0, 0.08, 0.5, 0.92, 1],
//               },
//             }}
//           >
//             {t.label}
//           </motion.span>
//         ))}

//       {/* Counter-rotating rings */}
//       <motion.div
//         className="absolute inset-0 rounded-full border border-dashed"
//         style={{ borderColor: alpha(hex400, 0.4) }}
//         animate={spin()}
//         transition={spinTransition(10)}
//       />
//       <motion.div
//         className="absolute inset-1 rounded-full border"
//         style={{ borderColor: alpha(shades[600], 0.4) }}
//         animate={spin(true)}
//         transition={spinTransition(6.5)}
//       />

//       {/* Pulse ring */}
//       <motion.div
//         className="absolute inset-0 rounded-full border-2"
//         style={{ borderColor: alpha(shades[300], 0.3) }}
//         animate={
//           reduceMotion
//             ? undefined
//             : { scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }
//         }
//         transition={{ duration: 1.8, repeat: Infinity }}
//       />

//       {/* Flickering glow */}
//       <motion.div
//         className="absolute h-5 w-5 rounded-full blur-md"
//         style={{ backgroundColor: shades[300] }}
//         animate={reduceMotion ? undefined : flicker}
//         transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
//       />

//       {/* Core: accent gradient + heart */}
//       <div
//         className="relative flex h-6 w-6 items-center justify-center rounded-full border"
//         style={{
//           borderColor: alpha(hex400, 0.5),
//           background: accentBackground(theme),
//           boxShadow: `0 0 12px -2px ${alpha(hex400, 0.9)}`,
//         }}
//       >
//         <Heart className="h-3 w-3 fill-white text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
//       </div>
//     </div>
//   );
// }

// /* --------------------------------- navbar --------------------------------- */

// export default function Navbar(): React.JSX.Element {
//   const reduceMotion = useReducedMotion();
//   const { theme } = useAppearance();
//   const { hex400, shades } = theme;
//   const gridBg = useMemo(() => hudGridBackground(hex400), [hex400]);

//   return (
//     <motion.nav
//       className="relative grid grid-cols-3 items-center overflow-hidden border-b bg-white px-6 py-4 shadow-sm dark:bg-[#04070a]"
//       style={{ borderColor: alpha(hex400, 0.15) }}
//       initial={{ y: -40, opacity: 0 }}
//       animate={{ y: 0, opacity: 1 }}
//       transition={{ duration: 0.4 }}
//     >
//       {/* HUD background (dark mode) */}
//       <div className="pointer-events-none absolute inset-0 hidden dark:block">
//         <div
//           className="absolute inset-0 opacity-25"
//           style={{
//             backgroundImage: `url("${gridBg}")`,
//             backgroundSize: "48px 48px",
//           }}
//         />
//         <div
//           className="absolute inset-0"
//           style={{
//             background:
//               "radial-gradient(ellipse at top, color-mix(in oklab, var(--accent-from) 18%, #04070a) 0%, #04070a 70%)",
//           }}
//         />
//         <div
//           className="absolute inset-x-0 bottom-0 h-px"
//           style={{
//             background: `linear-gradient(to right, transparent, ${alpha(hex400, 0.4)}, transparent)`,
//           }}
//         />
//         {/* Corner brackets */}
//         {[
//           "-left-px -top-px border-l-2 border-t-2",
//           "-right-px -top-px border-r-2 border-t-2",
//           "-left-px -bottom-px border-l-2 border-b-2",
//           "-right-px -bottom-px border-r-2 border-b-2",
//         ].map((cls) => (
//           <div
//             key={cls}
//             className={`absolute ${cls} h-3.5 w-3.5`}
//             style={{ borderColor: alpha(hex400, 0.45) }}
//           />
//         ))}
//         {/* Scanning line */}
//         {!reduceMotion && (
//           <motion.div
//             className="absolute bottom-0 top-0 w-px"
//             style={{
//               background: `linear-gradient(to bottom, transparent, ${alpha(shades[300], 0.35)}, transparent)`,
//             }}
//             animate={{ left: ["0%", "100%"] }}
//             transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
//           />
//         )}
//       </div>

//       {/* Left: sidebar trigger (mobile) */}
//       <div className="relative z-10 justify-self-start">
//         <SidebarTrigger className="text-slate-700 md:hidden dark:text-stone-300" />
//       </div>

//       {/* Center: brand */}
//       <div className="relative z-10 justify-self-center">
//         <Link href="/" className="flex items-center gap-4">
//           <BrandMark theme={theme} />
//           <span
//             className="accent-gradient-text text-lg font-black tracking-tight"
//             style={{ filter: `drop-shadow(0 0 10px ${alpha(hex400, 0.35)})` }}
//           >
//             Spark
//           </span>
//         </Link>
//       </div>

//       {/* Right: actions */}
//       <div className="relative z-10 flex items-center gap-2 justify-self-end">
//         <SignedOut>
//           <Link href="/sign-in">
//             <Button
//               variant="ghost"
//               className="text-slate-700 dark:text-stone-200"
//             >
//               Sign In
//             </Button>
//           </Link>
//           <Link href="/sign-up">
//             <Button
//               className="border text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] hover:opacity-90"
//               style={{
//                 borderColor: alpha(hex400, 0.4),
//                 background: accentBackground(theme),
//                 boxShadow: `0 0 20px -6px ${alpha(hex400, 0.6)}`,
//               }}
//             >
//               Sign Up
//             </Button>
//           </Link>
//         </SignedOut>
//         <SignedIn>
//           <NavNotifications />
//           <ThemeToggle />
//           <UserButton afterSignOutUrl="/" />
//         </SignedIn>
//       </div>
//     </motion.nav>
//   );
// }

// app/components/Navbar.tsx
"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { Heart, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";
import type { IncomingCall } from "@/convex/notifications";
import { useNow } from "@/hooks/useNow";
import { useAppearance } from "@/app/context/AppearanceContext";
import { accentBackground, alpha, type AccentTheme } from "@/lib/appearance";
import { ThemeToggle } from "./ThemeToggle";

// A "call now" request only counts as ringing for this long; after that it's
// treated as missed and the button disappears.
const RING_WINDOW_MS = 60_000;

function CountBadge({ count }: { count: number }): React.JSX.Element | null {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function RingingCallButton({
  call,
  extraCount,
}: {
  call: IncomingCall;
  extraCount: number;
}): React.JSX.Element {
  const router = useRouter();
  const respondToCall = useMutation(api.calls.respondToCall);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  async function handleAnswer(): Promise<void> {
    setIsJoining(true);
    try {
      await respondToCall({ callSessionId: call.callSessionId, accept: true });
      router.push(`/call/${call.callSessionId}`);
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleAnswer}
      disabled={isJoining}
      aria-label={`${call.callerName} is calling — answer`}
      title={`${call.callerName} is calling — tap to answer`}
      className="relative flex items-center gap-2 rounded-full bg-green-600 px-3 py-2 text-white shadow-lg shadow-green-600/40 hover:bg-green-500 disabled:opacity-60"
      animate={{ scale: [1, 1.12, 1], rotate: [0, -12, 12, -12, 12, 0] }}
      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
    >
      <Phone size={18} />
      <span className="hidden max-w-32 truncate text-sm font-semibold sm:inline">
        {call.callerName}
      </span>
      <CountBadge count={extraCount} />
      <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-green-500/40" />
    </motion.button>
  );
}

// Only the ringing-call button lives in the navbar now. Messages, gifts and
// the call-requests list were dating-app features with no page any role can
// open, so their icons were removed.
function NavNotifications(): React.JSX.Element | null {
  const counts = useQuery(api.notifications.getNavCounts);
  const now = useNow(5000);

  if (!counts) return null;

  const ringing = counts.incomingCalls.filter(
    (c) => c.scheduledFor === undefined && now - c.createdAt < RING_WINDOW_MS,
  );

  if (ringing.length === 0) return null;

  // Newest ringing call is first; extra ringing calls show as a badge.
  return (
    <RingingCallButton call={ringing[0]} extraCount={ringing.length - 1} />
  );
}

/* ------------------------------ animated brand ------------------------------ */

const ORBIT_TOKENS = [
  { label: "like", radius: 20, duration: 7, delay: 0, startAngle: 20 },
  { label: "chat", radius: 20, duration: 7, delay: 3.5, startAngle: 200 },
];

const flicker = {
  opacity: [0.55, 0.9, 0.5, 1, 0.6, 0.85, 0.55],
  scale: [0.95, 1.05, 0.92, 1.1, 0.97, 1.04, 0.95],
};

/** Tiled HUD grid as an SVG data-URI, drawn in the accent color. */
function hudGridBackground(hex: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'>` +
    `<path d='M48 0H0V48' fill='none' stroke='${hex}' stroke-width='1' opacity='0.5'/>` +
    `<circle cx='0' cy='0' r='1.5' fill='${hex}'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function BrandMark({ theme }: { theme: AccentTheme }): React.JSX.Element {
  const reduceMotion = useReducedMotion();
  const { hex400, shades } = theme;

  const spin = (reverse = false) =>
    reduceMotion ? undefined : { rotate: reverse ? -360 : 360 };
  const spinTransition = (duration: number) =>
    reduceMotion
      ? { duration: 0 }
      : { duration, repeat: Infinity, ease: "linear" as const };

  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
      {/* Words orbiting the mark */}
      {!reduceMotion &&
        ORBIT_TOKENS.map((t) => (
          <motion.span
            key={t.label}
            className="pointer-events-none absolute font-mono text-[8px] font-medium uppercase tracking-wide"
            style={{
              left: "50%",
              top: "50%",
              color: shades[300],
              opacity: 0.8,
            }}
            animate={{
              x: Array.from({ length: 13 }, (_, i) => {
                const angle = ((t.startAngle + (i / 12) * 360) * Math.PI) / 180;
                return Math.cos(angle) * t.radius;
              }),
              y: Array.from({ length: 13 }, (_, i) => {
                const angle = ((t.startAngle + (i / 12) * 360) * Math.PI) / 180;
                return Math.sin(angle) * t.radius;
              }),
              opacity: [0, 1, 1, 1, 0],
            }}
            transition={{
              duration: t.duration,
              delay: t.delay,
              repeat: Infinity,
              ease: "linear",
              opacity: {
                duration: t.duration,
                delay: t.delay,
                repeat: Infinity,
                times: [0, 0.08, 0.5, 0.92, 1],
              },
            }}
          >
            {t.label}
          </motion.span>
        ))}

      {/* Counter-rotating rings */}
      <motion.div
        className="absolute inset-0 rounded-full border border-dashed"
        style={{ borderColor: alpha(hex400, 0.4) }}
        animate={spin()}
        transition={spinTransition(10)}
      />
      <motion.div
        className="absolute inset-1 rounded-full border"
        style={{ borderColor: alpha(shades[600], 0.4) }}
        animate={spin(true)}
        transition={spinTransition(6.5)}
      />

      {/* Pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2"
        style={{ borderColor: alpha(shades[300], 0.3) }}
        animate={
          reduceMotion
            ? undefined
            : { scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }
        }
        transition={{ duration: 1.8, repeat: Infinity }}
      />

      {/* Flickering glow */}
      <motion.div
        className="absolute h-5 w-5 rounded-full blur-md"
        style={{ backgroundColor: shades[300] }}
        animate={reduceMotion ? undefined : flicker}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Core: accent gradient + heart */}
      <div
        className="relative flex h-6 w-6 items-center justify-center rounded-full border"
        style={{
          borderColor: alpha(hex400, 0.5),
          background: accentBackground(theme),
          boxShadow: `0 0 12px -2px ${alpha(hex400, 0.9)}`,
        }}
      >
        <Heart className="h-3 w-3 fill-white text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
      </div>
    </div>
  );
}

/* --------------------------------- navbar --------------------------------- */

export default function Navbar(): React.JSX.Element {
  const reduceMotion = useReducedMotion();
  const { theme } = useAppearance();
  const { hex400, shades } = theme;
  const gridBg = useMemo(() => hudGridBackground(hex400), [hex400]);

  return (
    <motion.nav
      className="relative grid grid-cols-3 items-center overflow-hidden border-b bg-white px-6 py-4 shadow-sm dark:bg-[#04070a]"
      style={{ borderColor: alpha(hex400, 0.15) }}
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* HUD background (dark mode) */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `url("${gridBg}")`,
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at top, color-mix(in oklab, var(--accent-from) 18%, #04070a) 0%, #04070a 70%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-px"
          style={{
            background: `linear-gradient(to right, transparent, ${alpha(hex400, 0.4)}, transparent)`,
          }}
        />
        {/* Corner brackets */}
        {[
          "-left-px -top-px border-l-2 border-t-2",
          "-right-px -top-px border-r-2 border-t-2",
          "-left-px -bottom-px border-l-2 border-b-2",
          "-right-px -bottom-px border-r-2 border-b-2",
        ].map((cls) => (
          <div
            key={cls}
            className={`absolute ${cls} h-3.5 w-3.5`}
            style={{ borderColor: alpha(hex400, 0.45) }}
          />
        ))}
        {/* Scanning line */}
        {!reduceMotion && (
          <motion.div
            className="absolute bottom-0 top-0 w-px"
            style={{
              background: `linear-gradient(to bottom, transparent, ${alpha(shades[300], 0.35)}, transparent)`,
            }}
            animate={{ left: ["0%", "100%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>

      {/* Left: sidebar trigger (mobile) */}
      <div className="relative z-10 justify-self-start">
        <SidebarTrigger className="text-slate-700 md:hidden dark:text-stone-300" />
      </div>

      {/* Center: brand */}
      <div className="relative z-10 justify-self-center">
        <Link href="/" className="flex items-center gap-4">
          <BrandMark theme={theme} />
          <span
            className="accent-gradient-text text-lg font-black tracking-tight"
            style={{ filter: `drop-shadow(0 0 10px ${alpha(hex400, 0.35)})` }}
          >
            FitGirls
          </span>
        </Link>
      </div>

      {/* Right: actions */}
      <div className="relative z-10 flex items-center gap-2 justify-self-end">
        <SignedOut>
          <Link href="/sign-in">
            <Button
              variant="ghost"
              className="text-slate-700 dark:text-stone-200"
            >
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button
              className="border text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] hover:opacity-90"
              style={{
                borderColor: alpha(hex400, 0.4),
                background: accentBackground(theme),
                boxShadow: `0 0 20px -6px ${alpha(hex400, 0.6)}`,
              }}
            >
              Sign Up
            </Button>
          </Link>
        </SignedOut>
        <SignedIn>
          <NavNotifications />
          <ThemeToggle />
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </motion.nav>
  );
}
