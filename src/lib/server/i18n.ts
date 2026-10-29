import "server-only";
import { cookies } from "next/headers";
import { createTranslator, DEFAULT_LOCALE, isLocale, type Locale } from "../i18n";
import { LOCALE_COOKIE } from "./session";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export async function getT() {
  return createTranslator(await getLocale());
}

export const THEME_COOKIE = "jh_theme";
export type Theme = "light" | "dark" | "system";
export const isTheme = (v: unknown): v is Theme => v === "light" || v === "dark" || v === "system";

/** Staff theme (light / dark / system), painted by the server so there's no flash. */
export async function getTheme(): Promise<Theme> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(v) ? v : "system";
}
