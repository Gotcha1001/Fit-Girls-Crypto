// lib/appearance.ts
//
// Single source of truth for the Settings page: accent colors + rain options.
// Imported by the client (context, CyberRain, settings page) AND by Convex
// (convex/users.ts) so both sides validate against the same lists.
//
// Accent colors are applied by writing data-accent="<id>" on <html>; the CSS
// in globals.css maps that to --accent-300 .. --accent-700 variables.

/* ---------------------------------- accents --------------------------------- */

export const ACCENT_IDS = [
  // solid
  "pink",
  "cyan",
  "violet",
  "lime",
  "amber",
  "blue",
  // gradient
  "sunset",
  "ocean",
  "aurora",
  "cotton",
  "inferno",
  "emerald",
  "galaxy",
  "rosegold",
  "synthwave",
  "crimson",
] as const;

export type AccentId = (typeof ACCENT_IDS)[number];

export interface AccentShades {
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
}

/** Three color stops, used for gradient accents (sidebar, swatches, rain). */
export interface AccentGradient {
  from: string;
  via: string;
  to: string;
}

export interface AccentTheme {
  id: AccentId;
  label: string;
  kind: "solid" | "gradient";
  /** Main UI color. For gradients this is a mid-tone of the gradient. */
  hex400: string;
  /** Single-hue shades: text, borders, glow and the rose-* remap use these. */
  shades: AccentShades;
  /** Present only on gradient accents. */
  gradient?: AccentGradient;
}

export const ACCENT_THEMES: Record<AccentId, AccentTheme> = {
  pink: {
    id: "pink",
    label: "Neon pink",
    kind: "solid",
    hex400: "#f472b6",
    shades: {
      300: "#f9a8d4",
      400: "#f472b6",
      500: "#ec4899",
      600: "#db2777",
      700: "#be185d",
    },
  },
  cyan: {
    id: "cyan",
    label: "Cyber cyan",
    kind: "solid",
    hex400: "#22d3ee",
    shades: {
      300: "#67e8f9",
      400: "#22d3ee",
      500: "#06b6d4",
      600: "#0891b2",
      700: "#0e7490",
    },
  },
  violet: {
    id: "violet",
    label: "Ultraviolet",
    kind: "solid",
    hex400: "#a78bfa",
    shades: {
      300: "#c4b5fd",
      400: "#a78bfa",
      500: "#8b5cf6",
      600: "#7c3aed",
      700: "#6d28d9",
    },
  },
  lime: {
    id: "lime",
    label: "Acid lime",
    kind: "solid",
    hex400: "#a3e635",
    shades: {
      300: "#bef264",
      400: "#a3e635",
      500: "#84cc16",
      600: "#65a30d",
      700: "#4d7c0f",
    },
  },
  amber: {
    id: "amber",
    label: "Sodium amber",
    kind: "solid",
    hex400: "#fbbf24",
    shades: {
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706",
      700: "#b45309",
    },
  },
  blue: {
    id: "blue",
    label: "Electric blue",
    kind: "solid",
    hex400: "#60a5fa",
    shades: {
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
    },
  },
  sunset: {
    id: "sunset",
    label: "Sunset",
    kind: "gradient",
    hex400: "#fb8f6b",
    shades: {
      300: "#fdba9f",
      400: "#fb8f6b",
      500: "#f97350",
      600: "#ea5a35",
      700: "#c2410c",
    },
    gradient: { from: "#f97316", via: "#ec4899", to: "#8b5cf6" },
  },
  ocean: {
    id: "ocean",
    label: "Deep ocean",
    kind: "gradient",
    hex400: "#38bdf8",
    shades: {
      300: "#7dd3fc",
      400: "#38bdf8",
      500: "#0ea5e9",
      600: "#0284c7",
      700: "#0369a1",
    },
    gradient: { from: "#22d3ee", via: "#3b82f6", to: "#6366f1" },
  },
  aurora: {
    id: "aurora",
    label: "Aurora",
    kind: "gradient",
    hex400: "#2dd4bf",
    shades: {
      300: "#5eead4",
      400: "#2dd4bf",
      500: "#14b8a6",
      600: "#0d9488",
      700: "#0f766e",
    },
    gradient: { from: "#34d399", via: "#22d3ee", to: "#a78bfa" },
  },
  cotton: {
    id: "cotton",
    label: "Cotton candy",
    kind: "gradient",
    hex400: "#e879f9",
    shades: {
      300: "#f0abfc",
      400: "#e879f9",
      500: "#d946ef",
      600: "#c026d3",
      700: "#a21caf",
    },
    gradient: { from: "#f9a8d4", via: "#c4b5fd", to: "#93c5fd" },
  },
  inferno: {
    id: "inferno",
    label: "Inferno",
    kind: "gradient",
    hex400: "#fb923c",
    shades: {
      300: "#fdba74",
      400: "#fb923c",
      500: "#f97316",
      600: "#ea580c",
      700: "#c2410c",
    },
    gradient: { from: "#facc15", via: "#f97316", to: "#ef4444" },
  },
  emerald: {
    id: "emerald",
    label: "Emerald",
    kind: "gradient",
    hex400: "#4ade80",
    shades: {
      300: "#86efac",
      400: "#4ade80",
      500: "#22c55e",
      600: "#16a34a",
      700: "#15803d",
    },
    gradient: { from: "#a3e635", via: "#22c55e", to: "#0d9488" },
  },
  galaxy: {
    id: "galaxy",
    label: "Galaxy",
    kind: "gradient",
    hex400: "#818cf8",
    shades: {
      300: "#a5b4fc",
      400: "#818cf8",
      500: "#6366f1",
      600: "#4f46e5",
      700: "#4338ca",
    },
    gradient: { from: "#6366f1", via: "#8b5cf6", to: "#d946ef" },
  },
  rosegold: {
    id: "rosegold",
    label: "Rose gold",
    kind: "gradient",
    hex400: "#e9a397",
    shades: {
      300: "#f5c2b8",
      400: "#e9a397",
      500: "#d98a7b",
      600: "#c06f61",
      700: "#9f5347",
    },
    gradient: { from: "#fbd3c5", via: "#e8a598", to: "#b76e79" },
  },
  synthwave: {
    id: "synthwave",
    label: "Synthwave",
    kind: "gradient",
    hex400: "#c084fc",
    shades: {
      300: "#d8b4fe",
      400: "#c084fc",
      500: "#a855f7",
      600: "#9333ea",
      700: "#7e22ce",
    },
    gradient: { from: "#ff2e97", via: "#a855f7", to: "#00e5ff" },
  },
  crimson: {
    id: "crimson",
    label: "Crimson night",
    kind: "gradient",
    hex400: "#f87171",
    shades: {
      300: "#fca5a5",
      400: "#f87171",
      500: "#ef4444",
      600: "#dc2626",
      700: "#b91c1c",
    },
    gradient: { from: "#ef4444", via: "#be185d", to: "#6d28d9" },
  },
};

