"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { playSound, unlockAudio, type SoundName } from "@/lib/client/sound";
import { safeStorage } from "@/lib/client/storage";
import type { PublicMember } from "@/lib/giveaways/types";

export type GwTheme = "light" | "dark" | "system";
export interface Banners {
  active: string | null;
  ended: string | null;
}

interface GwContextValue {
  member: PublicMember | null;
  csrf: string;
  banners: Banners;
  theme: GwTheme;
  setTheme: (t: GwTheme) => void;
  sound: boolean;
  toggleSound: () => void;
  play: (s: SoundName) => void;
}

const GwContext = createContext<GwContextValue | null>(null);
const SOUND_KEY = "jh_gw_sound";

/**
 * Public-area state: the signed-in member (never staff), their CSRF token,
 * the theme (cookie, so the server paints the right colours) and sounds
 * (localStorage, off until switched on).
 */
export function GwProvider({
  member,
  csrf,
  banners,
  initialTheme,
  children,
}: {
  member: PublicMember | null;
  csrf: string;
  banners: Banners;
  initialTheme: GwTheme;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState(initialTheme);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    if (safeStorage.get(SOUND_KEY) !== "on") return;
    // Audio may only start after a gesture: arm on the first interaction.
    const arm = () => {
      unlockAudio();
      setSound(true);
    };
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);

  const setTheme = useCallback((t: GwTheme) => {
    setThemeState(t);
    document.cookie = `jh_gw_theme=${t}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const toggleSound = useCallback(() => {
    setSound((cur) => {
      const next = !cur;
      safeStorage.set(SOUND_KEY, next ? "on" : "off");
      if (next) {
        unlockAudio();
        playSound("tick");
      }
      return next;
    });
  }, []);

  const play = useCallback((s: SoundName) => {
    if (sound) playSound(s);
  }, [sound]);

  const value = useMemo(
    () => ({ member, csrf, banners, theme, setTheme, sound, toggleSound, play }),
    [member, csrf, banners, theme, setTheme, sound, toggleSound, play],
  );
  return (
    <GwContext value={value}>
      <div className="gw-root relative isolate flex min-h-dvh flex-col overflow-x-clip text-ink" data-theme={theme}>
        {children}
      </div>
    </GwContext>
  );
}

export function useGw() {
  const ctx = useContext(GwContext);
  if (!ctx) throw new Error("useGw must be used inside GwProvider");
  return ctx;
}
