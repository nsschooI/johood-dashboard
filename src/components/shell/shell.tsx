"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { LogOut, Volume2, VolumeX, Languages } from "lucide-react";
import { useApp, useCan } from "@/components/providers/app-provider";
import { useLiveStatus } from "@/components/providers/live-provider";
import { useSound } from "@/components/providers/sound-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { api } from "@/lib/client/api";
import { PAGE_ACCESS, primaryRole } from "@/lib/permissions";
import { NAV } from "./nav";
import { Logo } from "./logo";

export function Shell({ children }: { children: ReactNode }) {
  const { t, user } = useApp();
  const can = useCan();
  const pathname = usePathname();
  const items = useMemo(() => NAV.filter((n) => PAGE_ACCESS[n.key].some((a) => can(a))), [can]);
  const role = user ? primaryRole(user.roles) : null;

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded-lg bg-accent-500 px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
        {t("app.skip")}
      </a>

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-60 flex-col border-e border-line bg-bg/40 px-3 py-5 backdrop-blur-xl lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav aria-label={t("nav.menu")} className="mt-8 flex flex-col gap-1">
          {items.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.key}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-white/[0.07] text-ink ring-1 ring-inset ring-line" : "text-ink-3 hover:bg-white/[0.04] hover:text-ink-2",
                )}
              >
                <n.icon aria-hidden className={cn("size-[18px] transition", active ? "text-accent-300" : "text-ink-3 group-hover:text-ink-2")} />
                {t(n.label)}
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="mt-auto flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar name={user.name} src={user.avatarUrl} size={34} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{user.name}</p>
              {role && <p className="truncate text-xs text-ink-3">{t(`roles.${role}`)}</p>}
            </div>
          </div>
        )}
      </aside>

      <div className="lg:ps-60">
        <Header />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1400px] px-4 pt-6 pb-28 outline-none sm:px-6 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Bottom tabs (phones & tablets) */}
      <nav
        aria-label={t("nav.menu")}
        className="glass fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-2xl bg-surface/80 px-2 py-1.5 lg:hidden"
      >
        {items.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link
              key={n.key}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition", active ? "text-ink" : "text-ink-3")}
            >
              <n.icon aria-hidden className={cn("size-5", active && "text-accent-300")} />
              <span className="max-w-full truncate">{t(n.label)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Header() {
  const { t, user, locale, setLocale, providerKind } = useApp();
  const status = useLiveStatus();
  const sound = useSound();
  const router = useRouter();

  const switchLocale = () => {
    const next = locale === "ar" ? "en" : "ar";
    setLocale(next);
    void api("/api/prefs", { method: "POST", body: { locale: next } }).catch(() => {});
  };

  const signOut = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <Logo compact />
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-3" aria-live="polite">
          <Dot tone={status === "live" ? "good" : "warn"} pulse={status === "live"} />
          <span className="hidden sm:inline">{status === "live" ? t("common.live") : t("common.reconnecting")}</span>
        </div>
        {providerKind === "mock" && (
          <Badge tone="accent" className="hidden sm:inline-flex">
            {t("header.mockData")}
          </Badge>
        )}

        <div className="ms-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={switchLocale} aria-label={t("header.language")} className="h-9 px-2.5">
            <Languages aria-hidden className="size-4" />
            <span lang={locale === "ar" ? "en" : "ar"}>{locale === "ar" ? "English" : "العربية"}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={sound.toggle}
            aria-pressed={sound.enabled}
            aria-label={sound.enabled ? t("header.soundOn") : t("header.soundOff")}
            title={sound.enabled ? t("header.soundOn") : t("header.soundOff")}
          >
            {sound.enabled ? <Volume2 aria-hidden className="size-[18px] text-accent-300" /> : <VolumeX aria-hidden className="size-[18px]" />}
          </Button>
          {user && (
            <>
              <span className="lg:hidden">
                <Avatar name={user.name} src={user.avatarUrl} size={28} />
              </span>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label={t("header.signOut")} title={t("header.signOut")}>
                <LogOut aria-hidden className="size-[18px] rtl:-scale-x-100" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
