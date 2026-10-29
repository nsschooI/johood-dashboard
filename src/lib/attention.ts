/**
 * The attention model: everything that needs a human, derived from data the
 * dashboard already has. Pure and isomorphic so it can be tested and run in
 * the browser on every live event.
 *
 * Each item names the permission behind it (only users who may see that
 * area get it), the page it belongs to (nav badges) and a `target` string
 * that the exact control uses to light up (e.g. the Restart button of
 * `bot:tickets`).
 */
import { can, type Action, type PageKey, type SessionUser } from "./permissions";
import { numberLocale, type Locale } from "./i18n";
import type { Assistant, BotStatus, ProtectionSettings, TicketSummary, Transfer } from "./types";

export type AttentionSeverity = "critical" | "warning" | "info";

export interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  page: PageKey;
  /** The control this item points at, e.g. "bot:ops", "tickets:unclaimed". */
  target: string;
  /** Extra targets that should also light up (e.g. each failed transfer row). */
  related?: string[];
  permission: Action;
  /** i18n key under `attention.*`. */
  key: string;
  params: Record<string, string | number>;
  since?: string;
}

export interface AttentionInput {
  now: number;
  bots?: BotStatus[] | null;
  assistants?: Assistant[] | null;
  /** Active (not closed) tickets. */
  tickets?: TicketSummary[] | null;
  transfers?: Transfer[] | null;
  protection?: ProtectionSettings | null;
}

export const ATTENTION_RULES = {
  /** An open ticket nobody claimed for this long needs someone. */
  unclaimedTicketMinutes: 15,
  /** …and becomes critical after this long. */
  unclaimedTicketCriticalMinutes: 60,
  /** Restarts in 24h that count as a spike. */
  restartSpike: 3,
  /** A transfer pending/processing for this long looks stuck. */
  stuckTransferMinutes: 30,
} as const;

/** "15 min", "3 h", "2 d" — compact and language-neutral enough for both locales. */
export function formatAge(minutes: number, locale: Locale = "en") {
  const [n, unit] = minutes < 60 ? [minutes, "minute"] : minutes < 48 * 60 ? [Math.round(minutes / 60), "hour"] : [Math.round(minutes / 1440), "day"];
  // No-break space: "37 hr" never wraps between the number and the unit.
  return new Intl.NumberFormat(numberLocale(locale), { style: "unit", unit, unitDisplay: "short" }).format(n).replace(/\s/g, "\u00a0");
}

/** Attention params for display: the age is computed on the server in English, re-format it for the reader. */
export function localParams(params: AttentionItem["params"], locale: Locale): AttentionItem["params"] {
  return typeof params.minutes === "number" ? { ...params, age: formatAge(params.minutes, locale) } : params;
}

const RANK: Record<AttentionSeverity, number> = { critical: 0, warning: 1, info: 2 };