export const ACCENT_LIST: AccentTheme[] = ACCENT_IDS.map(
  (id) => ACCENT_THEMES[id],
);

export const SOLID_ACCENT_LIST: AccentTheme[] = ACCENT_LIST.filter(
  (t) => t.kind === "solid",
);

export const GRADIENT_ACCENT_LIST: AccentTheme[] = ACCENT_LIST.filter(
  (t) => t.kind === "gradient",
);

/**
 * A CSS `background` value for swatches and highlights: a linear-gradient for
 * gradient accents, or the plain hex400 color for solid ones.
 */
export function accentBackground(theme: AccentTheme, angle = 135): string {
  const g = theme.gradient;
  return g
    ? `linear-gradient(${angle}deg, ${g.from}, ${g.via}, ${g.to})`
    : theme.hex400;
}

export function isAccentId(value: unknown): value is AccentId {
  return (
    typeof value === "string" &&
    (ACCENT_IDS as readonly string[]).includes(value)
  );
}

/* ----------------------------------- rain ----------------------------------- */

export const RAIN_MODES = ["code", "hearts", "neon", "off"] as const;

export type RainMode = (typeof RAIN_MODES)[number];

export interface RainModeInfo {
  id: RainMode;
  label: string;
  description: string;
}

export const RAIN_MODE_LIST: RainModeInfo[] = [
  {
    id: "code",
    label: "Code rain",
    description: "Falling glyphs and hearts, matrix style.",
  },
  {
    id: "hearts",
    label: "Hearts",
    description: "Slow hearts drifting down the screen.",
  },
  {
    id: "neon",
    label: "Neon streaks",
    description: "Fast, slanted city rain.",
  },
  {
    id: "off",
    label: "Off",
    description: "No animation.",
  },
];

export function isRainMode(value: unknown): value is RainMode {
  return (
    typeof value === "string" &&
    (RAIN_MODES as readonly string[]).includes(value)
  );
}

/* --------------------------------- appearance -------------------------------- */

export interface Appearance {
  accent: AccentId;
  rainMode: RainMode;
  /** 1–100. How many drops are on screen. */
  rainDensity: number;
  /** 1–100. How fast drops fall. */
  rainSpeed: number;
  /** 10–100. Overall brightness of the rain layer. */
  rainOpacity: number;
  /** Soft neon glow on drops. Costs GPU, so it can be turned off. */
  glow: boolean;
}

export const DEFAULT_APPEARANCE: Appearance = {
  accent: "pink",
  rainMode: "code",
  rainDensity: 40,
  rainSpeed: 45,
  rainOpacity: 40,
  glow: true,
};

export const RANGE_LIMITS = {
  rainDensity: { min: 1, max: 100 },
  rainSpeed: { min: 1, max: 100 },
  rainOpacity: { min: 10, max: 100 },
} as const;

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Turns anything (localStorage JSON, a Convex row, a partial update) into a
 * fully valid Appearance. Unknown or out-of-range fields fall back to defaults,
 * so old saved data never breaks the UI when options change.
 */
export function normalizeAppearance(raw: unknown): Appearance {
  if (typeof raw !== "object" || raw === null) return DEFAULT_APPEARANCE;
  const r = raw as Record<string, unknown>;
  return {
    accent: isAccentId(r.accent) ? r.accent : DEFAULT_APPEARANCE.accent,
    rainMode: isRainMode(r.rainMode) ? r.rainMode : DEFAULT_APPEARANCE.rainMode,
    rainDensity: clampNumber(
      r.rainDensity,
      RANGE_LIMITS.rainDensity.min,
      RANGE_LIMITS.rainDensity.max,
      DEFAULT_APPEARANCE.rainDensity,
    ),
    rainSpeed: clampNumber(
      r.rainSpeed,
      RANGE_LIMITS.rainSpeed.min,
      RANGE_LIMITS.rainSpeed.max,
      DEFAULT_APPEARANCE.rainSpeed,
    ),
    rainOpacity: clampNumber(
      r.rainOpacity,
      RANGE_LIMITS.rainOpacity.min,
      RANGE_LIMITS.rainOpacity.max,
      DEFAULT_APPEARANCE.rainOpacity,
    ),
    glow: typeof r.glow === "boolean" ? r.glow : DEFAULT_APPEARANCE.glow,
  };
}

/** Append an alpha channel (0–1) to a #rrggbb color: alpha("#f472b6", 0.4) */
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.min(1, Math.max(0, a)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${v}`;
}
