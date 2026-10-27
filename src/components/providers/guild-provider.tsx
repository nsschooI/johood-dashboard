"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client/api";
import { DEFAULT_GUILD, isGuildKey, type GuildInfo, type GuildKey } from "@/lib/types";

interface GuildContextValue {
  guild: GuildKey;
  guilds: GuildInfo[];
  current: GuildInfo | null;
  info: (g: GuildKey) => GuildInfo | null;
  setGuild: (g: GuildKey) => void;
  /** Build an in-app link that keeps the selected server. */
  href: (path: string, extra?: Record<string, string>) => string;
}

const GuildContext = createContext<GuildContextValue | null>(null);

export const GUILD_COOKIE = "jh_guild";

/**
 * Selected server: `?guild=` in the URL wins, then the remembered choice
 * (cookie / prefs) passed in by the layout. Switching updates all three.
 */
export function GuildProvider({ guilds, initial, children }: { guilds: GuildInfo[]; initial: GuildKey; children: ReactNode }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fromUrl = params.get("guild");
  const guild = isGuildKey(fromUrl) ? fromUrl : initial;

  const href = useCallback(
    (path: string, extra?: Record<string, string>) => {
      const q = new URLSearchParams({ guild, ...extra });
      return `${path}?${q}`;
    },
    [guild],
  );

  const setGuild = useCallback(
    (g: GuildKey) => {
      document.cookie = `${GUILD_COOKIE}=${g}; path=/; max-age=31536000; samesite=lax`;
      void api("/api/prefs", { method: "POST", body: { guild: g } }).catch(() => {});
      const q = new URLSearchParams(params.toString());
      q.set("guild", g);
      q.delete("member");
      router.push(`${pathname}?${q}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const value = useMemo<GuildContextValue>(() => {
    const info = (g: GuildKey) => guilds.find((x) => x.key === g) ?? null;
    return { guild, guilds, current: info(guild), info, setGuild, href };
  }, [guild, guilds, setGuild, href]);

  return <GuildContext value={value}>{children}</GuildContext>;
}

export function useGuild() {
  const ctx = useContext(GuildContext);
  if (!ctx) {
    return { guild: DEFAULT_GUILD, guilds: [], current: null, info: () => null, setGuild: () => {}, href: (p: string) => p } as GuildContextValue;
  }
  return ctx;
}
