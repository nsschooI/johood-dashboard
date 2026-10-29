/**
 * Mock of the bot backend's giveaway admin routes: giveaways with entries,
 * members blocked at a requirement, channels, banners, and create / end /
 * reroll with the same validation and errors (400 / 404 / 409) as the real
 * API. Running giveaways gain entries and blocked attempts over time so the
 * page has something live to show.
 */
import { ProviderError } from "../provider/errors";
import type { MemberRef } from "../types";
import {
  GIVEAWAY_LIMITS,
  IMAGE_TYPES,
  base64Bytes,
  type AdminGiveaway,
  type AdminGiveawaysApi,
  type Blocked,
  type ChannelOption,
  type CreateGiveawayInput,
  type MissingRequirement,
  type Participant,
} from "./admin";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const SERVERS = {
  main: { key: "main", id: "mock-guild-main", name: "JoHood" },
  catalog: { key: "catalog", id: "mock-guild-catalog", name: "JoHood Catalog", inviteUrl: "https://discord.com/invite/johood-catalog" },
} as const;

export const MOCK_CHANNELS: ChannelOption[] = [
  { guildKey: "main", guildName: "JoHood", id: "mock-ch-main-giveaways", name: "giveaways" },
  { guildKey: "main", guildName: "JoHood", id: "mock-ch-main-events", name: "events" },
  { guildKey: "main", guildName: "JoHood", id: "mock-ch-main-announcements", name: "announcements" },
  { guildKey: "catalog", guildName: "JoHood Catalog", id: "mock-ch-cat-giveaways", name: "giveaways" },
  { guildKey: "catalog", guildName: "JoHood Catalog", id: "mock-ch-cat-news", name: "catalog-news" },
];

const NAMES = ["Laith", "ريم", "Faris", "سارة", "Yazan", "نور", "Hala", "عمر", "Dana", "زيد", "Kareem", "ليان", "Tamer", "جود", "Mira", "حمزة", "Saif", "تالا", "Adam", "يزن", "Lina", "بدر", "Zain", "مها"];

function person(seed: number) {
  return {
    userId: `9100000000${String(100000 + seed).padStart(8, "0")}`,
    name: `${NAMES[seed % NAMES.length]}${seed >= NAMES.length ? `_${seed % 97}` : ""}`,
    avatarUrl: seed % 5 === 4 ? null : `mock:avatar:gw-${seed}`,
  };
}

interface Stored extends AdminGiveaway {
  participants: Participant[];
  blockedList: Blocked[];
  image?: { type: string; base64: string };
  nextPerson: number;
}

