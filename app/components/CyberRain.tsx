"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useAppearance } from "@/app/context/AppearanceContext";
import type { RainMode } from "@/lib/appearance";

interface Drop {
  x: number;
  y: number;
  /** Pixels per second before the user's speed setting is applied. */
  speed: number;
  /** Trail length in glyphs (code), or pixels (neon). Hearts use 1. */
  length: number;
  /** Font size in px (code, hearts) or line width (neon). */
  size: number;
  glyphs: string[];
  /** Hearts sway sideways; this offsets each heart's sine wave. */
  phase: number;
  /** Index into the rain palette (gradient accents use several colors). */
  tone: number;
}

const CODE_GLYPHS: string[] = "01♥♡✦◇SPARK".split("");
const HEART_GLYPHS: string[] = ["♥", "♡"];
const NEON_SLANT = 0.14; // horizontal px per vertical px

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)] ?? "0";
}

function trailPixels(drop: Drop, mode: RainMode): number {
  return mode === "code" ? drop.length * drop.size : drop.length;
}

function createDrop(
  mode: RainMode,
  width: number,
  height: number,
  scatter: boolean,
  paletteSize: number,
): Drop {
  const tone = Math.floor(Math.random() * paletteSize);
  // scatter = true fills the whole screen on first paint; false starts drops
  // just above the top edge so they enter naturally.
  const startY = (trail: number): number =>
    scatter ? rand(-trail, height) : -rand(0, height * 0.4) - trail;

  if (mode === "code") {
    const size = 14;
    const length = Math.floor(rand(8, 18));
    return {
      x: Math.floor(rand(0, width) / size) * size,
      y: startY(length * size),
      speed: rand(70, 150),
      length,
      size,
      glyphs: Array.from({ length }, () => pick(CODE_GLYPHS)),
      phase: 0,
      tone,
    };
  }

  if (mode === "hearts") {
    const size = rand(10, 22);
    return {
      x: rand(0, width),
      y: startY(size),
      speed: rand(28, 70),
      length: 1,
      size,
      glyphs: [pick(HEART_GLYPHS)],
      phase: rand(0, Math.PI * 2),
      tone,
    };
  }

  const length = rand(40, 120);
  return {
    x: rand(-height * NEON_SLANT, width),
    y: startY(length),
    speed: rand(520, 900),
    length,
    size: rand(1, 2),
    glyphs: [],
    phase: 0,
    tone,
  };
}

/** Roughly one drop per 1000px of width at density 1, scaling up from there. */
function dropCount(width: number, density: number): number {
  const count = Math.round((width / 1000) * (8 + density * 0.9));
  return Math.min(160, Math.max(6, count));
}

/**
 * Click-through rain layer that fills its nearest `relative` parent.
 * Mount it inside the page-content wrapper, not over the sidebar.
 * Reads mode/density/speed/brightness/glow from the Appearance context and
 * tints everything with the chosen accent color.
 */
export function CyberRain(): React.JSX.Element | null {
  const { appearance, theme } = useAppearance();
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { rainMode, rainDensity, rainSpeed, glow } = appearance;
  const isDark = resolvedTheme !== "light";
  // Light mode needs darker shades or the rain disappears against white.
  const mainColor = isDark ? theme.shades[400] : theme.shades[600];
  const headColor = isDark ? theme.shades[300] : theme.shades[700];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rainMode === "off") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect the OS "reduce motion" setting: draw nothing.
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    const speedMultiplier = 0.4 + (rainSpeed / 100) * 2.2;

    // Gradient accents rain in all three gradient colors (dark mode only:
    // pastel stops would vanish on a white page, so light mode stays solid).
    const palette: string[] =
      isDark && theme.gradient
        ? [theme.gradient.from, theme.gradient.via, theme.gradient.to]
        : [mainColor];
    let width = 0;
    let height = 0;
    let drops: Drop[] = [];
    let frame = 0;
    let last = performance.now();

    const seed = (scatter: boolean): void => {
      drops = Array.from({ length: dropCount(width, rainDensity) }, () =>
        createDrop(rainMode, width, height, scatter, palette.length),
      );
    };

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Size to the canvas' own box (the page area), not the whole window,
      // so the rain never spills over the sidebar.
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(true);
    };

    const drawCode = (drop: Drop, color: string): void => {
      ctx.font = `${drop.size}px var(--font-geist-mono), ui-monospace, monospace`;
      ctx.textBaseline = "top";
      for (let i = 0; i < drop.length; i++) {
        const y = drop.y - i * drop.size;
        if (y < -drop.size || y > height) continue;
        ctx.globalAlpha = i === 0 ? 1 : Math.max(0, 1 - i / drop.length) * 0.8;
        ctx.fillStyle = i === 0 ? headColor : color;
        ctx.fillText(drop.glyphs[i] ?? "0", drop.x, y);
      }
      // Occasionally swap a glyph so the trail shimmers as it falls.
      if (Math.random() < 0.06) {
        drop.glyphs[Math.floor(Math.random() * drop.length)] =
          pick(CODE_GLYPHS);
      }
    };

    const drawHeart = (drop: Drop, time: number, color: string): void => {
      const sway = Math.sin(time / 1400 + drop.phase) * 14;
      ctx.font = `${drop.size}px sans-serif`;
      ctx.textBaseline = "top";
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = color;
      ctx.fillText(drop.glyphs[0] ?? "♥", drop.x + sway, drop.y);
    };

    const drawNeon = (drop: Drop, color: string): void => {
      const tailX = drop.x - drop.length * NEON_SLANT;
      const tailY = drop.y - drop.length;
      const gradient = ctx.createLinearGradient(tailX, tailY, drop.x, drop.y);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, color);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = drop.size;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(drop.x, drop.y);
      ctx.stroke();
    };

    const tick = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      ctx.clearRect(0, 0, width, height);
      ctx.shadowBlur = glow ? 8 : 0;

      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        if (!drop) continue;

        drop.y += drop.speed * speedMultiplier * dt;
        if (rainMode === "neon")
          drop.x += drop.speed * speedMultiplier * dt * NEON_SLANT;

        if (drop.y - trailPixels(drop, rainMode) > height) {
          drops[i] = createDrop(rainMode, width, height, false, palette.length);
          continue;
        }

        const color = palette[drop.tone % palette.length] ?? mainColor;
        ctx.shadowColor = color;

        if (rainMode === "code") drawCode(drop, color);
        else if (rainMode === "hearts") drawHeart(drop, now, color);
        else drawNeon(drop, color);
      }

      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(tick);
    };

    // ResizeObserver also fires when the sidebar opens/closes, which a plain
    // window "resize" listener would miss. It fires once on observe(), so no
    // separate initial resize() call is needed.
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      ctx.clearRect(0, 0, width, height);
    };
  }, [
    rainMode,
    rainDensity,
    rainSpeed,
    glow,
    mainColor,
    headColor,
    isDark,
    theme,
  ]);

  if (rainMode === "off") return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
      style={{ opacity: appearance.rainOpacity / 100 }}
    />
  );
}
