import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { getProvider } from "../provider";
import type { MockGiveaways } from "../giveaways/mock";

/** The mock giveaways backend, or null in real mode (mock-only helpers). */
export function mockGiveaways(): MockGiveaways | null {
  const p = getProvider();
  return p.kind === "mock" ? (p.giveaways as MockGiveaways) : null;
}

/** Append a query flag to a validated relative path. */
export function withFlag(target: string, key: string, value = "1") {
  const u = new URL(target, "https://johood.invalid");
  u.searchParams.set(key, value);
  return u.pathname + u.search + u.hash;
}

export const GW_THEME_COOKIE = "jh_gw_theme";
export type GwTheme = "light" | "dark" | "system";

export function isGwTheme(v: unknown): v is GwTheme {
  return v === "light" || v === "dark" || v === "system";
}

export async function getGwTheme(): Promise<GwTheme> {
  const v = (await cookies()).get(GW_THEME_COOKIE)?.value;
  return isGwTheme(v) ? v : "system";
}

/**
 * Default banners the owner drops into public/giveaways/. When a file is
 * missing the pages draw a built-in banner instead.
 */
export function defaultBanners(): { active: string | null; ended: string | null } {
  const has = (f: string) => existsSync(path.join(process.cwd(), "public", "giveaways", f));
  return {
    active: has("banner-active.webp") ? "/giveaways/banner-active.webp" : null,
    ended: has("banner-ended.webp") ? "/giveaways/banner-ended.webp" : null,
  };
}
