"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, BellRing, ChevronRight } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useNotifications, type Notice } from "@/components/providers/notifications-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { TimeAgo } from "@/components/ui/time-ago";
import { ACTIVITY_ICON, ACTIVITY_TONE } from "@/components/overview/activity-meta";
import { translateDynamic } from "@/lib/i18n";
import { NAV } from "./nav";

export function NotificationsBell() {
  const { t } = useApp();
  const n = useNotifications();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("jh:open-notifications", onOpen);
    return () => window.removeEventListener("jh:open-notifications", onOpen);
  }, []);

  return (
    <div ref={wrap} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={n.unread ? `${t("notify.open")} (${t("notify.unread", { n: n.unread })})` : t("notify.open")}
        tip={t("notify.title")}
      >
        {n.unread ? <BellRing aria-hidden className="size-[18px] text-accent-300 motion-safe:animate-[pulse_2.4s_ease-in-out_infinite]" /> : <Bell aria-hidden className="size-[18px]" />}
        {n.unread > 0 && (
          <span className="tabular absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold text-white ring-2 ring-bg animate-pop">
            {n.unread > 99 ? "99+" : n.unread}
          </span>
        )}
      </Button>
      {open && (
        <div role="dialog" aria-label={t("notify.title")} className="glass fixed inset-x-3 top-16 z-[65] flex max-h-[min(34rem,80vh)] flex-col rounded-2xl bg-[#18141f]/95 shadow-2xl animate-pop sm:absolute sm:inset-x-auto sm:end-0 sm:top-11 sm:w-[24rem]">
          <header className="flex items-center gap-2 border-b border-line px-4 py-3">
            <h2 className="flex-1 text-sm font-semibold">{t("notify.title")}</h2>
            <Button size="sm" variant="ghost" onClick={n.markAllRead} disabled={!n.unread}>
              {t("notify.markRead")}
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {n.notices.length === 0 ? (
              <EmptyState art="bell" title={t("notify.empty")} compact />
            ) : (
              <ul className="space-y-0.5">
                {n.notices.slice(0, 40).map((x) => (
                  <NoticeRow key={x.id} notice={x} onNavigate={() => setOpen(false)} />
                ))}
              </ul>
            )}
          </div>
          <footer className="flex items-center gap-3 border-t border-line px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-2">{t("notify.browser")}</p>
              <p className="text-[11px] text-ink-3">{n.browser === "denied" ? t("notify.browserBlocked") : t("notify.browserHint")}</p>
            </div>
            <Switch
              label={t("notify.browser")}
              checked={n.browser === "granted"}
              disabled={n.browser === "unsupported" || n.browser === "denied"}
              onChange={(v) => (v ? void n.enableBrowser() : n.disableBrowser())}
            />
          </footer>
        </div>
      )}
    </div>
  );
}

function NoticeRow({ notice, onNavigate }: { notice: Notice; onNavigate: () => void }) {
  const { t } = useApp();
  const { href } = useGuild();
  if (notice.type === "attention") {
    const i = notice.item;
    const page = NAV.find((p) => p.key === i.page)!;
    return (
      <li>
        <Link
          href={href(page.href)}
          onClick={onNavigate}
          className={cn("flex items-start gap-3 rounded-xl px-2.5 py-2 transition hover:bg-white/[0.05]", i.severity === "critical" ? "bg-bad/[0.06]" : "bg-warn/[0.04]")}
        >
          <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ring-1", i.severity === "critical" ? "bg-bad/15 text-bad ring-bad/25" : "bg-warn/15 text-warn ring-warn/25")}>
            <AlertTriangle aria-hidden className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] leading-snug text-ink">{translateDynamic(t, `attention.${i.key}`, i.params)}</span>
            <TimeAgo at={notice.at} className="text-[11px] text-ink-3" />
          </span>
          <ChevronRight aria-hidden className="mt-1 size-4 text-ink-3 rtl:-scale-x-100" />
        </Link>
      </li>
    );
  }
  const a = notice.item;
  const Icon = ACTIVITY_ICON[a.kind];
  return (
    <li className="flex items-start gap-3 rounded-xl px-2.5 py-2">
      <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ring-1", ACTIVITY_TONE[a.tone])}>
        <Icon aria-hidden className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-snug text-ink-2">{translateDynamic(t, `activity.${a.kind}.${a.variant}`, a.params, a.kind)}</span>
        <TimeAgo at={a.at} className="text-[11px] text-ink-3" />
      </span>
    </li>
  );
}
