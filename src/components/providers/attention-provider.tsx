"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { computeAttention, pageBadges, targetSeverities, type AttentionItem, type AttentionSeverity } from "@/lib/attention";
import type { PageKey } from "@/lib/permissions";
import type { Assistant, BotStatus, ProtectionSettings, TicketSummary, Transfer } from "@/lib/types";
import { useApp } from "./app-provider";
import { useLiveEvent } from "./live-provider";
import { recordBotSample } from "@/lib/client/bot-samples";

export interface AttentionSeed {
  bots: BotStatus[] | null;
  assistants: Assistant[] | null;
  tickets: TicketSummary[] | null;
  transfers: Transfer[] | null;
  protection: ProtectionSettings | null;
}

interface AttentionValue {
  items: AttentionItem[];
  badges: Partial<Record<PageKey, { count: number; severity: AttentionSeverity }>>;
  targets: Map<string, AttentionSeverity>;
  lockdown: boolean;
  raid: boolean;
}

const AttentionContext = createContext<AttentionValue>({ items: [], badges: {}, targets: new Map(), lockdown: false, raid: false });

/**
 * Keeps the live data the attention model needs (fed by the SSE stream,
 * already filtered by permission) and recomputes on every change and every
 * 30s (ticket age is time-based).
 */
export function AttentionProvider({ seed, children }: { seed: AttentionSeed; children: ReactNode }) {
  const { permissions } = useApp();
  const [bots, setBots] = useState(seed.bots);
  const [assistants, setAssistants] = useState(seed.assistants);
  const [tickets, setTickets] = useState(seed.tickets);
  const [transfers, setTransfers] = useState(seed.transfers);
  const [protection, setProtection] = useState(seed.protection);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useLiveEvent("bot", (e) => {
    recordBotSample(e.data);
    setBots((cur) => (cur ? cur.map((b) => (b.name === e.data.name ? e.data : b)) : cur));
  });
  useLiveEvent("assistant", (e) => setAssistants((cur) => (cur ? cur.map((a) => (a.bot === e.data.bot ? e.data : a)) : cur)));
  useLiveEvent("ticket", (e) =>
    setTickets((cur) => {
      const rest = (cur ?? []).filter((t) => t.id !== e.data.id);
      return e.data.status === "closed" ? rest : [e.data, ...rest];
    }),
  );
  useLiveEvent("transfer", (e) => setTransfers((cur) => [e.data, ...(cur ?? []).filter((t) => t.id !== e.data.id)].slice(0, 80)));
  useLiveEvent("protection", (e) => setProtection(e.data));

  const value = useMemo<AttentionValue>(() => {
    // Filter by the effective permissions the server granted this session.
    const items = computeAttention({ now, bots, assistants, tickets, transfers, protection }).filter((i) => permissions.has(i.permission));
    return {
      items,
      badges: pageBadges(items),
      targets: targetSeverities(items),
      lockdown: Boolean(protection?.lockdown && permissions.has("protection.view")),
      raid: Boolean(protection?.raidMode && permissions.has("protection.view")),
    };
  }, [now, bots, assistants, tickets, transfers, protection, permissions]);

  useEffect(() => {
    const root = document.documentElement;
    if (value.lockdown || value.raid) root.dataset.alert = "lockdown";
    else delete root.dataset.alert;
  }, [value.lockdown, value.raid]);

  return <AttentionContext value={value}>{children}</AttentionContext>;
}

export const useAttention = () => useContext(AttentionContext);

/** Severity for one control (e.g. "bot:ops"), or null. */
export function useAttentionFor(target: string | null | undefined): AttentionSeverity | null {
  const { targets } = useAttention();
  return target ? (targets.get(target) ?? null) : null;
}
