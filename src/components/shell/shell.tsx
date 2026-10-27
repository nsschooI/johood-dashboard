"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Command, Globe2, Languages, LogOut, Volume2, VolumeX, X } from "lucide-react";
import { useApp, useCan } from "@/components/providers/app-provider";
import { useAttention } from "@/components/providers/attention-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useLiveStatus } from "@/components/providers/live-provider";
import { useSound } from "@/components/providers/sound-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Tooltip } from "@/components/ui/tooltip";
import { api } from "@/lib/client/api";
import type { AttentionSeverity } from "@/lib/attention";
import { PAGE_ACCESS, primaryRole } from "@/lib/permissions";
import { GUILD_KEYS } from "@/lib/types";
import { AlertBanner } from "./alert-banner";
import { CommandPalette } from "./command-palette";
import { NAV } from "./nav";
import { NotificationsBell } from "./notifications-bell";
import { ServerSwitcher } from "./server-switcher";
import { ShortcutsDialog } from "./shortcuts-dialog";

function NavBadge({ badge, compact }: { badge?: { count: number; severity: AttentionSeverity }; compact?: boolean }) {
  if (!badge) return null;
  const tone = badge.severity === "critical" ? "bg-bad text-white" : badge.severity === "warning" ? "bg-warn text-[#1a1306]" : "bg-info text-[#04212b]";
  return (
    <span
      className={cn(
        "tabular grid place-items-center rounded-full font-semibold animate-pop",
        compact ? "absolute -end-1.5 -top-1 h-4 min-w-4 px-1 text-[10px] ring-2 ring-surface" : "ms-auto h-5 min-w-5 px-1.5 text-[11px]",
        tone,
        badge.severity === "critical" && "needs-attention",
      )}
    >
      {badge.count}
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { t, user, locale, setLocale } = useApp();
  const can = useCan();
  const pathname = usePathname();
  const router = useRouter();
  const { href, guild, setGuild } = useGuild();
  const { badges } = useAttention();
  const sound = useSound();
  const [palette, setPalette] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const pendingG = useRef(0);

  const items = useMemo(() => NAV.filter((n) => PAGE_ACCESS[n.key].length === 0 || PAGE_ACCESS[n.key].some((a) => can(a))), [can]);
  const role = user ? primaryRole(user.roles) : null;

  const switchLocale = useCallback(() => {
    const next = locale === "ar" ? "en" : "ar";
    setLocale(next);
    void api("/api/prefs", { method: "POST", body: { locale: next } }).catch(() => {});
  }, [locale, setLocale]);

  const signOut = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }, [router]);

  // Global keyboard shortcuts (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, select, [contenteditable=true], dialog[open]")) return;
      const k = e.key;
      if (k === "?") {
        e.preventDefault();
        setShortcuts(true);
      } else if (k === "L" && e.shiftKey) switchLocale();
      else if (k === "S" && e.shiftKey) sound.toggle();
      else if (k === "G" && e.shiftKey) setGuild(GUILD_KEYS[(GUILD_KEYS.indexOf(guild) + 1) % GUILD_KEYS.length]);
      else if (k === "n") window.dispatchEvent(new Event("jh:open-notifications"));
      else if (k === "g") pendingG.current = Date.now();
      else if (Date.now() - pendingG.current < 1200) {
        const target = items.find((n) => n.shortcut === k.toLowerCase());
        pendingG.current = 0;
        if (target) router.push(href(target.href));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, router, href, switchLocale, sound, setGuild, guild]);

  return (
    <div className="min-h-dvh overflow-x-clip">
      <a href="#main" className="sr-only z-50 rounded-lg bg-accent-500 px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
        {t("app.skip")}
      </a>

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-line bg-bg/50 px-3 py-4 backdrop-blur-xl lg:flex" style={{ viewTransitionName: "sidebar" }}>
        <ServerSwitcher />
        <nav aria-label={t("nav.menu")} className="mt-6 flex flex-col gap-1">
          {items.map((n) => {
            const active = pathname.startsWith(n.href);
            const badge = badges[n.key];
            return (
              <Link
                key={n.key}
                href={href(n.href)}
                transitionTypes={["nav"]}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-[var(--dur-fast)]",
                  active ? "bg-white/[0.07] text-ink ring-1 ring-inset ring-line" : "text-ink-3 hover:bg-white/[0.04] hover:text-ink-2 active:scale-[0.98]",
                )}
              >
                {active && <span aria-hidden className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-accent-400 shadow-[0_0_10px_var(--color-accent-400)]" />}
                <n.icon aria-hidden className={cn("size-[18px] transition", active ? "text-accent-300" : "text-ink-3 group-hover:text-ink-2")} />
                <span className="truncate">{t(n.label)}</span>
                {n.global && !badge && (
                  <span className="ms-auto text-info/80" title={t("guild.globalHint")}>
                    <Globe2 aria-label={t("guild.global")} className="size-3.5" />
                  </span>
                )}
                <NavBadge badge={badge} />
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="mt-auto rounded-2xl bg-white/[0.03] p-2.5 ring-1 ring-line">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} src={user.avatarUrl} size={36} status="online" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                {role && <p className="truncate text-xs text-ink-3">{t(`roles.${role}`)}</p>}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={signOut} tip={t("header.signOut")} aria-label={t("header.signOut")}>
                <LogOut aria-hidden className="size-4 rtl:-scale-x-100" />
              </Button>
            </div>
            <p className="mt-2 text-[10.5px] leading-snug text-ink-3">{t("guild.signInNote")}</p>
          </div>
        )}
      </aside>

      <div className="lg:ps-64">
        <Header onPalette={() => setPalette(true)} onSignOut={signOut} switchLocale={switchLocale} />
        <AlertBanner />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1400px] px-4 pt-6 pb-28 outline-none sm:px-6 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Bottom tabs (phones & tablets) */}
      <nav aria-label={t("nav.menu")} className="glass fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-2xl bg-surface/85 px-1.5 py-1.5 lg:hidden">
        {items.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link
              key={n.key}
              href={href(n.href)}
              transitionTypes={["nav"]}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10.5px] font-medium transition active:scale-95",
                active ? "bg-white/[0.07] text-ink" : "text-ink-3",
              )}
            >
              <span className="relative">
                <n.icon aria-hidden className={cn("size-5", active && "text-accent-300")} />
                <NavBadge badge={badges[n.key]} compact />
              </span>
              <span className="max-w-full truncate">{t(n.label)}</span>
            </Link>
          );
        })}
      </nav>

      <CommandPalette open={palette} onClose={() => setPalette(false)} onShortcuts={() => setShortcuts(true)} onSignOut={signOut} />
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
    </div>
  );
}

