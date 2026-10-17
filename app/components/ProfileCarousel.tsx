"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProfilePhoto } from "@/convex/profiles";

interface ProfileCarouselProps {
  photos: ProfilePhoto[];
  /** Person's display name, used for alt text. */
  alt: string;
  /** Time each photo stays on screen. */
  intervalMs?: number;
  /** Optional element pinned to the top-left (e.g. the online indicator). */
  badge?: React.ReactNode;
}

const SWIPE_THRESHOLD_PX = 40;

export function ProfileCarousel({
  photos,
  alt,
  intervalMs = 4000,
  badge,
}: ProfileCarouselProps): React.JSX.Element {
  const count: number = photos.length;
  const [index, setIndex] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const touchStartX = useRef<number | null>(null);

  // If photos were removed while viewing, never point past the end.
  const safeIndex: number = count === 0 ? 0 : Math.min(index, count - 1);

  const goTo = useCallback(
    (next: number): void => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count); // wraps both directions
    },
    [count],
  );

  // Auto-advance. Restarts after any manual navigation so a click never
  // gets immediately overridden. Skipped for reduced-motion users.
  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setIndex((current: number): number => (current + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [count, paused, intervalMs, index]);

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>): void {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    setPaused(true);
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>): void {
    const startX: number | null = touchStartX.current;
    const endX: number | undefined = e.changedTouches[0]?.clientX;
    touchStartX.current = null;
    setPaused(false);
    if (startX === null || endX === undefined) return;

    const delta: number = endX - startX;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    goTo(delta < 0 ? safeIndex + 1 : safeIndex - 1);
  }

  if (count === 0) {
    return (
      <div className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-2xl border bg-gray-100 dark:bg-gray-800 accent-card">
        💫
        {badge && <div className="absolute left-3 top-3 z-10">{badge}</div>}
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`${alt} photos`}
      className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-2xl border bg-gray-100 dark:bg-gray-800 accent-card"
      onMouseEnter={(): void => setPaused(true)}
      onMouseLeave={(): void => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sliding track */}
      <div
        className="flex h-full transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${safeIndex * 100}%)` }}
      >
        {photos.map((photo: ProfilePhoto, i: number) => (
          <div
            key={photo.publicId}
            className="h-full w-full shrink-0"
            aria-hidden={i !== safeIndex}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={`${alt}, photo ${i + 1} of ${count}`}
              className="h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {badge && <div className="absolute left-3 top-3 z-10">{badge}</div>}

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(): void => goTo(safeIndex - 1)}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur hover:bg-black/60"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(): void => goTo(safeIndex + 1)}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur hover:bg-black/60"
          >
            <ChevronRight size={18} />
          </button>

          {/* Dots */}
          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
            {photos.map((photo: ProfilePhoto, i: number) => (
              <button
                key={photo.publicId}
                type="button"
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === safeIndex}
                onClick={(): void => goTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === safeIndex ? "w-5 bg-white" : "w-2 bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
