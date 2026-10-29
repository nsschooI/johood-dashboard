"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { useApp, useCan } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useSound } from "@/components/providers/sound-provider";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import { Scene } from "@/components/art/scenes";
import { useTheme } from "@/lib/client/theme";
import { api, qs } from "@/lib/client/api";
import { PAGE_ACCESS } from "@/lib/permissions";
import type { MemberSummary, Page, TicketSummary } from "@/lib/types";
import { GuildIcon } from "./guild-mark";
import { NAV } from "./nav";

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
}

export function CommandPalette({ open, onClose, onShortcuts, onSignOut }: { open: boolean; onClose: () => void; onShortcuts: () => void; onSignOut: () => void }) {
  const { t, locale, setLocale } = useApp();
  const can = useCan();
  const router = useRouter();
  const { guild, guilds, href, setGuild } = useGuild();
  const sound = useSound();
  const theme = useTheme();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      requestAnimationFrame(() => input.current?.focus());
    }
    if (!open && d.open) d.close();
  }, [open]);

  // Live search for members and tickets (debounced).
  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      if (can("members.view")) {
        api<MemberSummary[]>(`/api/members${qs({ q: term, limit: 5, guild })}`, { signal: ctrl.signal })
          .then(setMembers)
          .catch(() => {});
      }
      if (can("tickets.view")) {
        api<Page<TicketSummary>>(`/api/tickets${qs({ search: term.replace(/^#/, ""), limit: 5, guild: "catalog" })}`, { signal: ctrl.signal })
          .then((p) => setTickets(p.items))
          .catch(() => {});
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, open, guild, can]);

  const commands = useMemo<Command[]>(() => {
    const term = q.trim().toLowerCase();
    const close = (fn: () => void) => () => {
      onClose();
      fn();
    };
    const list: Command[] = [];
    for (const n of NAV) {
      const needs = PAGE_ACCESS[n.key];
      if (needs.length && !needs.some((a) => can(a))) continue;
      list.push({ id: `page:${n.key}`, group: t("palette.pages"), label: t(n.label), hint: `G ${n.shortcut.toUpperCase()}`, icon: <Icon name={n.icon} size={18} />, keywords: t(n.hint), run: close(() => router.push(href(n.href))) });
    }
    for (const g of guilds) {
      list.push({
        id: `guild:${g.key}`,
        group: t("palette.servers"),
        label: t("guild.switchTo", { name: g.name }),
        hint: g.key === guild ? "✓" : undefined,
        icon: <GuildIcon guild={g.key} info={g} size={18} />,
        keywords: g.name,
        run: close(() => setGuild(g.key)),
      });
    }
    list.push(
      { id: "lang", group: t("palette.actions"), label: t("palette.toggleLanguage"), hint: "⇧ L", icon: <Icon name="languages" size={18} />, keywords: "arabic english عربي", run: close(() => setLocale(locale === "ar" ? "en" : "ar")) },
      { id: "sound", group: t("palette.actions"), label: t("palette.toggleSound"), hint: "⇧ S", icon: <Icon name="volumeOn" size={18} />, run: close(sound.toggle) },
      { id: "keys", group: t("palette.actions"), label: t("palette.showShortcuts"), hint: "?", icon: <Icon name="keyboard" size={18} />, run: close(onShortcuts) },
      { id: "theme", group: t("palette.actions"), label: `${t("shell.theme")}: ${t(`shell.themes.${theme.theme}`)}`, hint: "⇧ T", icon: <Icon name={theme.theme === "dark" ? "moon" : theme.theme === "light" ? "sun" : "monitor"} size={18} />, keywords: "dark light theme مظهر", run: close(theme.cycle) },
      { id: "out", group: t("palette.actions"), label: t("palette.signOut"), icon: <Icon name="logOut" size={18} mirror />, run: close(onSignOut) },
    );
    const filtered = term ? list.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(term)) : list;
    if (term.length >= 2) {
      for (const m of members) {
        filtered.push({
          id: `member:${m.discordId}`,
          group: t("palette.members"),
          label: m.displayName,
          hint: m.robloxName ?? m.username,
          icon: <Avatar name={m.displayName} src={m.avatarUrl} size={20} />,
          run: close(() => router.push(href("/members", { member: m.discordId }))),
        });
      }
      for (const tk of tickets) {
        filtered.push({ id: `ticket:${tk.id}`, group: t("palette.tickets"), label: `#${tk.number} · ${tk.subject}`, hint: tk.openedBy.name, icon: <Icon name="tickets" size={18} />, run: close(() => router.push(href("/tickets", { ticket: tk.id }))) });
      }
    }
    return filtered;
  }, [q, t, can, guilds, guild, members, tickets, locale, router, href, setGuild, setLocale, sound.toggle, onClose, onShortcuts, onSignOut, theme]);

  const idx = Math.min(active, Math.max(0, commands.length - 1));
  const groups = useMemo(() => {
    const m = new Map<string, Command[]>();
    for (const c of commands) m.set(c.group, [...(m.get(c.group) ?? []), c]);
    return [...m];
  }, [commands]);

  const reset = () => {
    setQ("");
    setActive(0);
    setMembers([]);
    setTickets([]);
  };

  return (
    <dialog
      ref={dialog}
      aria-label={t("palette.open")}
      onCancel={(e) => {
        e.preventDefault();
        reset();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) {
          reset();
          onClose();
        }
      }}
      onClose={reset}
      className="glass fixed inset-x-0 top-[12vh] m-auto h-fit max-h-[70vh] w-[min(40rem,calc(100vw-1.5rem))] overflow-hidden rounded-[var(--radius-card)] p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-transparent open:flex open:flex-col open:animate-pop"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Icon name="search" size={20} className="text-ink-3" />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, commands.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              commands[idx]?.run();
              reset();
            }
          }}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={commands[idx] ? `${listId}-${commands[idx].id}` : undefined}
          placeholder={t("palette.placeholder")}
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-3 focus:outline-none"
        />
        <kbd className="hidden rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-ink-3 sm:block">Esc</kbd>
      </div>
      <div id={listId} role="listbox" aria-label={t("palette.open")} className="min-h-0 flex-1 overflow-y-auto p-2">
        {commands.length === 0 ? (
          <div className="py-8 text-center">
            <Scene name="search" className="mx-auto h-24 w-auto" />
            <p className="mt-2 text-sm text-ink-3">{t("palette.empty", { q })}</p>
          </div>
        ) : (
          groups.map(([group, items]) => (
            <div key={group} role="group" aria-label={group} className="mb-1">
              <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold text-ink-3">{group}</p>
              {items.map((c) => {
                const i = commands.indexOf(c);
                return (
                  <div
                    key={c.id}
                    id={`${listId}-${c.id}`}
                    role="option"
                    aria-selected={i === idx}
                    onMouseMove={() => setActive(i)}
                    onClick={() => {
                      c.run();
                      reset();
                    }}
                    className={cn("flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors duration-[var(--dur-instant)]", i === idx ? "bg-accent-500/10 text-ink" : "text-ink-2")}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-2">{c.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                    {c.hint && <span className="shrink-0 truncate text-xs text-ink-3">{c.hint}</span>}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
      <p className="border-t border-line px-4 py-2 text-[11px] text-ink-3">{t("palette.hint")}</p>
    </dialog>
  );
}
