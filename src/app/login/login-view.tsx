"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Code2, Headset, LifeBuoy, Briefcase, Languages, AlertTriangle } from "lucide-react";
import { AppProvider, useApp } from "@/components/providers/app-provider";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { type Locale, translateDynamic } from "@/lib/i18n";
import { ROLES, type Role } from "@/lib/types";

const ROLE_ICON: Record<Role, typeof Crown> = { owner: Crown, manager: Briefcase, dev: Code2, head_support: LifeBuoy, support: Headset };

export function LoginView(props: { locale: Locale; error: string | null; discordEnabled: boolean; mockEnabled: boolean }) {
  return (
    <AppProvider user={null} permissions={[]} csrf="" locale={props.locale} providerKind="mock">
      <Login {...props} />
    </AppProvider>
  );
}

function DiscordMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-current">
      <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.7ZM8 15.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.5 8 10.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
    </svg>
  );
}

function Login({ error, discordEnabled, mockEnabled }: { error: string | null; discordEnabled: boolean; mockEnabled: boolean }) {
  const { t, locale, setLocale } = useApp();
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
    }
    else {
      setFailed(true);
      setPending(null);
    }
  };

  const errorText = error === "expired" ? t("common.sessionExpired") : error ? translateDynamic(t, `login.errors.${error}`, undefined, t("login.errors.oauth")) : null;

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => setLocale(locale === "ar" ? "en" : "ar")} aria-label={t("header.language")}>
            <Languages aria-hidden className="size-4" />
            <span lang={locale === "ar" ? "en" : "ar"}>{locale === "ar" ? "English" : "العربية"}</span>
          </Button>
        </div>

        <div className="glass rounded-[var(--radius-card)] p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{t("login.title")}</h1>
          <p className="mt-1.5 text-sm text-ink-3">{t("login.subtitle")}</p>

          {(errorText || failed) && (
            <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-bad/10 px-3 py-2.5 text-sm text-bad ring-1 ring-bad/20">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {failed ? t("common.error") : errorText}
            </p>
          )}

          <a
            href={discordEnabled ? "/api/auth/discord" : undefined}
            aria-disabled={!discordEnabled}
            className={
              "mt-6 flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-[#5865F2] text-sm font-semibold text-white shadow-[0_10px_30px_-12px_#5865F2] transition hover:bg-[#4752c4] aria-disabled:pointer-events-none aria-disabled:opacity-40"
            }
          >
            <DiscordMark />
            {t("login.discord")}
          </a>
          {!discordEnabled && <p className="mt-2 text-center text-xs text-ink-3">{t("login.discordMissing")}</p>}

          {mockEnabled && (
            <div className="mt-8 border-t border-line pt-6">
              <h2 className="text-sm font-semibold">{t("login.mockTitle")}</h2>
              <p className="mt-1 text-xs text-ink-3">{t("login.mockHint")}</p>
              <ul className="mt-4 grid gap-2">
                {ROLES.map((role) => {
                  const Icon = ROLE_ICON[role];
                  return (
                    <li key={role}>
                      <button
                        type="button"
                        onClick={() => mockLogin(role)}
                        disabled={pending !== null}
                        className="group flex w-full items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-start text-sm ring-1 ring-inset ring-line transition hover:bg-white/[0.06] hover:ring-accent-400/40 disabled:opacity-60"
                      >
                        <span className="grid size-8 place-items-center rounded-lg bg-accent-500/12 text-accent-300 ring-1 ring-accent-400/20">
                          <Icon aria-hidden className="size-4" />
                        </span>
                        <span className="flex-1">
                          <span className="block text-xs text-ink-3">{t("login.mockAs")}</span>
                          <span className="font-medium text-ink">{t(`roles.${role}`)}</span>
                        </span>
                        {pending === role && <span className="size-4 animate-spin rounded-full border-2 border-accent-300 border-t-transparent" aria-hidden />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
