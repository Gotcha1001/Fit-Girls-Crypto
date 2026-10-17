// "use client";

// import { useState, type ReactNode } from "react";
// import {
//   Ban,
//   Binary,
//   Check,
//   CloudRain,
//   Heart,
//   Loader2,
//   RotateCcw,
// } from "lucide-react";
// import { ThemeToggle } from "@/app/components/ThemeToggle";
// import { useAppearance } from "@/app/context/AppearanceContext";

// import {
//   GRADIENT_ACCENT_LIST,
//   RAIN_MODE_LIST,
//   RANGE_LIMITS,
//   SOLID_ACCENT_LIST,
//   accentBackground,
//   alpha,
//   type AccentId,
//   type AccentTheme,
//   type RainMode,
// } from "@/lib/appearance";
// import { TokenPackages } from "../components/TokenPackages";

// const RAIN_ICONS: Record<RainMode, typeof Binary> = {
//   code: Binary,
//   hearts: Heart,
//   neon: CloudRain,
//   off: Ban,
// };

// interface CardProps {
//   title: string;
//   description: string;
//   hex: string;
//   action?: ReactNode;
//   children: ReactNode;
// }

// function Card({
//   title,
//   description,
//   hex,
//   action,
//   children,
// }: CardProps): React.JSX.Element {
//   return (
//     <section
//       className="rounded-xl border bg-white p-6 dark:bg-[#04070a]"
//       style={{
//         borderColor: alpha(hex, 0.2),
//         boxShadow: `0 0 24px -10px ${alpha(hex, 0.35)}`,
//       }}
//     >
//       <div className="mb-1 flex items-center justify-between gap-3">
//         <h2 className="text-sm font-semibold text-slate-900 dark:text-stone-50">
//           {title}
//         </h2>
//         {action}
//       </div>
//       <p className="mb-4 text-sm text-slate-500 dark:text-stone-400">
//         {description}
//       </p>
//       {children}
//     </section>
//   );
// }

// interface RangeRowProps {
//   id: string;
//   label: string;
//   value: number;
//   min: number;
//   max: number;
//   hex: string;
//   disabled: boolean;
//   onChange: (value: number) => void;
// }

// function RangeRow({
//   id,
//   label,
//   value,
//   min,
//   max,
//   hex,
//   disabled,
//   onChange,
// }: RangeRowProps): React.JSX.Element {
//   return (
//     <div className={disabled ? "opacity-40" : undefined}>
//       <div className="mb-1.5 flex items-center justify-between text-sm">
//         <label htmlFor={id} className="text-slate-700 dark:text-stone-300">
//           {label}
//         </label>
//         <span className="font-mono text-xs tabular-nums" style={{ color: hex }}>
//           {value}
//         </span>
//       </div>
//       <input
//         id={id}
//         type="range"
//         min={min}
//         max={max}
//         value={value}
//         disabled={disabled}
//         onChange={(e) => onChange(Number(e.target.value))}
//         className="h-2 w-full cursor-pointer disabled:cursor-not-allowed"
//         style={{ accentColor: hex }}
//       />
//     </div>
//   );
// }

// interface AccentGridProps {
//   label: string;
//   swatches: AccentTheme[];
//   selected: AccentId;
//   hovered: AccentId | null;
//   onHover: (id: AccentId | null) => void;
//   onSelect: (id: AccentId) => void;
//   columns: string;
// }

// function AccentGrid({
//   label,
//   swatches,
//   selected,
//   hovered,
//   onHover,
//   onSelect,
//   columns,
// }: AccentGridProps): React.JSX.Element {
//   return (
//     <div
//       role="radiogroup"
//       aria-label={label}
//       className={`grid gap-3 ${columns}`}
//     >
//       {swatches.map((swatch) => {
//         const isSelected = selected === swatch.id;
//         const isHovered = hovered === swatch.id;
//         const isGradient = swatch.kind === "gradient";
//         return (
//           <button
//             key={swatch.id}
//             type="button"
//             role="radio"
//             aria-checked={isSelected}
//             onClick={() => onSelect(swatch.id)}
//             onMouseEnter={() => onHover(swatch.id)}
//             onMouseLeave={() => onHover(null)}
//             className="flex flex-col items-center gap-2 rounded-lg border p-3 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
//             style={{
//               borderColor: isSelected
//                 ? alpha(swatch.hex400, 0.5)
//                 : isHovered
//                   ? alpha(swatch.hex400, 0.25)
//                   : "transparent",
//               backgroundColor: isSelected
//                 ? alpha(swatch.hex400, 0.08)
//                 : undefined,
//               boxShadow: isSelected
//                 ? `0 0 20px -4px ${alpha(swatch.hex400, 0.5)}`
//                 : undefined,
//               outlineColor: swatch.hex400,
//             }}
//           >
//             <span
//               className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10"
//               style={{
//                 background: accentBackground(swatch),
//                 boxShadow:
//                   isSelected || isHovered
//                     ? `0 0 14px 2px ${alpha(swatch.hex400, isSelected ? 0.65 : 0.45)}`
//                     : "inset 0 1px 2px rgba(0,0,0,0.3)",
//               }}
//             >
//               {isSelected && (
//                 <Check
//                   className={
//                     isGradient
//                       ? "h-4 w-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]"
//                       : "h-4 w-4 text-black/70"
//                   }
//                   strokeWidth={3}
//                 />
//               )}
//             </span>
//             <span
//               className="text-center text-[11px] font-medium leading-tight text-slate-600 dark:text-stone-300"
//               style={{
//                 color: isSelected || isHovered ? swatch.hex400 : undefined,
//               }}
//             >
//               {swatch.label}
//             </span>
//           </button>
//         );
//       })}
//     </div>
//   );
// }

