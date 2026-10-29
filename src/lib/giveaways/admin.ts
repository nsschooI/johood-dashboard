/**
 * Giveaways — staff side (the dashboard runs giveaways without Discord).
 *
 * Contract of the bot backend's `/admin/giveaways*` routes (see
 * docs/giveaways-admin.md). The provider section is `adminGiveaways`.
 * Isomorphic: the form validation here runs in the browser and again in
 * the API route.
 */
import type { MemberRef } from "../types";

export type MissingRequirement = { type: "authorize" } | { type: "server"; key: string; name: string };

export interface AdminGiveaway {
  id: number;
  prize: string;
  status: "active" | "ended" | "failed";
  endsAt: string;
  winnersCount: number;
  hostId: string;
  entries: number;
  /** People who tried to join but stopped at a requirement. */
  blocked: number;
  /** Every press of Join (button or website), completed or not. */
  attempts: number;
  requirements: { servers: { key: string; id: string; name: string; inviteUrl?: string }[]; authorize: boolean };
  winners: { id: string; name: string }[];
  messageUrl: string | null;
  /** Always null from the API: the picture comes from GET /admin/giveaways/:id/banner. */
  bannerUrl: string | null;
  channelName?: string;
  guildName?: string;
  /** Only on the live event sent when a giveaway is deleted. */
  deleted?: boolean;
}

export interface Participant {
  userId: string;
  name: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface Blocked {
  userId: string;
  name: string;
  avatarUrl: string | null;
  missing: MissingRequirement[];
  attempts: number;
  firstAt: string;
  lastAt: string;
}

export interface ChannelOption {
  guildKey: "main" | "catalog";
  guildName: string;
  id: string;
  name: string;
}

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
export type ServerRequirement = "catalog" | "main";

export interface CreateGiveawayInput {
  actor: MemberRef;
  prize: string;
  minutes: number;
  winners: number;
  channelId: string;
  servers: ServerRequirement[];
  authorize: boolean;
  imageBase64?: string;
  imageType?: ImageType;
}

/** The `adminGiveaways` section of the DataProvider. */
export interface AdminGiveawaysApi {
  list(): Promise<AdminGiveaway[]>;
  get(id: number): Promise<AdminGiveaway | null>;
  participants(id: number): Promise<{ entries: Participant[]; blocked: Blocked[] }>;
  channels(): Promise<ChannelOption[]>;
  banner(id: number): Promise<{ contentType: string; base64: string }>;
  create(input: CreateGiveawayInput): Promise<{ id: number }>;
  end(id: number, actor: MemberRef): Promise<{ winners: { id: string; name: string }[] }>;
  reroll(id: number, actor: MemberRef): Promise<{ winners: { id: string; name: string }[] }>;
  /** Removes the giveaway, its entries and its Discord message for good. */
  delete(id: number, actor: MemberRef): Promise<{ deleted: true }>;
}

export const GIVEAWAY_LIMITS = {
  prizeMax: 120,
  minutesMin: 1,
  /** 90 days. */
  minutesMax: 129_600,
  winnersMin: 1,
  winnersMax: 50,
  imageMaxBytes: 5 * 1024 * 1024,
} as const;

/** Quick duration chips, in minutes: 1 hour, 1 day, 3 days, 1 week. */
export const DURATION_PRESETS = [60, 1440, 4320, 10080] as const;

export type DurationUnit = "minutes" | "hours" | "days";
export const UNIT_MINUTES: Record<DurationUnit, number> = { minutes: 1, hours: 60, days: 1440 };

/** Bytes decoded from a base64 string (without data: prefix). */
export function base64Bytes(b64: string) {
  const clean = b64.replace(/\s/g, "");
  const pad = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - pad;
}

export type GiveawayField = "prize" | "minutes" | "winners" | "channelId" | "image";
export type GiveawayError = "required" | "tooLong" | "tooShort" | "tooMany" | "wholeNumber" | "imageType" | "imageSize";

export interface GiveawayDraft {
  prize: string;
  minutes: number;
  winners: number;
  channelId: string;
  image?: { type: string; bytes: number } | null;
}

/** Field → problem, or an empty object when the draft can be posted. */
export function validateGiveaway(d: GiveawayDraft): Partial<Record<GiveawayField, GiveawayError>> {
  const e: Partial<Record<GiveawayField, GiveawayError>> = {};
  const prize = d.prize.trim();
  if (!prize) e.prize = "required";
  else if ([...prize].length > GIVEAWAY_LIMITS.prizeMax) e.prize = "tooLong";
  if (!Number.isFinite(d.minutes) || !Number.isInteger(d.minutes)) e.minutes = "wholeNumber";
  else if (d.minutes < GIVEAWAY_LIMITS.minutesMin) e.minutes = "tooShort";
  else if (d.minutes > GIVEAWAY_LIMITS.minutesMax) e.minutes = "tooLong";
  if (!Number.isFinite(d.winners) || !Number.isInteger(d.winners)) e.winners = "wholeNumber";
  else if (d.winners < GIVEAWAY_LIMITS.winnersMin) e.winners = "tooShort";
  else if (d.winners > GIVEAWAY_LIMITS.winnersMax) e.winners = "tooMany";
  if (!d.channelId) e.channelId = "required";
  if (d.image) {
    if (!(IMAGE_TYPES as readonly string[]).includes(d.image.type)) e.image = "imageType";
    else if (d.image.bytes > GIVEAWAY_LIMITS.imageMaxBytes) e.image = "imageSize";
  }
  return e;
}

/** "Join JoHood Catalog" / "Authorize" keys for filtering blocked members. */
export function missingKey(m: MissingRequirement) {
  return m.type === "authorize" ? "authorize" : `server:${m.key}`;
}

/** CSV with a BOM so Excel opens Arabic names correctly; every cell quoted. */
export function toCsv(rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    let s = String(v);
    // Neutralise spreadsheet formulas in user-controlled text.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

/** Joined / attempts and blocked / attempts, safe for zero. */
export function funnel(g: Pick<AdminGiveaway, "attempts" | "blocked" | "entries">) {
  const attempts = Math.max(g.attempts, g.entries + g.blocked);
  return {
    attempts,
    blocked: g.blocked,
    joined: g.entries,
    joinedPct: attempts ? g.entries / attempts : 0,
    blockedPct: attempts ? g.blocked / attempts : 0,
  };
}
