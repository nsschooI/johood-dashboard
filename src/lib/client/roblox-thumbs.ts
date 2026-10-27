"use client";

import { useEffect, useState } from "react";
import { api, qs } from "./api";

/**
 * Batches thumbnail lookups from every component on screen into one request
 * per ~40 ms, and caches results for the session.
 */
type Kind = "users" | "assets";
const cache: Record<Kind, Map<string, string | null>> = { users: new Map(), assets: new Map() };
const queued: Record<Kind, Set<string>> = { users: new Set(), assets: new Set() };
const waiters = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  const users = [...queued.users].slice(0, 100);
  const assets = [...queued.assets].slice(0, 100);
  users.forEach((id) => queued.users.delete(id));
  assets.forEach((id) => queued.assets.delete(id));
  if (!users.length && !assets.length) return;
  api<{ users: Record<string, string | null>; assets: Record<string, string | null> }>(`/api/roblox/thumbnails${qs({ users: users.join(","), assets: assets.join(",") })}`)
    .then((res) => {
      for (const id of users) cache.users.set(id, res.users[id] ?? null);
      for (const id of assets) cache.assets.set(id, res.assets[id] ?? null);
    })
    .catch(() => {
      for (const id of users) cache.users.set(id, null);
      for (const id of assets) cache.assets.set(id, null);
    })
    .finally(() => {
      waiters.forEach((w) => w());
      if (queued.users.size || queued.assets.size) schedule();
    });
}

function schedule() {
  if (!timer) timer = setTimeout(flush, 40);
}

/** undefined = loading, null = no picture, string = URL. */
export function useRobloxThumb(kind: Kind, id: string | null | undefined): string | null | undefined {
  const [, force] = useState(0);
  const valid = Boolean(id && /^\d{1,20}$/.test(id));
  useEffect(() => {
    if (!valid || cache[kind].has(id!)) return;
    const wake = () => force((n) => n + 1);
    waiters.add(wake);
    queued[kind].add(id!);
    schedule();
    return () => {
      waiters.delete(wake);
    };
  }, [kind, id, valid]);
  if (!valid) return null;
  return cache[kind].has(id!) ? cache[kind].get(id!) : undefined;
}
