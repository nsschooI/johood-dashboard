/**
 * Tiny typed i18n: nested dictionaries + "{name}" interpolation.
 * The locale lives in the `jh_locale` cookie (so the server renders the right
 * `dir`/`lang`) and in the user's prefs row.
 */
import en, { type Messages } from "./en";
import ar from "./ar";

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const dictionaries: Record<Locale, Messages> = { en, ar };

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "ar";
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

type Path<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Path<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Path<Messages>;
export type Params = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: Params) => string;

function lookup(dict: Messages, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

export function interpolate(template: string, params?: Params) {
  if (!params) return template;
  // String values (names, items) are wrapped in Unicode isolates so an Arabic
  // name inside an English sentence (or vice versa) doesn't scramble the order.
  return template.replace(/\{(\w+)\}/g, (m, k: string) => {
    if (!(k in params)) return m;
    const v = params[k];
    return typeof v === "string" ? `\u2068${v}\u2069` : String(v);
  });
}

export function createTranslator(locale: Locale): Translate {
  const dict = dictionaries[locale];
  return (key, params) => interpolate(lookup(dict, key) ?? lookup(en, key) ?? key, params);
}

/** Look up a dynamic key (e.g. built from data) with a fallback. */
export function translateDynamic(t: Translate, key: string, params?: Params, fallback?: string): string {
  const out = t(key as MessageKey, params);
  return out === key && fallback !== undefined ? fallback : out;
}

/** Numbers use Latin digits in both languages so IDs and amounts stay consistent. */
export function numberLocale(locale: Locale) {
  return locale === "ar" ? "ar-u-nu-latn" : "en-US";
}
