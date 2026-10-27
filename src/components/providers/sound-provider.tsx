"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { playSound, unlockAudio, type SoundName } from "@/lib/client/sound";
import { safeStorage } from "@/lib/client/storage";
import { api } from "@/lib/client/api";

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
  play: (s: SoundName) => void;
  /** First visit: show a one-time hint next to the speaker. */
  showHint: boolean;
  dismissHint: () => void;
}

const SoundContext = createContext<SoundContextValue>({ enabled: false, toggle: () => {}, play: () => {}, showHint: false, dismissHint: () => {} });
const KEY = "jh_sound";
const HINT_KEY = "jh_sound_hint";

/**
 * Sounds are off by default. Turning them on is a click (which unlocks
 * WebAudio); the choice is remembered locally and in the user's prefs.
 */
export function SoundProvider({ initialMuted, children }: { initialMuted: boolean | null; children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (safeStorage.get(HINT_KEY) || safeStorage.get(KEY)) return;
    const t = setTimeout(() => setShowHint(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    safeStorage.set(HINT_KEY, "1");
  }, []);

  // Tiny tick on every button press while sounds are on.
  useEffect(() => {
    if (!enabled) return;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("button, [role=button], [role=menuitem], [role=tab], [role=radio], a[href]");
      if (el && !(el as HTMLButtonElement).disabled) playSound("click");
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [enabled]);

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
    setShowHint(false);
    safeStorage.set(HINT_KEY, "1");
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

  const value = useMemo(() => ({ enabled, toggle, play, showHint, dismissHint }), [enabled, toggle, play, showHint, dismissHint]);
  return <SoundContext value={value}>{children}</SoundContext>;
}

export const useSound = () => useContext(SoundContext);
