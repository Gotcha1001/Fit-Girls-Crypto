"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Video,
  Gift,
  Lock,
  CalendarCheck,
  ShieldCheck,
  Star,
  BadgeCheck,
  Sparkles,
  Wallet,
  ArrowRight,
} from "lucide-react";

/* ------------------------------ data ------------------------------ */

const STEPS = [
  {
    icon: CalendarCheck,
    title: "Pick a time",
    text: "Browse verified creators and book an hour slot that suits you.",
  },
  {
    icon: Video,
    title: "Go live, one-on-one",
    text: "A private video call, just the two of you. Starts when you both join.",
  },
  {
    icon: Star,
    title: "Rate the experience",
    text: "Score your creator out of 10 afterwards, so quality always rises to the top.",
  },
];

const FEATURES = [
  {
    icon: Video,
    title: "Private video calls",
    text: "Book time with creators you like. Clear HD video, one-on-one, on your schedule.",
  },
  {
    icon: Gift,
    title: "Send gifts",
    text: "Say it with a rose, a drink, or something bigger. Creators are paid directly.",
  },
  {
    icon: Lock,
    title: "Exclusive photo sets",
    text: "Unlock members-only photos you won't find anywhere else, yours to view anytime.",
  },
  {
    icon: ShieldCheck,
    title: "Verified & discreet",
    text: "Every creator is 18+ and ID-verified. Your details and payments stay private.",
  },
];

// Sample data for layout only. Replace with a Convex query later.
const CREATORS = [
  {
    name: "Amara",
    city: "Cape Town",
    rating: 9.6,
    from: "var(--accent-from)",
    to: "var(--accent-via)",
  },
  {
    name: "Lexi",
    city: "Johannesburg",
    rating: 9.4,
    from: "var(--accent-via)",
    to: "var(--accent-to)",
  },
  {
    name: "Nia",
    city: "Durban",
    rating: 9.8,
    from: "var(--accent-to)",
    to: "var(--accent-from)",
  },
  {
    name: "Zara",
    city: "Pretoria",
    rating: 9.2,
    from: "var(--accent-from)",
    to: "var(--accent-to)",
  },
];

const STATS = [
  { value: "18+", label: "Strictly adults only" },
  { value: "100%", label: "ID-verified creators" },
  { value: "10/10", label: "Rating scale you control" },
  { value: "24/7", label: "Hourly slots to book" },
];

/* ---------------------------- animation ---------------------------- */

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const PRIMARY_BUTTON =
  "accent-gradient-bg border-0 px-9 py-6 text-base font-semibold text-white " +
  "[text-shadow:0_1px_2px_rgba(0,0,0,0.4)] " +
  "shadow-[0_0_40px_-8px_var(--accent-500)] transition-all " +
  "hover:opacity-95 hover:shadow-[0_0_55px_-6px_var(--accent-400)]";

const GHOST_BUTTON =
  "border border-white/20 bg-white/5 px-9 py-6 text-base text-white backdrop-blur " +
  "hover:bg-white/10 hover:text-white";

/* ------------------------------ page ------------------------------ */

