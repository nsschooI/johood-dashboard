"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Chute, Gift, Mascot } from "@/components/art/scenes";
import { Icon, type IconName } from "@/components/icons/icon";
import { AppProvider, useApp, useFormat } from "@/components/providers/app-provider";
import { GuildIcon } from "@/components/shell/guild-mark";
import { LogoMark } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/lib/client/theme";
import type { GuildInfo } from "@/lib/types";
import { type Locale, translateDynamic } from "@/lib/i18n";
import { ROLES, type Role } from "@/lib/types";

const ROLE_ICON: Record<Role, IconName> = { owner: "crown", manager: "briefcase", dev: "code", head_support: "tickets", support: "headphones" };
const ROLE_COLOR: Record<Role, string> = { owner: "#e11d48", manager: "#d97706", dev: "#2a78d6", head_support: "#0d9488", support: "#7c6f75" };

export function LoginView(props: { locale: Locale; error: string | null; discordEnabled: boolean; mockEnabled: boolean; guilds: GuildInfo[]; providerKind: "mock" | "real" }) {
  return (
    <AppProvider user={null} permissions={[]} csrf="" locale={props.locale} providerKind={props.providerKind}>
      <Login {...props} />
    </AppProvider>
  );
}

/** The brand side: Hoodie waving from a red stage, gifts drifting, both servers live. */
function Hero({ guilds }: { guilds: GuildInfo[] }) {
  const { t } = useApp();
  const f = useFormat();
  return (
    <section className="relative isolate flex flex-col overflow-hidden rounded-[2rem] bg-[radial-gradient(120%_90%_at_80%_0%,#fb4d6d_0%,#e11d48_38%,#9f1239_100%)] p-6 text-white shadow-[var(--shadow-pop)] sm:p-10">
      <svg aria-hidden className="pointer-events-none absolute inset-0 -z-10 size-full opacity-[0.12]">
        <defs>
          <pattern id="login-dots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#fff" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#login-dots)" />
      </svg>
      <p aria-hidden className="font-display pointer-events-none absolute -end-6 -bottom-10 -z-10 text-[9rem] leading-none font-black text-white/[0.07] select-none sm:text-[12rem]">
        JoHood
      </p>

      <div className="flex items-center gap-2.5">
        <span className="rounded-2xl bg-white/95 p-1 shadow-lg">
          <LogoMark size={34} />
        </span>
        <span className="font-display text-xl font-bold">JoHood</span>
        <span className="rounded-full bg-white/18 px-2.5 py-0.5 text-xs font-semibold">{t("loginPage.kicker")}</span>
      </div>

      <div className="relative my-6 flex flex-1 items-center justify-center lg:my-8">
        <svg viewBox="0 0 320 240" className="h-40 w-auto drop-shadow-[0_24px_30px_rgb(76_5_25/0.45)] sm:h-56 lg:h-72" aria-hidden>
          <ellipse cx="160" cy="214" rx="96" ry="12" fill="#4c0519" opacity="0.35" />
          <g className="motion-safe:animate-[float_6s_ease-in-out_infinite]">
            <Chute x={262} y={6} scale={0.5} rotate={10} />
          </g>
          <Gift x={62} y={214} scale={0.8} tone="gold" rotate={-8} />
          <Gift x={252} y={214} scale={0.62} tone="cream" rotate={8} />
          <Mascot x={160} y={112} scale={1.05} mood="happy" wave />
        </svg>
      </div>

      <div>
        <h2 className="font-display max-w-md text-3xl leading-tight font-bold sm:text-[2.4rem]">{t("loginPage.headline")}</h2>
        <p className="mt-3 max-w-md text-sm text-white/85 sm:text-base">{t("loginPage.lede")}</p>
        {guilds.length > 0 && (
          <ul className="mt-6 hidden gap-3 sm:grid sm:grid-cols-2">
            {guilds.map((g) => (
              <li key={g.key} className="flex items-center gap-3 rounded-2xl bg-white/12 p-3 ring-1 ring-white/20 backdrop-blur">
                <GuildIcon guild={g.key} info={g} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{g.name}</p>
                  <p className="tabular flex items-center gap-1.5 text-xs text-white/80">
                    {t("guild.members", { n: f.compact(g.members) })}
                    <span aria-hidden>·</span>
                    <span aria-hidden className="size-1.5 rounded-full bg-[#4ade80]" />
                    {t("guild.online", { n: f.compact(g.online) })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function DiscordMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-current">
      <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.7ZM8 15.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.5 8 10.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
    </svg>
  );
}

function Login({ error, discordEnabled, mockEnabled, guilds }: { error: string | null; discordEnabled: boolean; mockEnabled: boolean; guilds: GuildInfo[] }) {
  const { t, locale, setLocale } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const [pending, setPending] = useState<Role | null>(null);
  const [failed, setFailed] = useState(false);

  const mockLogin = async (role: Role) => {
    setPending(role);
    setFailed(false);
    const res = await fetch("/api/auth/mock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    if (res.ok) {
      router.replace("/overview");
      router.refresh();
    } else {
      setFailed(true);
      setPending(null);
    }
  };

  const errorText = error === "expired" ? t("common.sessionExpired") : error ? translateDynamic(t, `login.errors.${error}`, undefined, t("login.errors.oauth")) : null;

  return (
    <main className="grid min-h-dvh gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
      <Hero guilds={guilds} />
      <div className="mx-auto flex w-full max-w-md flex-col justify-center py-4 animate-rise lg:py-8">
        <div className="mb-6 flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={theme.cycle} aria-label={`${t("shell.theme")}: ${t(`shell.themes.${theme.theme}`)}`} tip={`${t("shell.theme")}: ${t(`shell.themes.${theme.theme}`)}`}>
            <Icon name={theme.theme === "dark" ? "moon" : theme.theme === "light" ? "sun" : "monitor"} size={20} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLocale(locale === "ar" ? "en" : "ar")} aria-label={t("header.language")}>
            <Icon name="languages" size={16} />
            <span lang={locale === "ar" ? "en" : "ar"}>{locale === "ar" ? "English" : "العربية"}</span>
          </Button>
        </div>

        <div className="glass rounded-[var(--radius-card)] p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold">{t("login.title")}</h1>
          <p className="mt-1.5 text-sm text-ink-3">{t("login.subtitle")}</p>

          {(errorText || failed) && (
            <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-bad/10 px-3 py-2.5 text-sm font-medium text-bad">
              <Icon name="warning" size={16} className="mt-0.5" />
              {failed ? t("common.error") : errorText}
            </p>
          )}

          <a
            href={discordEnabled ? "/api/auth/discord" : undefined}
            aria-disabled={!discordEnabled}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#5865F2] text-[15px] font-semibold text-white shadow-[0_12px_28px_-14px_#5865F2] transition hover:bg-[#4752c4] active:scale-[0.98] aria-disabled:pointer-events-none aria-disabled:opacity-40"
          >
            <DiscordMark />
            {t("login.discord")}
          </a>
          {!discordEnabled && <p className="mt-2 text-center text-xs text-ink-3">{t("login.discordMissing")}</p>}
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-3">
            <Icon name="lock" size={14} />
            {t("loginPage.secure")}
          </p>

          {mockEnabled && (
            <div className="mt-7 border-t border-dashed border-line-strong pt-6">
              <h2 className="font-display flex items-center gap-2 text-sm font-semibold">
                <Icon name="sparkle" size={16} className="text-warn" />
                {t("login.mockTitle")}
              </h2>
              <p className="mt-1 text-xs text-ink-3">{t("login.mockHint")}</p>
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ROLES.map((role) => (
                  <li key={role} className={role === "owner" ? "sm:col-span-2" : undefined}>
                    <button
                      type="button"
                      onClick={() => mockLogin(role)}
                      disabled={pending !== null}
                      className="group flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 text-start text-sm ring-1 ring-inset ring-line transition hover:bg-surface hover:ring-line-strong active:scale-[0.98] disabled:opacity-60"
                    >
                      <span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: ROLE_COLOR[role] }}>
                        <Icon name={ROLE_ICON[role]} size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] text-ink-3">{t("login.mockAs")}</span>
                        <span className="block truncate font-semibold text-ink">{t(`roles.${role}`)}</span>
                      </span>
                      {pending === role ? <Spinner className="text-accent-400" /> : <Icon name="arrowRight" size={16} mirror className="text-ink-4 transition group-hover:text-ink-2" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