const PAGE_TITLE: Record<string, (typeof NAV)[number]["label"]> = Object.fromEntries(NAV.map((n) => [n.href, n.label]));

function Header({ onPalette, onSignOut, switchLocale }: { onPalette: () => void; onSignOut: () => void; switchLocale: () => void }) {
  const { t, user, locale, providerKind } = useApp();
  const status = useLiveStatus();
  const sound = useSound();
  const pathname = usePathname();
  const title = PAGE_TITLE[Object.keys(PAGE_TITLE).find((h) => pathname.startsWith(h)) ?? ""];

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/65 backdrop-blur-xl" style={{ viewTransitionName: "site-header" }}>
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-1 px-2 sm:gap-2 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <ServerSwitcher compact />
        </div>
        {title && <p className="hidden truncate text-sm font-medium text-ink-2 sm:block lg:hidden">{t(title)}</p>}
        <Tooltip content={status === "live" ? t("common.live") : t("common.reconnecting")} side="bottom">
          <span tabIndex={0} className="flex items-center gap-2 rounded-lg px-1 py-1 text-xs text-ink-3" aria-live="polite">
            <Dot tone={status === "live" ? "good" : "warn"} pulse={status === "live"} />
            <span className="hidden xl:inline">{status === "live" ? t("common.live") : t("common.reconnecting")}</span>
          </span>
        </Tooltip>
        {providerKind === "mock" && (
          <Badge tone="accent" className="hidden md:inline-flex">
            {t("header.mockData")}
          </Badge>
        )}

        <button
          type="button"
          onClick={onPalette}
          className="group ms-auto flex h-9 items-center gap-2 rounded-xl bg-white/[0.04] px-3 text-sm text-ink-3 ring-1 ring-inset ring-line transition hover:bg-white/[0.07] hover:text-ink-2 active:scale-[0.98] sm:w-64"
          aria-label={t("palette.open")}
          aria-keyshortcuts="Control+K Meta+K"
        >
          <Command aria-hidden className="size-4" />
          <span className="hidden flex-1 text-start sm:inline">{t("palette.open")}</span>
          <kbd className="hidden rounded-md bg-white/[0.06] px-1.5 text-[10px] ring-1 ring-line sm:inline" dir="ltr">
            Ctrl K
          </kbd>
        </button>

        <div className="flex items-center gap-0.5">
          <NotificationsBell />
          <Button variant="ghost" size="sm" onClick={switchLocale} aria-label={t("header.language")} tip={t("header.language")} className="h-9 px-2.5">
            <Languages aria-hidden className="size-4" />
            <span lang={locale === "ar" ? "en" : "ar"} className="hidden sm:inline">
              {locale === "ar" ? "EN" : "ع"}
            </span>
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={sound.toggle}
              aria-pressed={sound.enabled}
              aria-label={sound.enabled ? t("header.soundOn") : t("header.soundOff")}
              tip={sound.enabled ? t("header.soundOn") : t("header.soundOff")}
            >
              {sound.enabled ? <Volume2 aria-hidden className="size-[18px] text-accent-300" /> : <VolumeX aria-hidden className="size-[18px]" />}
            </Button>
            {sound.showHint && (
              <div role="status" className="glass absolute end-0 top-11 z-40 w-60 rounded-2xl bg-[#1d1828]/95 p-3 text-xs text-ink-2 shadow-xl animate-pop">
                <span aria-hidden className="absolute -top-1.5 end-3 size-3 rotate-45 border-s border-t border-line bg-[#1d1828]" />
                <p className="pe-5">{t("header.soundHint")}</p>
                <button type="button" onClick={sound.dismissHint} aria-label={t("header.got")} className="absolute end-2 top-2 rounded-md p-0.5 text-ink-3 hover:text-ink">
                  <X aria-hidden className="size-3.5" />
                </button>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="primary" onClick={sound.toggle}>
                    <Volume2 aria-hidden className="size-3.5" />
                    {t("header.soundOn")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={sound.dismissHint}>
                    {t("header.got")}
                  </Button>
                </div>
              </div>
            )}
          </div>
          {user && (
            <span className="ms-1 hidden sm:inline-flex lg:hidden">
              <Avatar name={user.name} src={user.avatarUrl} size={28} />
            </span>
          )}
          <span className="lg:hidden">
            <Button variant="ghost" size="icon" onClick={onSignOut} aria-label={t("header.signOut")} tip={t("header.signOut")}>
              <LogOut aria-hidden className="size-[18px] rtl:-scale-x-100" />
            </Button>
          </span>
        </div>
      </div>
    </header>
  );
}
