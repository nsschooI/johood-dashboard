"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { playSound, unlockAudio, type SoundName } from "@/lib/client/sound";
import { safeStorage } from "@/lib/client/storage";
import { api } from "@/lib/client/api";

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
  play: (s: SoundName) => void;
}

const SoundContext = createContext<SoundContextValue>({ enabled: false, toggle: () => {}, play: () => {} });
const KEY = "jh_sound";

/**
 * Sounds are off by default. Turning them on is a click (which unlocks
 * WebAudio); the choice is remembered locally and in the user's prefs.
 */
export function SoundProvider({ initialMuted, children }: { initialMuted: boolean | null; children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = safeStorage.get(KEY);
    const on = stored !== null ? stored === "on" : initialMuted === false;
    if (!on) return;
    // Browsers only allow audio after a gesture: arm on the first interaction.
    const arm = () => {
      unlockAudio();
      setEnabled(true);
    };
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [initialMuted]);

  const toggle = useCallback(() => {
    setEnabled((cur) => {
      const next = !cur;
      if (next) {
        unlockAudio();
        playSound("success");
      }
      safeStorage.set(KEY, next ? "on" : "off");
      void api("/api/prefs", { method: "POST", body: { muted: !next } }).catch(() => {});
      return next;
    });
  }, []);

  const play = useCallback((s: SoundName) => {
    if (enabled) playSound(s);
  }, [enabled]);

  const value = useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play]);
  return <SoundContext value={value}>{children}</SoundContext>;
}

export const useSound = () => useContext(SoundContext);
