"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

export class GwError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/**
 * fetch for the public giveaways API: JSON in/out and the member's CSRF
 * token on POSTs. Unlike the staff `api()`, a 401 never redirects — the page
 * simply shows "Log in with Discord".
 */
export async function gwFetch<T>(path: string, opts: { method?: "GET" | "POST"; body?: unknown; csrf?: string; signal?: AbortSignal } = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const res = await fetch(path, {
    method,
    headers: {
      Accept: "application/json",
      ...(method === "POST" ? { "Content-Type": "application/json", "X-CSRF-Token": opts.csrf ?? "" } : {}),
    },
    body: method === "POST" ? JSON.stringify(opts.body ?? {}) : undefined,
    credentials: "same-origin",
    cache: "no-store",
    signal: opts.signal,
  });
  if (res.ok) return (await res.json()) as T;
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    // non-JSON error
  }
  throw new GwError(res.status, String(body.error ?? "error"), String(body.message ?? res.statusText), body);
}

// One shared 1s clock for every countdown on the page. Before hydration the
// server's time is used so the first client render matches the HTML.
let now = 0;
const subscribers = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  subscribers.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      subscribers.forEach((s) => s());
    }, 1000);
  }
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      now = 0;
    }
  };
}

export function useNow(serverNow: number) {
  return useSyncExternalStore(
    subscribe,
    () => now || serverNow,
    () => serverNow,
  );
}

export function splitDuration(ms: number) {
  let s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  return { d, h, m, s: s - m * 60 };
}

/** Login / authorize links (full navigations: they set cookies and may leave for Discord). */
export const loginHref = (next: string) => `/api/giveaways/login?next=${encodeURIComponent(next)}`;
export const authorizeHref = (next: string) => `/api/giveaways/authorize?next=${encodeURIComponent(next)}`;

/** Calls `fn` every `ms` while the tab is visible, and right when it becomes visible again. */
export function usePoll(fn: () => void, ms: number) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") ref.current();
    }, ms);
    const onVis = () => {
      if (document.visibilityState === "visible") ref.current();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ms]);
}

/** An https link from the backend, or null (never javascript:, data:, …). */
export function safeHttpsUrl(u: string | null | undefined) {
  if (!u) return null;
  try {
    return new URL(u).protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

/** Banner images: https URLs or site-relative paths only. */
export function safeImageUrl(u: string | null | undefined) {
  if (u?.startsWith("/") && !u.startsWith("//") && !u.startsWith("/\\")) return u;
  return safeHttpsUrl(u);
}

/** "Open in Discord": only discord.com / discordapp.com links are shown. */
export function safeDiscordUrl(u: string | null | undefined) {
  const ok = safeHttpsUrl(u);
  if (!ok) return null;
  const host = new URL(ok).hostname;
  return /(^|\.)discord(app)?\.com$/.test(host) ? ok : null;
}
