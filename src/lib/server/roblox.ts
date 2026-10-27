import "server-only";
/**
 * Roblox thumbnails (public API, no key). Batches IDs, caches the resolved
 * tr.rbxcdn.com URLs for hours, and never throws: a missing image just
 * falls back to the designed placeholder in the UI.
 *
 * In mock mode the IDs are fake, so we return `mock:` art URLs instead.
 */
import { getProvider } from "../provider";

export type ThumbKind = "headshot" | "asset";

const TTL_OK = 6 * 3600_000;
const TTL_MISS = 10 * 60_000;
const BATCH = 100;
const cache = new Map<string, { url: string | null; exp: number }>();

const ENDPOINT: Record<ThumbKind, (ids: string[]) => string> = {
  headshot: (ids) => `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids.join(",")}&size=150x150&format=Png&isCircular=false`,
  asset: (ids) => `https://thumbnails.roblox.com/v1/assets?assetIds=${ids.join(",")}&size=150x150&format=Png&isCircular=false`,
};

export function isRobloxId(id: string) {
  return /^\d{1,20}$/.test(id);
}

/** Resolve thumbnail URLs for many IDs at once. Unknown → null. */
export async function resolveThumbnails(kind: ThumbKind, ids: string[], fetchImpl: typeof fetch = fetch): Promise<Record<string, string | null>> {
  const unique = [...new Set(ids.filter(isRobloxId))];
  const out: Record<string, string | null> = {};
  if (getProvider().kind === "mock") {
    for (const id of unique) out[id] = `mock:${kind}:${id}`;
    return out;
  }
  const now = Date.now();
  const missing: string[] = [];
  for (const id of unique) {
    const hit = cache.get(`${kind}:${id}`);
    if (hit && hit.exp > now) out[id] = hit.url;
    else missing.push(id);
  }
  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    let data: { targetId: number; state: string; imageUrl: string | null }[] = [];
    try {
      const res = await fetchImpl(ENDPOINT[kind](chunk), { signal: AbortSignal.timeout(5000), headers: { Accept: "application/json" } });
      if (res.ok) data = ((await res.json()) as { data?: typeof data }).data ?? [];
    } catch {
      // network error → cache misses briefly below
    }
    const found = new Map(data.map((d) => [String(d.targetId), d.state === "Completed" && d.imageUrl?.startsWith("https://") ? d.imageUrl : null]));
    for (const id of chunk) {
      const url = found.get(id) ?? null;
      cache.set(`${kind}:${id}`, { url, exp: now + (url ? TTL_OK : TTL_MISS) });
      out[id] = url;
    }
  }
  if (cache.size > 20_000) {
    for (const [k, v] of cache) if (v.exp < now) cache.delete(k);
  }
  return out;
}

export function clearThumbnailCache() {
  cache.clear();
}
