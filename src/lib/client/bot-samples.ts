"use client";

import { useSyncExternalStore } from "react";
import type { BotName, BotStatus } from "../types";

/**
 * Last N memory/CPU samples per bot, kept in memory for the tab's lifetime
 * (fed by live `bot` events), so sparklines survive page navigation.
 */
const N = 40;
const samples = new Map<BotName, { mem: number[]; cpu: number[] }>();
const listeners = new Set<() => void>();
let version = 0;

export function recordBotSample(b: BotStatus) {
  if (b.state !== "online" && b.state !== "degraded") return;
  const cur = samples.get(b.name) ?? { mem: [], cpu: [] };
  samples.set(b.name, { mem: [...cur.mem, b.memoryMb].slice(-N), cpu: [...cur.cpu, b.cpuPct].slice(-N) });
  version++;
  listeners.forEach((l) => l());
}

export function useBotSamples(name: BotName) {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
    () => 0,
  );
  return samples.get(name) ?? { mem: [], cpu: [] };
}
