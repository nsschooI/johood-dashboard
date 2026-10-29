"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons/icon";
import { useApp, useCan } from "@/components/providers/app-provider";
import { useAttention } from "@/components/providers/attention-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useLiveStatus } from "@/components/providers/live-provider";
import { useSound } from "@/components/providers/sound-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { MenuPopover, useMenu, type MenuSection } from "@/components/ui/menu";
import { Modal } from "@/components/ui/modal";
import { Tooltip } from "@/components/ui/tooltip";
import { api } from "@/lib/client/api";
import { useTheme } from "@/lib/client/theme";
import type { AttentionSeverity } from "@/lib/attention";
import { PAGE_ACCESS, primaryRole } from "@/lib/permissions";
import { GUILD_KEYS } from "@/lib/types";
import { AlertBanner } from "./alert-banner";
import { CommandPalette } from "./command-palette";
import { LogoMark } from "./logo";
import { NAV, NAV_GROUPS, navFor, type NavItem } from "./nav";
import { NotificationsBell } from "./notifications-bell";
import { ServerSwitcher } from "./server-switcher";
import { ShortcutsDialog } from "./shortcuts-dialog";

type Badge = { count: number; severity: AttentionSeverity };

function NavBadge({ badge, compact }: { badge?: Badge; compact?: boolean }) {
  if (!badge) return null;
  const tone = badge.severity === "critical" ? "bg-bad text-white dark:text-[#2a0a12]" : badge.severity === "warning" ? "bg-warn text-white dark:text-[#2a1606]" : "bg-info text-white dark:text-[#04212b]";
  return (
    <span
      className={cn(
        "tabular grid place-items-center rounded-full font-bold animate-pop",
        compact ? "absolute -end-2 -top-1.5 h-4 min-w-4 px-1 text-[10px] ring-2 ring-surface" : "ms-auto h-5 min-w-5 px-1.5 text-[11px]",
        tone,
        badge.severity === "critical" && "needs-attention",
      )}
    >
      {badge.count}
    </span>
  );
}

/** Pages the user may open, in nav order. */
function useNavItems() {
  const can = useCan();
  return useMemo(() => NAV.filter((n) => PAGE_ACCESS[n.key].length === 0 || PAGE_ACCESS[n.key].some((a) => can(a))), [can]);
}

export function Shell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const { href, guild, setGuild } = useGuild();
  const sound = useSound();
  const theme = useTheme();
  const items = useNavItems();
  const [palette, setPalette] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [more, setMore] = useState(false);
  const pendingG = useRef(0);

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
      else if (k === "T" && e.shiftKey) theme.cycle();
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
  }, [items, router, href, switchLocale, sound, setGuild, guild, theme]);

  // Close the "More" sheet on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMore(false);
  }

  const userMenu = useUserMenu({ onShortcuts: () => setShortcuts(true), onSignOut: signOut, switchLocale });

  return (
    <div data-guild={guild} className="min-h-dvh overflow-x-clip">
      <a href="#main" className="sr-only z-50 rounded-lg bg-accent-500 px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
        {t("app.skip")}
      </a>

      <Sidebar items={items} userMenu={userMenu} />

      <div className="lg:ps-[17.5rem]">
        <TopBar onPalette={() => setPalette(true)} switchLocale={switchLocale} userMenu={userMenu} />
        <AlertBanner />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1360px] px-4 pt-5 pb-32 outline-none sm:px-6 lg:px-8 lg:pt-7 lg:pb-14">
          {children}
        </main>
      </div>

      <BottomNav items={items} onMore={() => setMore(true)} />
      <MoreSheet open={more} onClose={() => setMore(false)} items={items} userMenu={userMenu} />

      <CommandPalette open={palette} onClose={() => setPalette(false)} onShortcuts={() => setShortcuts(true)} onSignOut={signOut} />
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar (desktop)
// ---------------------------------------------------------------------------