// export default function SettingsPage(): React.JSX.Element {
//   const { appearance, theme, update, reset, isSaving } = useAppearance();
//   const { hex400 } = theme;
//   const [hoveredAccent, setHoveredAccent] = useState<AccentId | null>(null);
//   const rainOff = appearance.rainMode === "off";

//   return (
//     <div className="relative mx-auto flex max-w-2xl flex-col gap-6">
//       <div className="flex items-start justify-between gap-4">
//         <div>
//           <h1
//             className="accent-gradient-text text-2xl font-black tracking-tight"
//             style={{ filter: `drop-shadow(0 0 16px ${alpha(hex400, 0.4)})` }}
//           >
//             Settings
//           </h1>
//           <p className="text-sm text-slate-500 dark:text-stone-400">
//             Change how Spark looks. Changes apply right away.
//           </p>
//         </div>
//         <div className="flex items-center gap-3">
//           {isSaving && (
//             <span className="flex items-center gap-1.5 text-xs text-stone-500">
//               <Loader2 className="h-3 w-3 animate-spin" />
//               Saving
//             </span>
//           )}
//           <button
//             type="button"
//             onClick={reset}
//             className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-stone-300 dark:hover:text-white"
//             style={{ borderColor: alpha(hex400, 0.3) }}
//           >
//             <RotateCcw className="h-3.5 w-3.5" />
//             Reset to defaults
//           </button>
//         </div>
//       </div>

//       {/* Buy tokens */}
//       <div id="tokens" className="scroll-mt-6">
//         <Card
//           title="Buy tokens"
//           description="Tokens are used for gifts and video calls. Pick a package and pay securely with PayFast."
//           hex={hex400}
//         >
//           <TokenPackages />
//         </Card>
//       </div>

//       {/* Accent color */}
//       <Card
//         title="Accent color"
//         description="Used for highlights, glow, the sidebar and the rain across the whole app. Gradients tint the sidebar and rain with several colors."
//         hex={hex400}
//       >
//         <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
//           Solid
//         </p>
//         <AccentGrid
//           label="Solid accent colors"
//           swatches={SOLID_ACCENT_LIST}
//           selected={appearance.accent}
//           hovered={hoveredAccent}
//           onHover={setHoveredAccent}
//           onSelect={(accent) => update({ accent })}
//           columns="grid-cols-3 sm:grid-cols-6"
//         />

//         <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
//           Gradients
//         </p>
//         <AccentGrid
//           label="Gradient accent colors"
//           swatches={GRADIENT_ACCENT_LIST}
//           selected={appearance.accent}
//           hovered={hoveredAccent}
//           onHover={setHoveredAccent}
//           onSelect={(accent) => update({ accent })}
//           columns="grid-cols-3 sm:grid-cols-5"
//         />
//       </Card>

