"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";
const THEMES: Theme[] = ["system", "light", "dark"];

function read(): Theme {
  const v = document.documentElement.dataset.theme;
  return v === "light" || v === "dark" ? v : "system";
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Staff theme: lives on <html data-theme> and in the `jh_theme` cookie (server paints it). */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  const setTheme = useCallback((t: Theme) => {
    document.documentElement.dataset.theme = t;
    document.cookie = `jh_theme=${t}; path=/; max-age=31536000; samesite=lax`;
    listeners.forEach((l) => l());
  }, []);
  const cycle = useCallback(() => setTheme(THEMES[(THEMES.indexOf(read()) + 1) % THEMES.length]), [setTheme]);
  return { theme, setTheme, cycle };
}