/** A tiny deterministic generator so tests are stable. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export class MockAdminGiveaways implements AdminGiveawaysApi {
  private items = new Map<number, Stored>();
  private now: () => number;
  private rand: () => number;
  private onChange: (g: AdminGiveaway) => void;

  constructor(opts: { now?: () => number; seed?: number; onChange?: (g: AdminGiveaway) => void } = {}) {
    this.now = opts.now ?? Date.now;
    this.rand = rng(opts.seed ?? 7);
    this.onChange = opts.onChange ?? (() => {});
    const t = this.now();
    const iso = (ms: number) => new Date(ms).toISOString();
    this.seed({ id: 101, prize: "Discord Nitro · 3 months", status: "active", endsAt: iso(t + 2 * DAY + 5 * HOUR), winnersCount: 3, servers: ["catalog"], authorize: true, entries: 64, blocked: 23, channel: 0 }, t);
    this.seed({ id: 102, prize: "10,000 Robux", status: "active", endsAt: iso(t + 47 * MIN), winnersCount: 1, servers: [], authorize: true, entries: 138, blocked: 41, channel: 3 }, t);
    this.seed({ id: 100, prize: "رصيد متجر 25$ · Store balance", status: "active", endsAt: iso(t + 6 * DAY), winnersCount: 2, servers: ["main", "catalog"], authorize: false, entries: 0, blocked: 0, channel: 1 }, t);
    this.seed({ id: 99, prize: "5,000 Robux", status: "ended", endsAt: iso(t - 2 * DAY), winnersCount: 10, servers: ["catalog"], authorize: true, entries: 212, blocked: 57, channel: 3 }, t);
    this.seed({ id: 98, prize: "Discord Nitro Basic", status: "ended", endsAt: iso(t - 6 * DAY), winnersCount: 1, servers: [], authorize: true, entries: 74, blocked: 12, channel: 0 }, t);
    this.seed({ id: 97, prize: "VIP Pass · JoHood Catalog", status: "failed", endsAt: iso(t - 9 * DAY), winnersCount: 1, servers: ["catalog"], authorize: true, entries: 0, blocked: 3, channel: 4 }, t);
  }

  private seed(
    s: { id: number; prize: string; status: AdminGiveaway["status"]; endsAt: string; winnersCount: number; servers: ("main" | "catalog")[]; authorize: boolean; entries: number; blocked: number; channel: number },
    t: number,
  ) {
    const ch = MOCK_CHANNELS[s.channel];
    const servers = s.servers.map((k) => ({ ...SERVERS[k] }));
    const g: Stored = {
      id: s.id,
      prize: s.prize,
      status: s.status,
      endsAt: s.endsAt,
      winnersCount: s.winnersCount,
      hostId: "900000000000000901",
      entries: 0,
      blocked: 0,
      attempts: 0,
      requirements: { servers, authorize: s.authorize },
      winners: [],
      messageUrl: `https://discord.com/channels/${ch.guildKey === "main" ? SERVERS.main.id : SERVERS.catalog.id}/${ch.id}/${3000 + s.id}`,
      bannerUrl: null,
      channelName: ch.name,
      guildName: ch.guildName,
      participants: [],
      blockedList: [],
      nextPerson: s.id * 37,
    };
    const end = Date.parse(s.endsAt);
    const start = Math.min(end, t) - 3 * DAY;
    for (let i = 0; i < s.entries; i++) this.addEntry(g, start + this.rand() * (Math.min(end, t) - start));
    for (let i = 0; i < s.blocked; i++) this.addBlocked(g, start + this.rand() * (Math.min(end, t) - start));
    if (s.status === "ended") g.winners = this.draw(g, s.winnersCount);
    this.items.set(g.id, g);
  }

  private missingFor(g: Stored): MissingRequirement[] {
    const options: MissingRequirement[] = [
      ...g.requirements.servers.map((x) => ({ type: "server" as const, key: x.key, name: x.name })),
      ...(g.requirements.authorize ? [{ type: "authorize" as const }] : []),
    ];
    if (!options.length) return [];
    const picked = options.filter(() => this.rand() < 0.5);
    return picked.length ? picked : [options[Math.floor(this.rand() * options.length)]];
  }

  private addEntry(g: Stored, at: number) {
    const p = person(g.nextPerson++);
    g.participants.push({ ...p, joinedAt: new Date(at).toISOString() });
    g.entries = g.participants.length;
    g.attempts += 1 + (this.rand() < 0.2 ? 1 : 0);
  }

  private addBlocked(g: Stored, at: number) {
    const missing = this.missingFor(g);
    if (!missing.length) return;
    const p = person(g.nextPerson++);
    const tries = 1 + Math.floor(this.rand() * 4);
    const first = at - this.rand() * 6 * HOUR;
    g.blockedList.push({ ...p, missing, attempts: tries, firstAt: new Date(first).toISOString(), lastAt: new Date(at).toISOString() });
    g.blocked = g.blockedList.length;
    g.attempts += tries;
  }

  private draw(g: Stored, n: number, exclude: Set<string> = new Set()) {
    const pool = g.participants.filter((p) => !exclude.has(p.userId));
    const winners: { id: string; name: string }[] = [];
    const copy = [...pool];
    while (winners.length < n && copy.length) {
      const [p] = copy.splice(Math.floor(this.rand() * copy.length), 1);
      winners.push({ id: p.userId, name: p.name });
    }
    return winners;
  }

  private public(g: Stored): AdminGiveaway {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip the private lists
    const { participants, blockedList, image, nextPerson, ...rest } = g;
    return { ...rest, winners: [...rest.winners], requirements: { ...rest.requirements, servers: rest.requirements.servers.map((s) => ({ ...s })) } };
  }

  private must(id: number) {
    const g = this.items.get(id);
    if (!g) throw new ProviderError("not_found", "Giveaway not found");
    return g;
  }

  /** Ends giveaways whose time is up (the bot would do this on its own). */
  private settle() {
    const t = this.now();
    for (const g of this.items.values()) {
      if (g.status === "active" && Date.parse(g.endsAt) <= t) {
        g.status = g.entries ? "ended" : "failed";
        g.winners = this.draw(g, g.winnersCount);
        this.onChange(this.public(g));
      }
    }
  }

  async list() {
    this.settle();
    return [...this.items.values()].sort((a, b) => b.id - a.id).map((g) => this.public(g));
  }

  async get(id: number) {
    this.settle();
    const g = this.items.get(id);
    return g ? this.public(g) : null;
  }

  async participants(id: number) {
    const g = this.must(id);
    return {
      entries: [...g.participants].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)).slice(0, 1000),
      blocked: [...g.blockedList].sort((a, b) => b.lastAt.localeCompare(a.lastAt)).slice(0, 1000),
    };
  }

  async channels() {
    return MOCK_CHANNELS.map((c) => ({ ...c }));
  }

  async banner(id: number) {
    const g = this.must(id);
    if (g.image) return { contentType: g.image.type, base64: g.image.base64 };
    return { contentType: "image/svg+xml", base64: Buffer.from(placeholderBanner(g.prize, g.status !== "active")).toString("base64") };
  }

  async create(input: CreateGiveawayInput) {
    const prize = input.prize.trim();
    if (!prize || [...prize].length > GIVEAWAY_LIMITS.prizeMax) throw new ProviderError("invalid", "prize must be 1 to 120 characters");
    if (!Number.isInteger(input.minutes) || input.minutes < GIVEAWAY_LIMITS.minutesMin || input.minutes > GIVEAWAY_LIMITS.minutesMax) throw new ProviderError("invalid", "minutes must be 1 to 129600");
    if (!Number.isInteger(input.winners) || input.winners < GIVEAWAY_LIMITS.winnersMin || input.winners > GIVEAWAY_LIMITS.winnersMax) throw new ProviderError("invalid", "winners must be 1 to 50");
    const ch = MOCK_CHANNELS.find((c) => c.id === input.channelId);
    if (!ch) throw new ProviderError("invalid", "unknown channel");
    if (input.imageBase64 !== undefined) {
      if (!input.imageType || !(IMAGE_TYPES as readonly string[]).includes(input.imageType)) throw new ProviderError("invalid", "unsupported image type");
      if (base64Bytes(input.imageBase64) > GIVEAWAY_LIMITS.imageMaxBytes) throw new ProviderError("invalid", "image is larger than 5 MB");
    }
    const id = Math.max(0, ...this.items.keys()) + 1;
    const g: Stored = {
      id,
      prize,
      status: "active",
      endsAt: new Date(this.now() + input.minutes * MIN).toISOString(),
      winnersCount: input.winners,
      hostId: input.actor.discordId,
      entries: 0,
      blocked: 0,
      attempts: 0,
      requirements: { servers: [...new Set(input.servers)].map((k) => ({ ...SERVERS[k] })), authorize: input.authorize },
      winners: [],
      messageUrl: `https://discord.com/channels/${ch.guildKey === "main" ? SERVERS.main.id : SERVERS.catalog.id}/${ch.id}/${4000 + id}`,
      bannerUrl: null,
      channelName: ch.name,
      guildName: ch.guildName,
      participants: [],
      blockedList: [],
      image: input.imageBase64 && input.imageType ? { type: input.imageType, base64: input.imageBase64 } : undefined,
      nextPerson: id * 41,
    };
    this.items.set(id, g);
    this.onChange(this.public(g));
    return { id };
  }

  async end(id: number, actor: MemberRef) {
    void actor;
    const g = this.must(id);
    if (g.status !== "active") throw new ProviderError("conflict", "Giveaway is not running");
    g.status = g.entries ? "ended" : "failed";
    g.endsAt = new Date(this.now()).toISOString();
    g.winners = this.draw(g, g.winnersCount);
    this.onChange(this.public(g));
    return { winners: [...g.winners] };
  }

  async reroll(id: number, actor: MemberRef) {
    void actor;
    const g = this.must(id);
    if (g.status !== "ended") throw new ProviderError("conflict", "Only ended giveaways can be rerolled");
    const previous = new Set(g.winners.map((w) => w.id));
    const fresh = this.draw(g, g.winnersCount, previous);
    g.winners = fresh.length ? fresh : this.draw(g, g.winnersCount);
    this.onChange(this.public(g));
    return { winners: [...g.winners] };
  }

  /** Simulation step (called by the mock provider about once a second). */
  tick() {
    this.settle();
    for (const g of this.items.values()) {
      if (g.status !== "active") continue;
      const r = this.rand();
      if (r < 0.06) this.addEntry(g, this.now());
      else if (r < 0.085) this.addBlocked(g, this.now());
      else continue;
      this.onChange(this.public(g));
    }
  }
}

