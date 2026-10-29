"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { localParams, type AttentionItem } from "@/lib/attention";
import { translateDynamic } from "@/lib/i18n";
import { safeStorage } from "@/lib/client/storage";
import type { ActivityItem } from "@/lib/types";
import { useRouter } from "next/navigation";
import { DASHBOARD_CONFIG } from "@config/dashboard";
import { useApp, useFormat } from "./app-provider";
import { useGuild } from "./guild-provider";
import { useToast } from "./toast-provider";
import { useAttention } from "./attention-provider";
import { useLiveEvent } from "./live-provider";
import { useSound } from "./sound-provider";

export type Notice =
  | { id: string; at: string; type: "activity"; item: ActivityItem }
  | { id: string; at: string; type: "attention"; item: AttentionItem };

interface NotificationsValue {
  notices: Notice[];
  unread: number;
  markAllRead: () => void;
  browser: "unsupported" | "default" | "granted" | "denied" | "off";
  enableBrowser: () => Promise<void>;
  disableBrowser: () => void;
}

const Ctx = createContext<NotificationsValue | null>(null);
const READ_KEY = "jh_notices_read";
const BROWSER_KEY = "jh_browser_notify";
const MAX = 60;

/**
 * Notification center: the last events this user may see (the stream is
 * already permission-filtered) plus new attention items. Read state is a
 * per-browser convenience (localStorage). Critical items can raise an
 * opt-in desktop notification and a soft alert chime.
 */
export function NotificationsProvider({ seed, children }: { seed: ActivityItem[]; children: ReactNode }) {
  const { t, locale } = useApp();
  const f = useFormat();
  const { items } = useAttention();
  const { play } = useSound();
  const [notices, setNotices] = useState<Notice[]>(() => seed.map((item) => ({ id: item.id, at: item.at, type: "activity" as const, item })));
  const [lastRead, setLastRead] = useState<string>("");
  const [browser, setBrowser] = useState<NotificationsValue["browser"]>("off");
  const seen = useRef<Set<string> | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- per-browser prefs can only be read after mount (SSR has no storage) */
  useEffect(() => {
    // First visit: everything already on screen counts as read.
    const stored = safeStorage.get(READ_KEY);
    const initial = stored ?? new Date().toISOString();
    if (!stored) safeStorage.set(READ_KEY, initial);
    setLastRead(initial);
    if (typeof Notification === "undefined") setBrowser("unsupported");
    else if (safeStorage.get(BROWSER_KEY) === "on") setBrowser(Notification.permission === "granted" ? "granted" : Notification.permission);
    else setBrowser(Notification.permission === "denied" ? "denied" : "off");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Things staff must notice wherever they are: a new ticket, a big purchase.
  const toast = useToast();
  const { href } = useGuild();
  const router = useRouter();
  const known = useRef(new Set<string>());
  useLiveEvent("ticket", (e) => {
    const tk = e.data;
    if (tk.status !== "open" || known.current.has(tk.id) || Date.now() - Date.parse(tk.openedAt) > 60_000) return;
    known.current.add(tk.id);
    play("alert");
    toast({
      tone: "info",
      title: t("alerts.newTicket", { n: tk.number }),
      description: t("alerts.newTicketBody", { name: tk.openedBy.name, subject: tk.subject }),
      action: { label: t("alerts.open"), onClick: () => router.push(href("/tickets", { ticket: tk.id })) },
    });
  });
  useLiveEvent("purchase", (e) => {
    const p = e.data;
    if (p.robux < DASHBOARD_CONFIG.bigPurchaseRobux) return;
    play("purchase");
    toast({ tone: "purchase", title: t("alerts.bigPurchase", { robux: f.robux(p.robux) }), description: t("alerts.bigPurchaseBody", { name: p.robloxName, item: p.item }) });
  });

  useLiveEvent("activity", (e) => {
    setNotices((cur) => [{ id: e.data.id, at: e.data.at, type: "activity" as const, item: e.data }, ...cur.filter((n) => n.id !== e.data.id)].slice(0, MAX));
  });

  // New attention items become notices (once each); critical ones can alert.
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(items.map((i) => i.id));
      return;
    }
    const fresh = items.filter((i) => !seen.current!.has(i.id));
    for (const i of items) seen.current.add(i.id);
    for (const i of [...seen.current]) if (!items.some((x) => x.id === i)) seen.current.delete(i);
    if (!fresh.length) return;
    const at = new Date().toISOString();
    setNotices((cur) => [...fresh.map((item) => ({ id: `att:${item.id}:${at}`, at, type: "attention" as const, item })), ...cur].slice(0, MAX));
    const critical = fresh.filter((i) => i.severity === "critical");
    if (critical.length) {
      play("alert");
      if (browser === "granted" && typeof Notification !== "undefined") {
        for (const i of critical) {
          try {
            new Notification("JoHood", { body: translateDynamic(t, `attention.${i.key}`, localParams(i.params, locale)), tag: i.id, icon: "/icon.svg" });
          } catch {
            // some browsers only allow notifications from a service worker
          }
        }
      }
    }
  }, [items, browser, play, t, locale]);

  const unread = useMemo(() => notices.filter((n) => n.at > lastRead).length, [notices, lastRead]);

  const markAllRead = useCallback(() => {
    const latest = notices[0]?.at ?? new Date().toISOString();
    setLastRead(latest);
    safeStorage.set(READ_KEY, latest);
  }, [notices]);

  const enableBrowser = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const res = await Notification.requestPermission();
    safeStorage.set(BROWSER_KEY, res === "granted" ? "on" : "off");
    setBrowser(res === "granted" ? "granted" : res);
  }, []);

  const disableBrowser = useCallback(() => {
    safeStorage.set(BROWSER_KEY, "off");
    setBrowser("off");
  }, []);

  const value = useMemo(() => ({ notices, unread, markAllRead, browser, enableBrowser, disableBrowser }), [notices, unread, markAllRead, browser, enableBrowser, disableBrowser]);
  return <Ctx value={value}>{children}</Ctx>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