function NavLink({ item, badge, onNavigate }: { item: NavItem; badge?: Badge; onNavigate?: () => void }) {
  const { t } = useApp();
  const { href } = useGuild();
  const pathname = usePathname();
  const active = navFor(pathname)?.key === item.key;
  return (
    <Link
      href={href(item.href)}
      transitionTypes={["nav"]}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition-[background-color,color,transform] duration-[var(--dur-fast)] active:scale-[0.98]",
        active ? "bg-[color-mix(in_oklab,var(--color-guild)_12%,var(--color-surface))] font-semibold text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-2 -start-3 w-1 rounded-e-full bg-guild" />}
      <Icon name={item.icon} size={20} duo={active} className={cn("transition-colors", active ? "text-guild-ink" : "text-ink-3 group-hover:text-ink-2")} />
      <span className="truncate">{t(item.label)}</span>
      {item.global && !badge && (
        <Tooltip content={t("guild.globalHint")} className="ms-auto">
          <span tabIndex={-1} className="text-ink-4">
            <Icon name="globe" size={14} label={t("guild.global")} />
          </span>
        </Tooltip>
      )}
      <NavBadge badge={badge} />
    </Link>
  );
}

function Sidebar({ items, userMenu }: { items: NavItem[]; userMenu: ReturnType<typeof useUserMenu> }) {
  const { t, user, providerKind } = useApp();
  const { badges } = useAttention();
  const role = user ? primaryRole(user.roles) : null;
  return (
    <aside
      className="fixed inset-y-3 start-3 z-30 hidden w-64 flex-col rounded-[26px] bg-surface p-3 shadow-[var(--shadow-glass)] ring-1 ring-line lg:flex"
      style={{ viewTransitionName: "sidebar" }}
    >
      <div className="flex items-center gap-2.5 px-2 pt-1 pb-4">
        <LogoMark size={34} />
        <span className="font-display text-[19px] leading-none font-bold">JoHood</span>
        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">{t("shell.staff")}</span>
        {providerKind === "mock" && (
          <Tooltip content={t("header.mockData")} side="bottom" className="ms-auto">
            <span tabIndex={0} className="grid size-6 place-items-center rounded-full bg-warn/14 text-warn">
              <Icon name="sparkle" size={14} label={t("header.mockData")} />
            </span>
          </Tooltip>
        )}
      </div>
      <ServerSwitcher />
      <nav aria-label={t("nav.menu")} className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto px-0.5 pb-2 [scrollbar-width:none]">
        {NAV_GROUPS.map((g) => {
          const list = items.filter((i) => i.group === g);
          if (!list.length) return null;
          return (
            <div key={g}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold text-ink-3">{t(`nav.groups.${g}`)}</p>
              <div className="space-y-0.5">
                {list.map((n) => (
                  <NavLink key={n.key} item={n} badge={badges[n.key]} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      {user && (
        <button
          type="button"
          onClick={(e) => userMenu.open(e.currentTarget)}
          aria-haspopup="menu"
          aria-expanded={userMenu.isOpen}
          className="mt-2 flex items-center gap-3 rounded-2xl bg-surface-2 p-2.5 text-start ring-1 ring-line transition hover:ring-line-strong active:scale-[0.99]"
        >
          <Avatar name={user.name} src={user.avatarUrl} size={38} status="online" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{user.name}</span>
            {role && <span className="block truncate text-xs text-ink-3">{t(`roles.${role}`)}</span>}
          </span>
          <Icon name="moreVertical" size={18} className="text-ink-3" />
        </button>
      )}
      {userMenu.popover}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

function LivePill() {
  const { t } = useApp();
  const status = useLiveStatus();
  const live = status === "live";
  return (
    <Tooltip content={live ? t("common.live") : t("common.reconnecting")} side="bottom">
      <span tabIndex={0} className={cn("inline-flex h-8 items-center gap-2 rounded-full px-2.5 text-xs font-semibold", live ? "bg-good/10 text-good" : "bg-warn/12 text-warn")}>
        <span aria-hidden className="relative flex size-2">
          {live && <span className="absolute inset-0 rounded-full bg-current opacity-60 motion-safe:animate-ping" />}
          <span className="relative size-2 rounded-full bg-current" />
        </span>
        <span className="hidden xl:inline" aria-live="polite">
          {live ? t("common.live") : t("common.reconnecting")}
        </span>
      </span>
    </Tooltip>
  );
}

function TopBar({ onPalette, switchLocale, userMenu }: { onPalette: () => void; switchLocale: () => void; userMenu: ReturnType<typeof useUserMenu> }) {
  const { t, user, locale } = useApp();
  const pathname = usePathname();
  const { current } = useGuild();
  const sound = useSound();
  const theme = useTheme();
  const page = navFor(pathname);

  return (
    <header className="sticky top-0 z-20 bg-[color-mix(in_oklab,var(--color-bg)_84%,transparent)] backdrop-blur-xl" style={{ viewTransitionName: "site-header" }}>
      <div className="mx-auto flex h-16 max-w-[1360px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 lg:hidden">
          <LogoMark size={30} />
          <ServerSwitcher compact />
        </div>
        <nav aria-label={t("shell.viewing")} className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
          <span aria-hidden className="size-2 rounded-full bg-guild" />
          <span className="truncate font-semibold text-ink-2">{page?.global ? t("shell.global") : (current?.name ?? "JoHood")}</span>
          {page && (
            <>
              <Icon name="chevronRight" size={14} mirror className="text-ink-4" />
              <span className="truncate font-semibold text-ink">{t(page.label)}</span>
            </>
          )}
        </nav>

        <button
          type="button"
          onClick={onPalette}
          className="group ms-auto hidden h-10 w-72 items-center gap-2.5 rounded-xl bg-surface px-3 text-sm text-ink-3 shadow-[0_1px_2px_var(--color-shadow-1)] ring-1 ring-line transition hover:text-ink-2 hover:ring-line-strong active:scale-[0.99] md:flex"
          aria-label={t("palette.open")}
          aria-keyshortcuts="Control+K Meta+K"
        >
          <Icon name="search" size={18} />
          <span className="flex-1 truncate text-start">{t("shell.search")}</span>
          <kbd className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-ink-3" dir="ltr">
            Ctrl K
          </kbd>
        </button>

        <div className="ms-auto flex items-center gap-1 md:ms-2">
          <LivePill />
          <Button variant="ghost" size="icon" onClick={onPalette} aria-label={t("palette.open")} className="md:hidden">
            <Icon name="search" size={20} />
          </Button>
          <NotificationsBell />
          <span className="hidden items-center gap-1 sm:flex">
            <Button variant="ghost" size="icon" onClick={theme.cycle} aria-label={`${t("shell.theme")}: ${t(`shell.themes.${theme.theme}`)}`} tip={`${t("shell.theme")}: ${t(`shell.themes.${theme.theme}`)}`}>
              <Icon name={theme.theme === "dark" ? "moon" : theme.theme === "light" ? "sun" : "monitor"} size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={switchLocale} aria-label={t("header.language")} tip={t("header.language")}>
              <span lang={locale === "ar" ? "en" : "ar"} className="font-display text-[15px] font-bold">
                {locale === "ar" ? "En" : "ع"}
              </span>
            </Button>
            <SoundButton />
          </span>
          {user && (
            <button
              type="button"
              onClick={(e) => userMenu.open(e.currentTarget)}
              aria-haspopup="menu"
              aria-expanded={userMenu.isOpen}
              aria-label={t("shell.openMenu")}
              className="ms-1 rounded-full ring-2 ring-transparent transition hover:ring-line-strong active:scale-95 lg:hidden"
            >
              <Avatar name={user.name} src={user.avatarUrl} size={34} />
            </button>
          )}
        </div>
      </div>
      <div aria-hidden className="h-px bg-[linear-gradient(90deg,transparent,var(--color-line-strong)_20%,var(--color-line-strong)_80%,transparent)]" />
      {sound.showHint && <span className="sr-only">{t("header.soundHint")}</span>}
    </header>
  );
}

function SoundButton() {
  const { t } = useApp();
  const sound = useSound();
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={sound.toggle}
        aria-pressed={sound.enabled}
        aria-label={sound.enabled ? t("header.soundOn") : t("header.soundOff")}
        tip={sound.enabled ? t("header.soundOn") : t("header.soundOff")}
      >
        <Icon name={sound.enabled ? "volumeOn" : "volumeOff"} size={20} className={sound.enabled ? "text-accent-400" : undefined} />
      </Button>
      {sound.showHint && (
        <div role="status" className="glass absolute end-0 top-12 z-40 w-64 rounded-2xl p-3.5 text-xs text-ink-2 shadow-[var(--shadow-pop)] animate-pop">
          <span aria-hidden className="absolute -top-1.5 end-3.5 size-3 rotate-45 border-s border-t border-line bg-surface" />
          <p className="pe-5 leading-relaxed">{t("header.soundHint")}</p>
          <button type="button" onClick={sound.dismissHint} aria-label={t("header.got")} className="absolute end-2 top-2 rounded-md p-0.5 text-ink-3 hover:text-ink">
            <Icon name="x" size={14} />
          </button>
          <div className="mt-2.5 flex gap-2">
            <Button size="sm" variant="primary" onClick={sound.toggle}>
              <Icon name="volumeOn" size={14} />
              {t("header.soundOn")}
            </Button>
            <Button size="sm" variant="ghost" onClick={sound.dismissHint}>
              {t("header.got")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User menu (account, theme, language, sound, shortcuts, sign out)
// ---------------------------------------------------------------------------

function useUserMenu({ onShortcuts, onSignOut, switchLocale }: { onShortcuts: () => void; onSignOut: () => void; switchLocale: () => void }) {
  const { t, user, locale } = useApp();
  const sound = useSound();
  const theme = useTheme();
  const menu = useMenu();
  const role = user ? primaryRole(user.roles) : null;
  const sections: MenuSection[] = [
    {
      title: user ? `${user.name}${role ? ` · ${t(`roles.${role}`)}` : ""}` : t("shell.account"),
      items: [],
    },
    {
      title: t("shell.theme"),
      items: (["light", "dark", "system"] as const).map((k) => ({
        key: `theme-${k}`,
        label: t(`shell.themes.${k}`),
        icon: <Icon name={k === "light" ? "sun" : k === "dark" ? "moon" : "monitor"} size={18} />,
        checked: theme.theme === k,
        onSelect: () => theme.setTheme(k),
      })),
    },
    {
      title: t("shell.preferences"),
      items: [
        { key: "lang", label: locale === "ar" ? "English" : "العربية", icon: <Icon name="languages" size={18} />, hint: "⇧ L", onSelect: switchLocale },
        { key: "sound", label: sound.enabled ? t("header.soundOn") : t("header.soundOff"), icon: <Icon name={sound.enabled ? "volumeOn" : "volumeOff"} size={18} />, hint: "⇧ S", onSelect: sound.toggle },
        { key: "keys", label: t("shell.shortcuts"), icon: <Icon name="keyboard" size={18} />, hint: "?", onSelect: onShortcuts },
      ],
    },
    { items: [{ key: "out", label: t("header.signOut"), icon: <Icon name="logOut" size={18} mirror />, danger: true, onSelect: onSignOut }] },
  ];
  return {
    isOpen: menu.open,
    open: (el: HTMLElement) => menu.openFromButton(el),
    sections,
    popover: <MenuPopover anchor={menu.anchor} onClose={menu.close} sections={sections} label={t("shell.account")} width={260} />,
  };
}

// ---------------------------------------------------------------------------
// Phones & tablets: bottom bar + "More" sheet
// ---------------------------------------------------------------------------

function BottomNav({ items, onMore }: { items: NavItem[]; onMore: () => void }) {
  const { t } = useApp();
  const pathname = usePathname();
  const { href } = useGuild();
  const { badges } = useAttention();
  const primary = items.length <= 5 ? items : items.slice(0, 4);
  const rest = items.length <= 5 ? [] : items.slice(4);
  const activeKey = navFor(pathname)?.key;
  const moreActive = rest.some((r) => r.key === activeKey);
  const moreBadge = rest.map((r) => badges[r.key]).find(Boolean);
  const cell = "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 pt-2 pb-1.5 text-[11px] font-semibold transition active:scale-95";
  return (
    <nav aria-label={t("nav.menu")} className="fixed inset-x-3 bottom-3 z-30 flex gap-1 rounded-[24px] bg-surface/95 p-1.5 shadow-[var(--shadow-pop)] ring-1 ring-line backdrop-blur-xl lg:hidden">
      {primary.map((n) => {
        const active = n.key === activeKey;
        return (
          <Link key={n.key} href={href(n.href)} transitionTypes={["nav"]} aria-current={active ? "page" : undefined} className={cn(cell, active ? "bg-[color-mix(in_oklab,var(--color-guild)_12%,transparent)] text-ink" : "text-ink-3")}>
            <span className="relative">
              <Icon name={n.icon} size={22} duo={active} className={active ? "text-guild-ink" : undefined} />
              <NavBadge badge={badges[n.key]} compact />
            </span>
            <span className="max-w-full truncate">{t(n.label)}</span>
          </Link>
        );
      })}
      {rest.length > 0 && (
        <button type="button" onClick={onMore} aria-haspopup="dialog" className={cn(cell, moreActive ? "bg-[color-mix(in_oklab,var(--color-guild)_12%,transparent)] text-ink" : "text-ink-3")}>
          <span className="relative">
            <Icon name="grid" size={22} duo={moreActive} className={moreActive ? "text-guild-ink" : undefined} />
            <NavBadge badge={moreBadge} compact />
          </span>
          <span>{t("nav.more")}</span>
        </button>
      )}
    </nav>
  );
}

function MoreSheet({ open, onClose, items, userMenu }: { open: boolean; onClose: () => void; items: NavItem[]; userMenu: ReturnType<typeof useUserMenu> }) {
  const { t, user } = useApp();
  const { badges } = useAttention();
  const { href } = useGuild();
  const pathname = usePathname();
  const activeKey = navFor(pathname)?.key;
  return (
    <Modal open={open} onClose={onClose} title={t("nav.menu")} variant="sheet">
      <div className="space-y-5">
        {NAV_GROUPS.map((g) => {
          const list = items.filter((i) => i.group === g);
          if (!list.length) return null;
          return (
            <div key={g}>
              <p className="pb-2 text-xs font-semibold text-ink-3">{t(`nav.groups.${g}`)}</p>
              <div className="grid grid-cols-3 gap-2">
                {list.map((n) => {
                  const active = n.key === activeKey;
                  return (
                    <Link
                      key={n.key}
                      href={href(n.href)}
                      transitionTypes={["nav"]}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center text-xs font-semibold ring-1 transition active:scale-95",
                        active ? "bg-[color-mix(in_oklab,var(--color-guild)_12%,var(--color-surface))] ring-[color-mix(in_oklab,var(--color-guild)_35%,transparent)]" : "bg-surface-2 ring-line",
                      )}
                    >
                      <Icon name={n.icon} size={24} duo className={active ? "text-guild-ink" : "text-ink-2"} />
                      {t(n.label)}
                      {badges[n.key] && <NavBadge badge={badges[n.key]} compact />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
        {user && (
          <div className="rounded-2xl bg-surface-2 p-1.5 ring-1 ring-line">
            {userMenu.sections.slice(1).flatMap((s) =>
              s.items.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => {
                    it.onSelect?.();
                    if (it.key === "out" || it.key === "keys") onClose();
                  }}
                  aria-pressed={it.checked}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition hover:bg-surface", it.danger ? "text-bad" : "text-ink", it.checked && "font-semibold")}
                >
                  <span className="text-ink-2 [&>svg]:size-[18px]">{it.icon}</span>
                  <span className="flex-1">{it.label}</span>
                  {it.checked && <Icon name="check" size={16} className="text-accent-400" />}
                </button>
              )),
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