/** Mock-only banner: cream stage, a red gift and the prize. */
export function placeholderBanner(prize: string, ended: boolean) {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const red = ended ? "#a8a29e" : "#e11d48";
  const deep = ended ? "#78716c" : "#9f1239";
  const title = prize.length > 36 ? `${prize.slice(0, 35)}…` : prize;
  // Long prizes shrink so they never run off the 1200px canvas.
  const size = Math.min(64, Math.floor(1700 / Math.max(1, title.length)));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><defs><radialGradient id="b" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#fffaf5"/><stop offset="1" stop-color="${ended ? "#e7e5e4" : "#fde3cf"}"/></radialGradient></defs><rect width="1200" height="675" fill="url(#b)"/><g transform="translate(595 630) scale(.85)"><path d="M-110 -120 L20 -105 L20 0 L-110 -15Z" fill="${red}"/><path d="M20 -105 L110 -135 L110 -30 L20 0Z" fill="${deep}"/><path d="M-50 -112 L-22 -108 L-22 -4 L-50 -8Z" fill="#fff7ef"/><path d="M-120 -150 L28 -130 L28 -102 L-120 -122Z" fill="${red}"/><path d="M28 -130 L120 -162 L120 -134 L28 -102Z" fill="${deep}"/></g><text x="600" y="230" text-anchor="middle" font-family="Rubik, Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="8" fill="${red}">${ended ? "GIVEAWAY FINISHED" : "GIVEAWAY"}</text><text x="600" y="330" text-anchor="middle" font-family="Rubik, Arial, sans-serif" font-size="${size}" font-weight="800" fill="#2a171c">${esc(title)}</text><text x="1100" y="80" text-anchor="end" font-family="Rubik, Arial, sans-serif" font-size="36" font-weight="800" fill="${red}">JoHood</text></svg>`;
}