//       {/* Rain */}
//       <Card
//         title="Rain"
//         description="An animated layer that falls over every page."
//         hex={hex400}
//       >
//         <div
//           role="radiogroup"
//           aria-label="Rain style"
//           className="grid grid-cols-2 gap-3 sm:grid-cols-4"
//         >
//           {RAIN_MODE_LIST.map((mode) => {
//             const Icon = RAIN_ICONS[mode.id];
//             const isSelected = appearance.rainMode === mode.id;
//             return (
//               <button
//                 key={mode.id}
//                 type="button"
//                 role="radio"
//                 aria-checked={isSelected}
//                 onClick={() => update({ rainMode: mode.id })}
//                 className="flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
//                 style={{
//                   borderColor: isSelected
//                     ? alpha(hex400, 0.5)
//                     : alpha(hex400, 0.12),
//                   backgroundColor: isSelected ? alpha(hex400, 0.08) : undefined,
//                   boxShadow: isSelected
//                     ? `0 0 20px -6px ${alpha(hex400, 0.55)}`
//                     : undefined,
//                   outlineColor: hex400,
//                 }}
//               >
//                 <Icon
//                   className="h-5 w-5"
//                   style={{ color: isSelected ? hex400 : undefined }}
//                 />
//                 <span
//                   className="text-sm font-medium text-slate-800 dark:text-stone-100"
//                   style={{ color: isSelected ? hex400 : undefined }}
//                 >
//                   {mode.label}
//                 </span>
//                 <span className="text-xs leading-snug text-slate-500 dark:text-stone-400">
//                   {mode.description}
//                 </span>
//               </button>
//             );
//           })}
//         </div>

//         <div className="mt-6 flex flex-col gap-5">
//           <RangeRow
//             id="rain-density"
//             label="Density"
//             value={appearance.rainDensity}
//             min={RANGE_LIMITS.rainDensity.min}
//             max={RANGE_LIMITS.rainDensity.max}
//             hex={hex400}
//             disabled={rainOff}
//             onChange={(rainDensity) => update({ rainDensity })}
//           />
//           <RangeRow
//             id="rain-speed"
//             label="Speed"
//             value={appearance.rainSpeed}
//             min={RANGE_LIMITS.rainSpeed.min}
//             max={RANGE_LIMITS.rainSpeed.max}
//             hex={hex400}
//             disabled={rainOff}
//             onChange={(rainSpeed) => update({ rainSpeed })}
//           />
//           <RangeRow
//             id="rain-opacity"
//             label="Brightness"
//             value={appearance.rainOpacity}
//             min={RANGE_LIMITS.rainOpacity.min}
//             max={RANGE_LIMITS.rainOpacity.max}
//             hex={hex400}
//             disabled={rainOff}
//             onChange={(rainOpacity) => update({ rainOpacity })}
//           />

//           <div
//             className={`flex items-center justify-between gap-4 ${rainOff ? "opacity-40" : ""}`}
//           >
//             <div>
//               <p
//                 id="glow-label"
//                 className="text-sm text-slate-700 dark:text-stone-300"
//               >
//                 Neon glow
//               </p>
//               <p className="text-xs text-slate-500 dark:text-stone-400">
//                 Adds a soft glow to each drop. Turn it off if the app feels
//                 slow.
//               </p>
//             </div>
//             <button
//               type="button"
//               role="switch"
//               aria-checked={appearance.glow}
//               aria-labelledby="glow-label"
//               disabled={rainOff}
//               onClick={() => update({ glow: !appearance.glow })}
//               className="relative h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed"
//               style={{
//                 borderColor: alpha(hex400, 0.5),
//                 backgroundColor: appearance.glow
//                   ? alpha(hex400, 0.35)
//                   : "transparent",
//                 outlineColor: hex400,
//               }}
//             >
//               <span
//                 className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
//                 style={{
//                   left: appearance.glow ? "1.5rem" : "0.125rem",
//                   backgroundColor: hex400,
//                   boxShadow: appearance.glow
//                     ? `0 0 10px 2px ${alpha(hex400, 0.6)}`
//                     : undefined,
//                 }}
//               />
//             </button>
//           </div>
//         </div>
//       </Card>

//       {/* Light / dark */}
//       <Card
//         title="Appearance"
//         description="Switch between light and dark mode."
//         hex={hex400}
//       >
//         <ThemeToggle />
//       </Card>
//     </div>
//   );
// }

"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import {
  Ban,
  Binary,
  Check,
  CloudRain,
  Heart,
  Loader2,
  RotateCcw,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { useAppearance } from "@/app/context/AppearanceContext";
import {
  GRADIENT_ACCENT_LIST,
  RAIN_MODE_LIST,
  RANGE_LIMITS,
  SOLID_ACCENT_LIST,
  accentBackground,
  alpha,
  type AccentId,
  type AccentTheme,
  type RainMode,
} from "@/lib/appearance";

import { TokenPackages } from "../components/TokenPackages";

const RAIN_ICONS: Record<RainMode, typeof Binary> = {
  code: Binary,
  hearts: Heart,
  neon: CloudRain,
  off: Ban,
};

