/**
 * Mock giveaways: six believable giveaways relative to "now", plus per-member
 * state (authorized, servers, joined) so the whole public flow can be clicked
 * through without Discord. A giveaway that passes its end time is ended on
 * the next read and winners are drawn from its entrants.
 */
import type { Giveaway, GiveawaysApi, JoinResult, Requirement, Winner } from "./types";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const MOCK_MEMBER = { id: "mock-member-1", name: "Mock Member", avatarUrl: "mock:avatar:member-1" } as const;

const SERVERS = {
  main: { key: "main", id: "mock-guild-main", name: "JoHood" },
  catalog: { key: "catalog", id: "mock-guild-catalog", name: "JoHood Catalog", inviteUrl: "https://discord.com/invite/johood-catalog" },
} as const;

const NAMES = ["Laith", "ريم", "Faris", "سارة", "Yazan", "نور", "Hala", "عمر", "Dana", "زيد", "Kareem", "ليان", "Tamer", "جود", "Mira", "حمزة", "Saif", "تالا"];

function fakeWinner(i: number, seed: number): Winner {
  const n = (seed * 7 + i * 13) % NAMES.length;
  return { id: `9000000000${String(200000 + seed * 100 + i).padStart(8, "0")}`, name: NAMES[n], avatarUrl: i % 4 === 3 ? undefined : `mock:avatar:winner-${seed}-${i}` };
}

interface MemberState {
  authorized: boolean;
  servers: Set<string>;
  joined: Set<number>;
}

type Stored = Omit<Giveaway, "joined" | "authorized" | "missing"> & { entrants: Set<string> };

export class MockGiveaways implements GiveawaysApi {
  private items = new Map<number, Stored>();
  private members = new Map<string, MemberState>();
  private now: () => number;

  constructor(opts: { now?: () => number; start?: number } = {}) {
    this.now = opts.now ?? Date.now;
    const t = opts.start ?? this.now();
    const iso = (ms: number) => new Date(ms).toISOString();
    const host = { hostId: "900000000000000901", hostName: "Faris", hostAvatarUrl: "mock:avatar:staff-5" };
    const seedEntrants = (n: number, id: number) => new Set(Array.from({ length: n }, (_, i) => `entrant-${id}-${i}`));
    const add = (g: Omit<Stored, "entrants" | "winners"> & { winners?: Winner[] }) => {
      this.items.set(g.id, { ...g, winners: g.winners ?? [], entrants: seedEntrants(g.entries, g.id) });
    };

    add({ id: 1, prize: "Discord Nitro · 3 months", status: "active", endsAt: iso(t + 2 * DAY + 5 * HOUR + 17 * MIN), winnersCount: 3, ...host, entries: 482,
      requirements: { servers: [SERVERS.catalog], authorize: true }, messageUrl: "https://discord.com/channels/mock-guild-main/111/2001" });
    add({ id: 2, prize: "10,000 Robux", status: "active", endsAt: iso(t + 9 * HOUR + 42 * MIN), winnersCount: 1, hostId: "900000000000000902", hostName: "لينا", hostAvatarUrl: "mock:avatar:staff-6", entries: 1287,
      requirements: { servers: [], authorize: true }, messageUrl: "https://discord.com/channels/mock-guild-main/111/2002" });
    add({ id: 3, prize: "رصيد متجر 25$ · Store balance", status: "active", endsAt: iso(t + 55 * 1000), winnersCount: 2, ...host, entries: 96,
      requirements: { servers: [SERVERS.main], authorize: true }, messageUrl: "https://discord.com/channels/mock-guild-main/111/2003" });
    add({ id: 4, prize: "5,000 Robux", status: "ended", endsAt: iso(t - 2 * DAY), winnersCount: 10, ...host, entries: 2310,
      requirements: { servers: [SERVERS.catalog], authorize: true }, messageUrl: "https://discord.com/channels/mock-guild-main/111/1990",
      winners: Array.from({ length: 10 }, (_, i) => fakeWinner(i, 4)) });
    add({ id: 5, prize: "Discord Nitro Basic", status: "ended", endsAt: iso(t - 6 * DAY), winnersCount: 1, hostId: "900000000000000902", hostName: "لينا", hostAvatarUrl: "mock:avatar:staff-6", entries: 744,
      requirements: { servers: [], authorize: true }, messageUrl: "https://discord.com/channels/mock-guild-main/111/1985", winners: [fakeWinner(0, 5)] });
    add({ id: 6, prize: "VIP Pass · JoHood Catalog", status: "ended", endsAt: iso(t - 11 * DAY), winnersCount: 2, ...host, entries: 0,
      requirements: { servers: [SERVERS.catalog], authorize: false }, messageUrl: null, winners: [] });

    // The mock member: in the community server, not yet in JoHood Catalog, not authorized.
    this.members.set(MOCK_MEMBER.id, { authorized: false, servers: new Set(["main"]), joined: new Set() });
  }

