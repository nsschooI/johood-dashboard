import "server-only";
import { getProvider } from "../provider";
import type { GuildInfo, GuildKey } from "../types";

const cache = new Map<GuildKey, { info: GuildInfo | null; exp: number }>();

/** Server identity for metadata/login, cached for 10 minutes; never throws. */
export async function getGuildIdentity(guild: GuildKey): Promise<GuildInfo | null> {
  const hit = cache.get(guild);
  if (hit && hit.exp > Date.now()) return hit.info;
  let info: GuildInfo | null = null;
  try {
    info = await getProvider().getGuildInfo(guild);
  } catch {
    info = null;
  }
  cache.set(guild, { info, exp: Date.now() + (info ? 600_000 : 60_000) });
  return info;
}

/** Real image URL or null (mock art URLs are not usable as favicons/OG images). */
export function realUrl(url: string | null | undefined) {
  return url && url.startsWith("https://") ? url : null;
}
