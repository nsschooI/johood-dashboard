"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createTranslator, dirOf, numberLocale, type Locale, type Translate } from "@/lib/i18n";
import type { Action } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { setCsrfToken } from "@/lib/client/api";

export interface ClientUser {
  discordId: string;
  name: string;
  avatarUrl: string | null;
  roles: Role[];
}

interface AppContextValue {
  user: ClientUser | null;
  permissions: ReadonlySet<Action>;
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Translate;
  providerKind: "mock" | "real";
  setLocale: (l: Locale) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  user,
  permissions,
  csrf,
  locale: initialLocale,
  providerKind,
  children,
}: {
  user: ClientUser | null;
  permissions: Action[];
  csrf: string;
  locale: Locale;
  providerKind: "mock" | "real";
  children: ReactNode;
}) {
  setCsrfToken(csrf);
  const [locale, setLocaleState] = useState(initialLocale);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.documentElement.lang = l;
    document.documentElement.dir = dirOf(l);
    document.cookie = `jh_locale=${l}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  const value = useMemo<AppContextValue>(
    () => ({
      user,
      permissions: new Set(permissions),
      locale,
      dir: dirOf(locale),
      t: createTranslator(locale),
      providerKind,
      setLocale,
    }),
    [user, permissions, locale, providerKind, setLocale],
  );
  return <AppContext value={value}>{children}</AppContext>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export const useT = () => useApp().t;

/** UI-side permission check (the server re-checks every request). */
export function useCan() {
  const { permissions } = useApp();
  return useCallback((a: Action) => permissions.has(a), [permissions]);
}

/** Locale-aware formatters. */
export function useFormat() {
  const { locale, t } = useApp();
  return useMemo(() => {
    const nl = numberLocale(locale);
    const num = new Intl.NumberFormat(nl);
    const compact = new Intl.NumberFormat(nl, { notation: "compact", maximumFractionDigits: 1 });
    const pct = new Intl.NumberFormat(nl, { style: "percent", maximumFractionDigits: 1 });
    const rtf = new Intl.RelativeTimeFormat(nl, { numeric: "auto", style: "short" });
    const dt = new Intl.DateTimeFormat(nl, { dateStyle: "medium", timeStyle: "short" });
    const date = new Intl.DateTimeFormat(nl, { dateStyle: "medium" });
    const time = new Intl.DateTimeFormat(nl, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const dayShort = new Intl.DateTimeFormat(nl, { day: "numeric", month: "short", timeZone: "UTC" });
    return {
      n: (v: number) => num.format(v),
      compact: (v: number) => compact.format(v),
      pct: (v: number) => pct.format(v),
      robux: (v: number) => `${num.format(v)} R$`,
      signed: (v: number) => (v > 0 ? `+${num.format(v)}` : num.format(v)),
      dateTime: (iso: string) => dt.format(new Date(iso)),
      date: (iso: string) => date.format(new Date(iso)),
      time: (iso: string) => time.format(new Date(iso)),
      /** "YYYY-MM-DD" bucket key → "20 Oct". */
      day: (key: string) => dayShort.format(new Date(`${key}T00:00:00Z`)),
      relative: (iso: string, now = Date.now()) => {
        const diff = (Date.parse(iso) - now) / 1000;
        const abs = Math.abs(diff);
        if (abs < 45) return t("common.justNow");
        if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
        if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
        return rtf.format(Math.round(diff / 86400), "day");
      },
      duration: (fromIso: string, now = Date.now()) => {
        let s = Math.max(0, Math.floor((now - Date.parse(fromIso)) / 1000));
        const d = Math.floor(s / 86400);
        s -= d * 86400;
        const h = Math.floor(s / 3600);
        s -= h * 3600;
        const m = Math.floor(s / 60);
        if (d) return `${d}d ${h}h`;
        if (h) return `${h}h ${m}m`;
        return `${m}m`;
      },
    };
  }, [locale, t]);
}