  private member(id: string): MemberState {
    let m = this.members.get(id);
    if (!m) this.members.set(id, (m = { authorized: false, servers: new Set(["main"]), joined: new Set() }));
    return m;
  }

  /** End giveaways whose time has passed and draw winners from entrants. */
  private settle(g: Stored) {
    if (g.status !== "active" || Date.parse(g.endsAt) > this.now()) return;
    g.status = "ended";
    const pool = [...g.entrants];
    const n = Math.min(g.winnersCount, pool.length);
    const winners: Winner[] = [];
    for (let i = 0; i < n; i++) {
      const pick = pool.splice((i * 7919 + g.id) % pool.length, 1)[0];
      winners.push(pick === MOCK_MEMBER.id ? { id: MOCK_MEMBER.id, name: MOCK_MEMBER.name, avatarUrl: MOCK_MEMBER.avatarUrl } : fakeWinner(i, g.id));
    }
    g.winners = winners;
  }

  private missingFor(g: Stored, memberId: string): Requirement[] {
    const m = this.member(memberId);
    const out: Requirement[] = [];
    for (const s of g.requirements.servers) if (!m.servers.has(s.key)) out.push({ type: "server", key: s.key, name: s.name });
    if (g.requirements.authorize && !m.authorized) out.push({ type: "authorize" });
    return out;
  }

  private view(g: Stored, memberId?: string): Giveaway {
    this.settle(g);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { entrants, ...pub } = g;
    const base: Giveaway = { ...pub, winners: g.status === "ended" ? [...g.winners] : [], requirements: { servers: [...g.requirements.servers], authorize: g.requirements.authorize } };
    if (!memberId) return base;
    const m = this.member(memberId);
    return { ...base, joined: m.joined.has(g.id), authorized: m.authorized, missing: this.missingFor(g, memberId) };
  }

  async list() {
    return [...this.items.values()].map((g) => this.view(g));
  }

  async get(id: number, memberId?: string) {
    const g = this.items.get(id);
    return g ? this.view(g, memberId) : null;
  }

  async join(id: number, memberId: string): Promise<JoinResult> {
    const g = this.items.get(id);
    if (!g) return { status: "notfound" };
    this.settle(g);
    if (g.status === "ended") return { status: "ended" };
    const m = this.member(memberId);
    if (m.joined.has(id)) return { status: "already" };
    const missing = this.missingFor(g, memberId);
    if (missing.length) return { status: "missing", missing };
    m.joined.add(id);
    g.entrants.add(memberId);
    g.entries += 1;
    return { status: "joined" };
  }

  async authorizeState(memberId: string) {
    return { authorized: this.member(memberId).authorized };
  }

  async revoke(memberId: string) {
    const m = this.member(memberId);
    const removed = m.authorized;
    m.authorized = false;
    return { removed };
  }

  // --- mock-only helpers (stand-ins for Discord OAuth and server joins) ----

  /** What the OAuth callback does in real mode: record the authorization. */
  mockAuthorize(memberId: string) {
    this.member(memberId).authorized = true;
  }

  /** Pretend the member joined a server through its invite. */
  mockJoinServer(memberId: string, key: string) {
    this.member(memberId).servers.add(key);
  }
}