interface CardProps {
  title: string;
  description: string;
  hex: string;
  action?: ReactNode;
  children: ReactNode;
}

function Card({
  title,
  description,
  hex,
  action,
  children,
}: CardProps): React.JSX.Element {
  return (
    <section
      className="rounded-xl border bg-white p-6 dark:bg-[#04070a]"
      style={{
        borderColor: alpha(hex, 0.2),
        boxShadow: `0 0 24px -10px ${alpha(hex, 0.35)}`,
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-stone-50">
          {title}
        </h2>
        {action}
      </div>
      <p className="mb-4 text-sm text-slate-500 dark:text-stone-400">
        {description}
      </p>
      {children}
    </section>
  );
}

interface RangeRowProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  hex: string;
  disabled: boolean;
  onChange: (value: number) => void;
}

function RangeRow({
  id,
  label,
  value,
  min,
  max,
  hex,
  disabled,
  onChange,
}: RangeRowProps): React.JSX.Element {
  return (
    <div className={disabled ? "opacity-40" : undefined}>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <label htmlFor={id} className="text-slate-700 dark:text-stone-300">
          {label}
        </label>
        <span className="font-mono text-xs tabular-nums" style={{ color: hex }}>
          {value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer disabled:cursor-not-allowed"
        style={{ accentColor: hex }}
      />
    </div>
  );
}

interface AccentGridProps {
  label: string;
  swatches: AccentTheme[];
  selected: AccentId;
  hovered: AccentId | null;
  onHover: (id: AccentId | null) => void;
  onSelect: (id: AccentId) => void;
  columns: string;
}

function AccentGrid({
  label,
  swatches,
  selected,
  hovered,
  onHover,
  onSelect,
  columns,
}: AccentGridProps): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid gap-3 ${columns}`}
    >
      {swatches.map((swatch) => {
        const isSelected = selected === swatch.id;
        const isHovered = hovered === swatch.id;
        const isGradient = swatch.kind === "gradient";
        return (
          <button
            key={swatch.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(swatch.id)}
            onMouseEnter={() => onHover(swatch.id)}
            onMouseLeave={() => onHover(null)}
            className="flex flex-col items-center gap-2 rounded-lg border p-3 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              borderColor: isSelected
                ? alpha(swatch.hex400, 0.5)
                : isHovered
                  ? alpha(swatch.hex400, 0.25)
                  : "transparent",
              backgroundColor: isSelected
                ? alpha(swatch.hex400, 0.08)
                : undefined,
              boxShadow: isSelected
                ? `0 0 20px -4px ${alpha(swatch.hex400, 0.5)}`
                : undefined,
              outlineColor: swatch.hex400,
            }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10"
              style={{
                background: accentBackground(swatch),
                boxShadow:
                  isSelected || isHovered
                    ? `0 0 14px 2px ${alpha(swatch.hex400, isSelected ? 0.65 : 0.45)}`
                    : "inset 0 1px 2px rgba(0,0,0,0.3)",
              }}
            >
              {isSelected && (
                <Check
                  className={
                    isGradient
                      ? "h-4 w-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]"
                      : "h-4 w-4 text-black/70"
                  }
                  strokeWidth={3}
                />
              )}
            </span>
            <span
              className="text-center text-[11px] font-medium leading-tight text-slate-600 dark:text-stone-300"
              style={{
                color: isSelected || isHovered ? swatch.hex400 : undefined,
              }}
            >
              {swatch.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsPage(): React.JSX.Element {
  const { appearance, theme, update, reset, isSaving } = useAppearance();
  const { hex400 } = theme;
  const [hoveredAccent, setHoveredAccent] = useState<AccentId | null>(null);
  const rainOff = appearance.rainMode === "off";

  // Tokens are for clients only. Girls (applicants and approved hosts) and
  // admins never see the card. While `me` is still loading we show nothing,
  // so the card doesn't flash up for a girl and then disappear.
  const me = useQuery(api.user.getMe);
  const isClient = me?.role === "user" && me.onboardingChoice === "client";

  return (
    <div className="relative mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="accent-gradient-text text-2xl font-black tracking-tight"
            style={{ filter: `drop-shadow(0 0 16px ${alpha(hex400, 0.4)})` }}
          >
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-stone-400">
            Change how Spark looks. Changes apply right away.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="flex items-center gap-1.5 text-xs text-stone-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving
            </span>
          )}
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-stone-300 dark:hover:text-white"
            style={{ borderColor: alpha(hex400, 0.3) }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </button>
        </div>
      </div>

      {/* Buy tokens: clients only */}
      {isClient && (
        <div id="tokens" className="scroll-mt-6">
          <Card
            title="Buy tokens"
            description="Tokens are used for gifts and video calls. Pick a package and pay securely with PayFast."
            hex={hex400}
          >
            <TokenPackages />
          </Card>
        </div>
      )}

      {/* Accent color */}
      <Card
        title="Accent color"
        description="Used for highlights, glow, the sidebar and the rain across the whole app. Gradients tint the sidebar and rain with several colors."
        hex={hex400}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
          Solid
        </p>
        <AccentGrid
          label="Solid accent colors"
          swatches={SOLID_ACCENT_LIST}
          selected={appearance.accent}
          hovered={hoveredAccent}
          onHover={setHoveredAccent}
          onSelect={(accent) => update({ accent })}
          columns="grid-cols-3 sm:grid-cols-6"
        />

        <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
          Gradients
        </p>
        <AccentGrid
          label="Gradient accent colors"
          swatches={GRADIENT_ACCENT_LIST}
          selected={appearance.accent}
          hovered={hoveredAccent}
          onHover={setHoveredAccent}
          onSelect={(accent) => update({ accent })}
          columns="grid-cols-3 sm:grid-cols-5"
        />
      </Card>

      {/* Rain */}
      <Card
        title="Rain"
        description="An animated layer that falls over every page."
        hex={hex400}
      >
        <div
          role="radiogroup"
          aria-label="Rain style"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {RAIN_MODE_LIST.map((mode) => {
            const Icon = RAIN_ICONS[mode.id];
            const isSelected = appearance.rainMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => update({ rainMode: mode.id })}
                className="flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  borderColor: isSelected
                    ? alpha(hex400, 0.5)
                    : alpha(hex400, 0.12),
                  backgroundColor: isSelected ? alpha(hex400, 0.08) : undefined,
                  boxShadow: isSelected
                    ? `0 0 20px -6px ${alpha(hex400, 0.55)}`
                    : undefined,
                  outlineColor: hex400,
                }}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: isSelected ? hex400 : undefined }}
                />
                <span
                  className="text-sm font-medium text-slate-800 dark:text-stone-100"
                  style={{ color: isSelected ? hex400 : undefined }}
                >
                  {mode.label}
                </span>
                <span className="text-xs leading-snug text-slate-500 dark:text-stone-400">
                  {mode.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-5">
          <RangeRow
            id="rain-density"
            label="Density"
            value={appearance.rainDensity}
            min={RANGE_LIMITS.rainDensity.min}
            max={RANGE_LIMITS.rainDensity.max}
            hex={hex400}
            disabled={rainOff}
            onChange={(rainDensity) => update({ rainDensity })}
          />
          <RangeRow
            id="rain-speed"
            label="Speed"
            value={appearance.rainSpeed}
            min={RANGE_LIMITS.rainSpeed.min}
            max={RANGE_LIMITS.rainSpeed.max}
            hex={hex400}
            disabled={rainOff}
            onChange={(rainSpeed) => update({ rainSpeed })}
          />
          <RangeRow
            id="rain-opacity"
            label="Brightness"
            value={appearance.rainOpacity}
            min={RANGE_LIMITS.rainOpacity.min}
            max={RANGE_LIMITS.rainOpacity.max}
            hex={hex400}
            disabled={rainOff}
            onChange={(rainOpacity) => update({ rainOpacity })}
          />

          <div
            className={`flex items-center justify-between gap-4 ${rainOff ? "opacity-40" : ""}`}
          >
            <div>
              <p
                id="glow-label"
                className="text-sm text-slate-700 dark:text-stone-300"
              >
                Neon glow
              </p>
              <p className="text-xs text-slate-500 dark:text-stone-400">
                Adds a soft glow to each drop. Turn it off if the app feels
                slow.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={appearance.glow}
              aria-labelledby="glow-label"
              disabled={rainOff}
              onClick={() => update({ glow: !appearance.glow })}
              className="relative h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed"
              style={{
                borderColor: alpha(hex400, 0.5),
                backgroundColor: appearance.glow
                  ? alpha(hex400, 0.35)
                  : "transparent",
                outlineColor: hex400,
              }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
                style={{
                  left: appearance.glow ? "1.5rem" : "0.125rem",
                  backgroundColor: hex400,
                  boxShadow: appearance.glow
                    ? `0 0 10px 2px ${alpha(hex400, 0.6)}`
                    : undefined,
                }}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Light / dark */}
      <Card
        title="Appearance"
        description="Switch between light and dark mode."
        hex={hex400}
      >
        <ThemeToggle />
      </Card>
    </div>
  );
}
