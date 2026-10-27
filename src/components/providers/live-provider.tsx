"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LiveEvent, LiveEventType } from "@/lib/types";

type Listener = (e: LiveEvent) => void;
type Status = "connecting" | "live" | "reconnecting";

interface LiveContextValue {
  status: Status;
  subscribe: (l: Listener) => () => void;
}

const LiveContext = createContext<LiveContextValue | null>(null);

/** One EventSource per tab, fanned out to every component that listens. */
export function LiveProvider({ children }: { children: ReactNode }) {
  const listeners = useRef(new Set<Listener>());
  const [status, setStatus] = useState<Status>("connecting");

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onopen = () => setStatus("live");
    es.onerror = () => setStatus("reconnecting");
    es.onmessage = (msg) => {
      let event: LiveEvent;
      try {
        event = JSON.parse(msg.data) as LiveEvent;
      } catch {
        return;
      }
      for (const l of listeners.current) l(event);
    };
    es.addEventListener("session", () => {
      es.close();
      // Full reload on purpose: drop all client state of the expired session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login?error=expired");
    });
    return () => es.close();
  }, []);

  const subscribe = useCallback((l: Listener) => {
    listeners.current.add(l);
    return () => {
      listeners.current.delete(l);
    };
  }, []);
  const value = useMemo(() => ({ status, subscribe }), [status, subscribe]);

  return <LiveContext value={value}>{children}</LiveContext>;
}

export function useLiveStatus() {
  return useContext(LiveContext)?.status ?? "connecting";
}

/** Run `handler` for every live event of the given type(s). */
export function useLiveEvent<T extends LiveEventType>(types: T | T[], handler: (e: Extract<LiveEvent, { type: T }>) => void) {
  const subscribe = useContext(LiveContext)?.subscribe;
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  const key = Array.isArray(types) ? types.join(",") : types;
  useEffect(() => {
    if (!subscribe) return;
    const set = new Set(key.split(","));
    return subscribe((e) => {
      if (set.has(e.type)) ref.current(e as Extract<LiveEvent, { type: T }>);
    });
  }, [subscribe, key]);
}
