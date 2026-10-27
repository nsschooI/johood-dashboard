import "server-only";

/**
 * In-memory sliding-window rate limiter. The dashboard runs as a single Node
 * process (pm2 fork mode), so process memory is the right store. If you ever
 * run several instances, move this to SQLite or Redis.
 */
const hits = new Map<string, number[]>();
let lastSweep = 0;

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfterMs: number; remaining: number } {
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, list] of hits) if (!list.length || list[list.length - 1] < now - 10 * 60_000) hits.delete(k);
  }
  const list = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
  if (list.length >= limit) {
    hits.set(key, list);
    return { ok: false, retryAfterMs: list[0] + windowMs - now, remaining: 0 };
  }
  list.push(now);
  hits.set(key, list);
  return { ok: true, retryAfterMs: 0, remaining: limit - list.length };
}

export function resetRateLimits() {
  hits.clear();
}
