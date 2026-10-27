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

/** Walk a dotted key; segments may themselves contain dots (e.g. "access.action.bots.view"). */
function walk(node: unknown, parts: string[]): string | undefined {
  if (parts.length === 0) return typeof node === "string" ? node : undefined;
  if (!node || typeof node !== "object") return undefined;
  const obj = node as Record<string, unknown>;
  for (let i = parts.length; i >= 1; i--) {
    const k = parts.slice(0, i).join(".");
    if (k in obj) {
      const found = walk(obj[k], parts.slice(i));
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function lookup(dict: Messages, key: string): string | undefined {
  return walk(dict, key.split("."));
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
