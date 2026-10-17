"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import {
  ACCENT_THEMES,
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  type AccentTheme,
  type Appearance,
} from "@/lib/appearance";

const STORAGE_KEY = "spark-appearance";
const SAVE_DEBOUNCE_MS = 400;

interface AppearanceContextValue {
  appearance: Appearance;
  /** The active accent, with its color shades resolved. */
  theme: AccentTheme;
  update: (patch: Partial<Appearance>) => void;
  reset: () => void;
  isSaving: boolean;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

/* localStorage as an external store: no flash of the wrong color on reload,
   and no setState-inside-effect hydration dance. */
function subscribeStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getLocalSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function getServerSnapshot(): string {
  return "";
}

function parseStored(raw: string): Appearance {
  if (!raw) return DEFAULT_APPEARANCE;
  try {
    return normalizeAppearance(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function AppearanceProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { isSignedIn } = useUser();
  const currentUser = useQuery(api.user.getMe, isSignedIn ? {} : "skip");
  const saveAppearance = useMutation(api.user.setAppearance);

  const localRaw = useSyncExternalStore(
    subscribeStorage,
    getLocalSnapshot,
    getServerSnapshot,
  );
  const localAppearance = useMemo(() => parseStored(localRaw), [localRaw]);

  const remoteRaw = currentUser?.appearance;

  const remoteAppearance = useMemo(
    () => (remoteRaw ? normalizeAppearance(remoteRaw) : null),
    [remoteRaw],
  );

  // What the user just picked this session wins over stored values, so the UI
  // responds instantly without waiting for the network round-trip.
  const [override, setOverride] = useState<Appearance | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const appearance: Appearance =
    override ?? remoteAppearance ?? localAppearance;

  const latest = useRef<Appearance>(appearance);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latest.current = appearance;
    document.documentElement.dataset.accent = appearance.accent;
    document.documentElement.dataset.glow = appearance.glow ? "on" : "off";
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
    } catch {
      // Storage can be blocked (private mode). The Convex copy still works.
    }
  }, [appearance]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const persist = useCallback(
    (next: Appearance) => {
      if (!isSignedIn) return;
      setIsSaving(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      // Debounced so dragging a slider sends one write, not one per pixel.
      saveTimer.current = setTimeout(() => {
        saveAppearance({ appearance: next })
          .catch((error: unknown) => {
            console.error("[AppearanceProvider] failed to save", error);
          })
          .finally(() => setIsSaving(false));
      }, SAVE_DEBOUNCE_MS);
    },
    [isSignedIn, saveAppearance],
  );

  const update = useCallback(
    (patch: Partial<Appearance>) => {
      const next = normalizeAppearance({ ...latest.current, ...patch });
      latest.current = next;
      setOverride(next);
      persist(next);
    },
    [persist],
  );

  const reset = useCallback(() => {
    latest.current = DEFAULT_APPEARANCE;
    setOverride(DEFAULT_APPEARANCE);
    persist(DEFAULT_APPEARANCE);
  }, [persist]);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      appearance,
      theme: ACCENT_THEMES[appearance.accent],
      update,
      reset,
      isSaving,
    }),
    [appearance, update, reset, isSaving],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return ctx;
}