export default function Home(): React.JSX.Element {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const reduce = useReducedMotion();

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);
  const heroFade = useTransform(scrollYProgress, [0, 0.9], [1, 0]);

  const drift = (d: number) =>
    reduce
      ? undefined
      : { y: [0, d, 0], x: [0, d / 2, 0], scale: [1, 1.08, 1] };

  const cta = isSignedIn ? (
    <Button
      size="lg"
      className={PRIMARY_BUTTON}
      onClick={() => router.push("/discover")}
    >
      Browse creators <ArrowRight className="ml-2 h-5 w-5" />
    </Button>
  ) : (
    <SignInButton mode="modal" forceRedirectUrl="/onboarding">
      <Button size="lg" className={PRIMARY_BUTTON}>
        Join FitGirls <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </SignInButton>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07040a] text-white">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <motion.div
          className="absolute -left-48 -top-48 h-[640px] w-[640px] rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--accent-from)" }}
          animate={drift(40)}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-48 top-[30%] h-[700px] w-[700px] rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--accent-to)" }}
          animate={drift(-40)}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--accent-via)" }}
          animate={drift(30)}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#07040a_85%)]" />
      </div>

      {/* ------------------------------ HERO ------------------------------ */}
      <section
        ref={heroRef}
        className="relative z-10 flex min-h-[92vh] flex-col items-center justify-center px-6 pb-20 pt-28 text-center"
      >
        <motion.div
          style={{ y: heroY, opacity: heroFade }}
          className="flex flex-col items-center"
        >
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center"
          >
            <motion.span
              variants={rise}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/80 backdrop-blur"
            >
              <Sparkles
                className="h-3.5 w-3.5"
                style={{ color: "var(--accent-400)" }}
              />
              Adults only · 18+
            </motion.span>

            <motion.h1
              variants={rise}
              className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl"
              style={{ fontFamily: "Fraunces, ui-serif, Georgia, serif" }}
            >
              Your private time with{" "}
              <span
                className="accent-gradient-text italic"
                style={{ filter: "drop-shadow(0 0 28px var(--accent-500))" }}
              >
                someone who gets you.
              </span>
            </motion.h1>

            <motion.p
              variants={rise}
              className="mt-6 max-w-xl text-lg text-white/70"
            >
              Book one-on-one video calls with verified creators, send gifts
              that get noticed, and unlock exclusive photo sets. All in one
              discreet place.
            </motion.p>

            <motion.div
              variants={rise}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              {cta}
              {!isSignedIn && (
                <Link href="/sign-in">
                  <Button variant="ghost" size="lg" className={GHOST_BUTTON}>
                    Sign in
                  </Button>
                </Link>
              )}
            </motion.div>

            <motion.p
              variants={rise}
              className="mt-5 flex items-center gap-2 text-sm text-white/50"
            >
              <ShieldCheck className="h-4 w-4" /> Verified creators · Secure
              payments · Discreet billing
            </motion.p>
          </motion.div>
        </motion.div>
      </section>

      {/* ------------------------------ STATS ------------------------------ */}
      <section className="relative z-10 mx-auto max-w-5xl px-6">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-2 gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md md:grid-cols-4"
        >
          {STATS.map((s) => (
            <motion.div key={s.label} variants={rise} className="text-center">
              <div className="accent-gradient-text text-3xl font-semibold">
                {s.value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider text-white/55">
                {s.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ---------------------------- CREATORS ---------------------------- */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-28">
        <SectionHeading
          eyebrow="Featured"
          title="Meet the girls everyone's booking"
        />
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {CREATORS.map((c) => (
            <motion.article
              key={c.name}
              variants={rise}
              whileHover={reduce ? undefined : { y: -8 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="group relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/10"
              style={{
                background: `linear-gradient(160deg, ${c.from}, ${c.to})`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs backdrop-blur">
                <Star
                  className="h-3 w-3 fill-current"
                  style={{ color: "var(--accent-400)" }}
                />
                {c.rating.toFixed(1)}/10
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 text-left">
                <div className="flex items-center gap-1.5 text-lg font-semibold">
                  {c.name}
                  <BadgeCheck className="h-4 w-4 text-sky-300" />
                </div>
                <p className="text-sm text-white/65">{c.city}</p>
                <Link
                  href="/discover"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Book a call <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* ---------------------------- FEATURES ---------------------------- */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-28">
        <SectionHeading
          eyebrow="What you get"
          title="Everything, in one place"
        />
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-6 sm:grid-cols-2"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={rise}
              whileHover={reduce ? undefined : { scale: 1.02 }}
              className="accent-card rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-left backdrop-blur-md"
            >
              <span className="accent-gradient-bg mb-5 flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_0_28px_-6px_var(--accent-500)]">
                <f.icon size={22} />
              </span>
              <h3 className="mb-2 text-xl font-semibold">{f.title}</h3>
              <p className="text-white/65">{f.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* --------------------------- HOW IT WORKS --------------------------- */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-28">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps to your first call"
        />
        <motion.ol
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-8 md:grid-cols-3"
        >
          {STEPS.map((s, i) => (
            <motion.li
              key={s.title}
              variants={rise}
              className="relative text-left"
            >
              <div className="accent-gradient-text mb-3 text-6xl font-semibold opacity-80">
                {String(i + 1).padStart(2, "0")}
              </div>
              <s.icon
                className="mb-3 h-6 w-6"
                style={{ color: "var(--accent-400)" }}
              />
              <h3 className="mb-1 text-lg font-semibold">{s.title}</h3>
              <p className="text-sm text-white/65">{s.text}</p>
            </motion.li>
          ))}
        </motion.ol>
      </section>

      {/* ------------------------------- CTA ------------------------------- */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-[2rem] border border-white/15 p-12 text-center"
        >
          <div className="accent-gradient-bg absolute inset-0 opacity-30" />
          <div className="absolute inset-0 backdrop-blur-xl" />
          <div className="relative">
            <Wallet
              className="mx-auto mb-4 h-8 w-8"
              style={{ color: "var(--accent-400)" }}
            />
            <h2
              className="text-4xl font-semibold md:text-5xl"
              style={{ fontFamily: "Fraunces, ui-serif, Georgia, serif" }}
            >
              Ready when you are.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-white/75">
              Create your account in a minute and book your first call tonight.
            </p>
            <div className="mt-8 flex justify-center">{cta}</div>
          </div>
        </motion.div>
      </section>

      {/* ------------------------------ FOOTER ------------------------------ */}
      <footer className="relative z-10 border-t border-white/10 px-6 py-10 text-center text-xs text-white/45">
        <p>
          FitGirls is for adults aged 18 and over. All creators are age- and
          identity-verified.
        </p>
        <p className="mt-2">
          © {new Date().getFullYear()} FitGirls. All rights reserved.
        </p>
      </footer>
    </main>
  );
}

/* --------------------------- small component --------------------------- */

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
      className="text-center"
    >
      <p
        className="mb-3 text-xs font-medium uppercase tracking-[0.25em]"
        style={{ color: "var(--accent-400)" }}
      >
        {eyebrow}
      </p>
      <h2
        className="text-3xl font-semibold md:text-5xl"
        style={{ fontFamily: "Fraunces, ui-serif, Georgia, serif" }}
      >
        {title}
      </h2>
    </motion.div>
  );
}
