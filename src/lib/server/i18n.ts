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
