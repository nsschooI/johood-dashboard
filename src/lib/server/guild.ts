import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_GUILD, isGuildKey, type GuildKey } from "../types";
import { getSession } from "./session";
import { getPrefs } from "./store";

export const GUILD_COOKIE = "jh_guild";

/** Selected server: `?guild=` → remembered cookie → saved prefs → main. */
export async function resolveGuild(fromUrl?: string | string[] | null): Promise<GuildKey> {
  if (isGuildKey(fromUrl)) return fromUrl;
  const c = (await cookies()).get(GUILD_COOKIE)?.value;
  if (isGuildKey(c)) return c;
  const s = await getSession();
  const saved = s ? getPrefs(s.user.discordId).guild : null;
  return saved ?? DEFAULT_GUILD;
}