export function computeAttention(input: AttentionInput, user?: Pick<SessionUser, "roles" | "overrides"> | null): AttentionItem[] {
  const items: AttentionItem[] = [];
  const minutes = (iso: string) => (input.now - Date.parse(iso)) / 60_000;

  const downBots = new Set<string>();
  for (const b of input.bots ?? []) {
    const base = { page: "bots" as const, target: `bot:${b.name}`, permission: "bots.view" as const, params: { bot: b.displayName } };
    if (b.state === "offline") {
      downBots.add(b.name);
      items.push({ ...base, id: `bot-offline:${b.name}`, severity: "critical", key: "botOffline", since: b.lastError?.at });
    } else if (b.state === "stopped") {
      downBots.add(b.name);
      items.push({ ...base, id: `bot-stopped:${b.name}`, severity: "warning", key: "botStopped" });
    } else if (b.state === "degraded") {
      items.push({ ...base, id: `bot-degraded:${b.name}`, severity: "warning", key: "botDegraded", params: { ...base.params, message: b.lastError?.message ?? "" }, since: b.lastError?.at });
    }
    if (b.restarts24h >= ATTENTION_RULES.restartSpike && b.state !== "offline") {
      items.push({ ...base, id: `bot-restarts:${b.name}`, severity: "warning", key: "botRestarts", params: { ...base.params, n: b.restarts24h } });
    }
  }

  for (const a of input.assistants ?? []) {
    if (a.state === "offline" && !downBots.has(a.bot)) {
      items.push({ id: `assistant-offline:${a.bot}`, severity: "warning", page: "bots", target: `bot:${a.bot}`, permission: "assistants.view", key: "assistantOffline", params: { bot: a.displayName } });
    }
  }

  const unclaimed = (input.tickets ?? []).filter((t) => t.status === "open" && minutes(t.openedAt) >= ATTENTION_RULES.unclaimedTicketMinutes);
  if (unclaimed.length) {
    const oldest = unclaimed.reduce((a, b) => (a.openedAt < b.openedAt ? a : b));
    const age = Math.round(minutes(oldest.openedAt));
    items.push({
      id: "tickets-unclaimed",
      severity: age >= ATTENTION_RULES.unclaimedTicketCriticalMinutes ? "critical" : "warning",
      page: "tickets",
      target: "tickets:unclaimed",
      related: unclaimed.map((t) => `ticket:${t.id}`),
      permission: "tickets.view",
      key: "ticketsUnclaimed",
      params: { n: unclaimed.length, minutes: age, age: formatAge(age) },
      since: oldest.openedAt,
    });
  }

  const failed = (input.transfers ?? []).filter((t) => t.status === "failed");
  if (failed.length) {
    items.push({
      id: "transfers-failed",
      severity: "warning",
      page: "activity",
      target: "transfers:failed",
      related: failed.map((t) => `transfer:${t.id}`),
      permission: "transfers.view",
      key: "transfersFailed",
      params: { n: failed.length },
      since: failed[0].at,
    });
  }
  const stuck = (input.transfers ?? []).filter((t) => (t.status === "pending" || t.status === "processing") && minutes(t.at) >= ATTENTION_RULES.stuckTransferMinutes);
  if (stuck.length) {
    items.push({
      id: "transfers-stuck",
      severity: "info",
      page: "activity",
      target: "transfers:stuck",
      related: stuck.map((t) => `transfer:${t.id}`),
      permission: "transfers.view",
      key: "transfersStuck",
      params: { n: stuck.length },
    });
  }

  const p = input.protection;
  if (p?.lockdown) items.push({ id: "lockdown", severity: "critical", page: "safety", target: "protection:lockdown", permission: "protection.view", key: "lockdownOn", params: {}, since: p.updatedAt });
  if (p?.raidMode) items.push({ id: "raid", severity: "critical", page: "safety", target: "protection:raidMode", permission: "protection.view", key: "raidOn", params: {}, since: p.updatedAt });

  return items
    .filter((i) => user === undefined || can(user, i.permission))
    .sort((a, b) => RANK[a.severity] - RANK[b.severity] || (a.since ?? "").localeCompare(b.since ?? ""));
}

/** Badge per nav page: how many items and the worst severity. */
export function pageBadges(items: AttentionItem[]) {
  const out: Partial<Record<PageKey, { count: number; severity: AttentionSeverity }>> = {};
  for (const i of items) {
    const cur = out[i.page];
    if (!cur) out[i.page] = { count: 1, severity: i.severity };
    else {
      cur.count += 1;
      if (RANK[i.severity] < RANK[cur.severity]) cur.severity = i.severity;
    }
  }
  return out;
}

/** Worst severity per target (main + related), for lighting up exact controls. */
export function targetSeverities(items: AttentionItem[]) {
  const out = new Map<string, AttentionSeverity>();
  for (const i of items) {
    for (const t of [i.target, ...(i.related ?? [])]) {
      const cur = out.get(t);
      if (!cur || RANK[i.severity] < RANK[cur]) out.set(t, i.severity);
    }
  }
  return out;
}
