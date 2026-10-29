/**
 * The mock's "community" side (round 3): the members directory with badges,
 * member access and Discord roles, the Roblox world (linked players, link
 * candidates, players outside the server) and leaderboards.
 *
 * Everything here is derived from the main simulation's members, purchases
 * and tickets, plus a hash of each member's ID for activity numbers — so it
 * never draws from the simulation's seeded PRNG and doesn't shift the data
 * other tests rely on.
 */
import type {
  AccessRole,
  Badge,
  Candidate,
  CandidateQuery,
  DiscordRole,
  GiveawayJoin,
  GuildKey,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardKind,
  LeaderboardPeriod,
  LinkedPlayer,
  LinkedSort,
  MemberAccess,
  MemberListQuery,
  MemberRef,
  MemberRow,
  NumberedPage,
  OutsidePlayer,
  OutsideSort,
  PagedQuery,
  PurchaseEvent,
  Role,
  RoleChangeInput,
  Ticket,
} from "../types";
import { ROLES } from "../types";
import { ROLE_PERMISSIONS } from "../permissions";
import { createRng, int, pick } from "../rng";
import { DAY, HOUR, MINUTE } from "../time";
import { ProviderError } from "./errors";
import { FIRST, MAIN_ROLES, MOCK_STAFF, SERVER_ROLES, STAFF_ROLE_IDS, SUFFIX } from "./mock-data";

/** The parts of a mock member this module reads (and, for roles, writes). */
export interface CommunityMember {
  discordId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  robloxId: string;
  robloxName: string;
  linked: boolean;
  verifiedAt: string;
  guilds: Partial<Record<GuildKey, { joinedAt: string; roleIds: string[] }>>;
  balance: number;
  lifetime: number;
}

export interface CommunitySource {
  members(): readonly CommunityMember[];
  purchases(): readonly PurchaseEvent[];
  tickets(): readonly Ticket[];
  giveaways(): Promise<{ id: number; prize: string; status: string; endsAt: string }[]>;
  /** Throws 501 when the mock plays "backend not built yet". */
  guardMutation(): void;
  now(): number;
}

export interface CommunityOptions {
  /**
   * The day the points system was reset. Before it (null, the default) the
   * server records no per-period activity and only "All time" has data.
   */
  leaderboardSince?: string | null;
}

/** Server ranks by server points (the backend sends the label; these are invented). */
export const SERVER_RANKS: readonly { label: string; min: number; color: string }[] = [
  { label: "Luna", min: 80, color: "#94a3b8" },
  { label: "Astra", min: 300, color: "#38bdf8" },
  { label: "Nova", min: 900, color: "#a78bfa" },
  { label: "Orion", min: 2_200, color: "#f59e0b" },
  { label: "Sol", min: 5_000, color: "#e11d48" },
];

/** Catalog roles that carry a dashboard role (mirrors config/roles.ts for the mock IDs). */
const ROLE_GRANTS: Record<string, Role> = {
  "role-owner": "owner",
  "role-founder": "owner",
  "role-head-managers": "manager",
  "role-manager": "manager",
  "role-dev": "dev",
  "role-head-support": "head_support",
  "role-support": "support",
};

const STAFF_LABEL: Record<Role, string> = { owner: "Owner", manager: "Manager", dev: "Dev", head_support: "Head of Support", support: "Support Staff" };

/** Roles above the bot, and roles Discord manages itself — the bot can't hand these out. */
const NOT_ASSIGNABLE: Record<string, string> = {
  "role-owner": "above_bot",
  "role-founder": "above_bot",
  "main-owner": "above_bot",
  "role-booster": "managed",
  "main-booster": "managed",
};

const EVERYONE: Record<GuildKey, string> = { main: "main-everyone", catalog: "role-everyone" };

/** FNV-1a: stable per-member numbers without touching the seeded PRNG. */
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
const unit = (s: string) => hash(s) / 0xffffffff;

/**
 * Points a member earned from chat and voice before the simulated history
 * (stable per member, heavy-tailed). The mock books them as an "activity"
 * ledger entry so balances, profiles and the ledger agree.
 */
export function activityPoints(discordId: string) {
  return Math.floor(Math.pow(unit(`act:${discordId}`), 3.2) * 6_500);
}

const iso = (t: number) => new Date(t).toISOString();
const clampPage = (n: number | undefined, fallback: number, max: number) => Math.min(max, Math.max(1, Math.floor(n ?? fallback)));

function pageOf<T>(list: readonly T[], page?: number, pageSize?: number): NumberedPage<T> {
  const size = clampPage(pageSize, 25, 100);
  const pages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(clampPage(page, 1, 100_000), pages);
  return { items: list.slice((p - 1) * size, p * size), total: list.length, page: p, pageSize: size };
}

const byName = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" });

export class MockCommunity {
  private readonly src: CommunitySource;
  private readonly since: string | null;
  private readonly staff: CommunityMember[];
  private readonly outside: OutsidePlayer[];
  private readonly invited = new Map<string, string>();
  private readonly nudged = new Map<string, string>();

  constructor(src: CommunitySource, opts: CommunityOptions = {}) {
    this.src = src;
    this.since = opts.leaderboardSince ?? null;
    const now = src.now();
    // Staff are members too: they appear in the directory with their staff badge.
    this.staff = MOCK_STAFF.map((s, i) => {
      const joined = iso(now - (420 - i * 23) * DAY);
      const staffRoles = s.roles.map((r) => STAFF_ROLE_IDS[r]);
      return {
        discordId: s.discordId,
        username: s.name.toLowerCase().replace(/[^a-z0-9]+/g, ""),
        displayName: s.name,
        avatarUrl: i % 3 === 2 ? null : `mock:avatar:staff-${i}`,
        robloxId: String(1_100_000_000 + i * 7_771),
        robloxName: `${s.name.split(" ")[0]}Staff`,
        linked: i % 2 === 0,
        verifiedAt: joined,
        guilds: {
          main: { joinedAt: joined, roleIds: ["main-member", s.roles.includes("owner") ? "main-owner" : "main-mod"] },
          catalog: { joinedAt: joined, roleIds: ["role-member", "role-verified", ...staffRoles] },
        },
        balance: activityPoints(s.discordId),
        lifetime: activityPoints(s.discordId),
      };
    });
    this.outside = seedOutside(now);
  }

  // ---------------------------------------------------------------------------
  // People
  // ---------------------------------------------------------------------------

  private all(): CommunityMember[] {
    return [...this.staff, ...this.src.members()];
  }

  private find(discordId: string) {
    return this.all().find((m) => m.discordId === discordId);
  }

  serverPoints(m: CommunityMember) {
    return m.balance;
  }

  siteRoles(m: CommunityMember): Role[] {
    const ids = new Set(m.guilds.catalog?.roleIds ?? []);
    const roles = new Set(Object.entries(ROLE_GRANTS).flatMap(([id, r]) => (ids.has(id) ? [r] : [])));
    return ROLES.filter((r) => roles.has(r));
  }

  badge(m: CommunityMember): Badge | null {
    const staff = this.siteRoles(m)[0];
    if (staff) return { kind: "staff", label: STAFF_LABEL[staff], color: SERVER_ROLES.find((r) => r.id === STAFF_ROLE_IDS[staff])?.color };
    const pts = this.serverPoints(m);
    const rank = [...SERVER_RANKS].reverse().find((r) => pts >= r.min);
    return rank ? { kind: "rank", label: rank.label, color: rank.color } : null;
  }

  listMembers(q: MemberListQuery = {}): NumberedPage<MemberRow> {
    const guild = q.guild ?? "main";
    const s = q.q?.trim().toLowerCase() ?? "";
    let pool = this.all().filter((m) => m.guilds[guild]);
    if (s) pool = pool.filter((m) => m.displayName.toLowerCase().includes(s) || m.username.includes(s) || m.discordId === s);
    const rows = pool.map((m) => ({
      discordId: m.discordId,
      username: m.username,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl,
      points: this.serverPoints(m),
      linked: m.linked,
      badge: this.badge(m),
      joinedAt: m.guilds[guild]!.joinedAt,
    }));
    const sort = q.sort ?? "points";
    rows.sort((a, b) =>
      sort === "name" ? byName(a.displayName, b.displayName) : sort === "joined" ? (b.joinedAt ?? "").localeCompare(a.joinedAt ?? "") : b.points - a.points || byName(a.displayName, b.displayName),
    );
    return pageOf(rows, q.page, q.pageSize);
  }

  /** Giveaways a member entered (stable per member). */
  async giveawaysFor(m: CommunityMember): Promise<GiveawayJoin[]> {
    const list = await this.src.giveaways();
    return list
      .filter((g) => unit(`gw:${g.id}:${m.discordId}`) < 0.35)
      .map((g) => ({
        id: g.id,
        prize: g.prize,
        joinedAt: iso(Date.parse(g.endsAt) - (2 + Math.floor(unit(`gwt:${g.id}:${m.discordId}`) * 40)) * HOUR),
        won: g.status === "ended" && unit(`gww:${g.id}:${m.discordId}`) < 0.12,
      }))
      .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  }

  member(discordId: string) {
    return this.find(discordId) ?? null;
  }

  // ---------------------------------------------------------------------------
  // Access and Discord roles
  // ---------------------------------------------------------------------------

  private roleCatalog(guild: GuildKey): AccessRole[] {
    const pool: DiscordRole[] = guild === "main" ? MAIN_ROLES : SERVER_ROLES;
    const roles: AccessRole[] = pool.map((r, i) => {
      const grant = ROLE_GRANTS[r.id];
      const reason = NOT_ASSIGNABLE[r.id];
      return {
        id: r.id,
        name: r.name,
        color: r.color,
        position: pool.length - i,
        assignable: !reason,
        ...(reason ? { reason } : {}),
        permissions: grant && guild === "catalog" ? [...ROLE_PERMISSIONS[grant]] : [],
      };
    });
    roles.push({ id: EVERYONE[guild], name: "@everyone", color: "#94a3b8", position: 0, assignable: false, reason: "everyone", permissions: [] });
    return roles;
  }

  access(discordId: string, guild: GuildKey = "catalog"): MemberAccess | null {
    const m = this.find(discordId);
    const membership = m?.guilds[guild];
    if (!m || !membership) return null;
    return {
      discordId,
      siteRoles: this.siteRoles(m),
      overrides: { allow: [], deny: [] },
      memberRoleIds: [...membership.roleIds],
      roles: this.roleCatalog(guild),
    };
  }

  setRoles(discordId: string, input: RoleChangeInput, guild: GuildKey = "catalog") {
    this.src.guardMutation();
    const m = this.find(discordId);
    const membership = m?.guilds[guild];
    if (!m || !membership) throw new ProviderError("not_found", "Not a member of this server");
    const catalog = new Map(this.roleCatalog(guild).map((r) => [r.id, r]));
    for (const id of [...input.add, ...input.remove]) {
      const role = catalog.get(id);
      if (!role) throw new ProviderError("invalid", `Unknown role ${id}`);
      if (!role.assignable) throw new ProviderError("invalid", `The bot can't manage ${role.name}`);
    }
    const next = new Set(membership.roleIds);
    for (const id of input.add) next.add(id);
    for (const id of input.remove) next.delete(id);
    // Keep Discord's order (highest first).
    membership.roleIds = [...catalog.values()].filter((r) => next.has(r.id)).map((r) => r.id);
    return { memberRoleIds: [...membership.roleIds] };
  }

  // ---------------------------------------------------------------------------
  // Roblox
  // ---------------------------------------------------------------------------

  private spend() {
    const by = new Map<string, { purchases: number; robux: number; last: string }>();
    for (const p of this.src.purchases()) {
      const cur = by.get(p.robloxId) ?? { purchases: 0, robux: 0, last: p.at };
      cur.purchases += 1;
      cur.robux += p.robux;
      if (p.at > cur.last) cur.last = p.at;
      by.set(p.robloxId, cur);
    }
    return by;
  }

  linked(q: PagedQuery<LinkedSort> = {}): NumberedPage<LinkedPlayer> {
    const guild = q.guild ?? "main";
    const spend = this.spend();
    const s = q.q?.trim().toLowerCase() ?? "";
    let pool = this.all().filter((m) => m.linked && m.guilds[guild]);
    if (s) pool = pool.filter((m) => m.displayName.toLowerCase().includes(s) || m.robloxName.toLowerCase().includes(s) || m.discordId === s || m.robloxId === s);
    const rows: LinkedPlayer[] = pool.map((m) => ({
      discordId: m.discordId,
      discordName: m.displayName,
      avatarUrl: m.avatarUrl,
      robloxId: m.robloxId,
      robloxName: m.robloxName,
      robloxAvatarUrl: null,
      linkedAt: m.verifiedAt,
      purchases: spend.get(m.robloxId)?.purchases ?? 0,
      spentRobux: spend.get(m.robloxId)?.robux ?? 0,
      points: this.serverPoints(m),
    }));
    const sort = q.sort ?? "spent";
    rows.sort((a, b) => (sort === "linked" ? b.linkedAt.localeCompare(a.linkedAt) : sort === "points" ? b.points - a.points : b.spentRobux - a.spentRobux) || byName(a.discordName, b.discordName));
    return pageOf(rows, q.page, q.pageSize);
  }

  candidates(q: CandidateQuery = {}): NumberedPage<Candidate> {
    const guild = q.guild ?? "main";
    const now = this.src.now();
    const open = new Map<string, string>();
    for (const t of this.src.tickets()) if (t.status !== "closed" && !open.has(t.openedBy.discordId)) open.set(t.openedBy.discordId, t.id);
    const s = q.q?.trim().toLowerCase() ?? "";
    // "Very active": the top of the unlinked crowd by server points.
    let pool = this.all().filter((m) => !m.linked && m.guilds[guild] && this.serverPoints(m) >= 120);
    if (s) pool = pool.filter((m) => m.displayName.toLowerCase().includes(s) || m.username.includes(s) || m.discordId === s);
    let rows: Candidate[] = pool.map((m) => ({
      discordId: m.discordId,
      name: m.displayName,
      avatarUrl: m.avatarUrl,
      points: this.serverPoints(m),
      openTicketId: open.get(m.discordId) ?? null,
      lastActiveAt: iso(now - Math.floor(unit(`seen:${m.discordId}`) * 4 * DAY)),
      invitedAt: this.invited.get(m.discordId) ?? null,
    }));
    if (q.hasTicket) rows = rows.filter((r) => r.openTicketId);
    if (q.minPoints) rows = rows.filter((r) => r.points >= q.minPoints!);
    rows.sort((a, b) => (q.sort === "ticket" ? Number(Boolean(b.openTicketId)) - Number(Boolean(a.openTicketId)) : 0) || b.points - a.points || byName(a.name, b.name));
    return pageOf(rows, q.page, q.pageSize);
  }

  invite(discordId: string, actor: MemberRef) {
    void actor;
    this.src.guardMutation();
    const m = this.find(discordId);
    if (!m) throw new ProviderError("not_found", "Unknown member");
    if (m.linked) throw new ProviderError("conflict", "Already linked");
    const invitedAt = iso(this.src.now());
    this.invited.set(discordId, invitedAt);
    return { invitedAt };
  }

  outsidePlayers(q: PagedQuery<OutsideSort> = {}): NumberedPage<OutsidePlayer> {
    const s = q.q?.trim().toLowerCase() ?? "";
    let rows = this.outside.map((p) => ({ ...p, nudgedAt: this.nudged.get(p.robloxId) ?? null }));
    if (s) rows = rows.filter((p) => p.robloxName.toLowerCase().includes(s) || p.robloxId === s);
    rows.sort((a, b) => (q.sort === "last" ? b.lastPurchaseAt.localeCompare(a.lastPurchaseAt) : b.spentRobux - a.spentRobux) || byName(a.robloxName, b.robloxName));
    return pageOf(rows, q.page, q.pageSize);
  }

  nudge(robloxId: string, actor: MemberRef) {
    void actor;
    this.src.guardMutation();
    if (!this.outside.some((p) => p.robloxId === robloxId)) throw new ProviderError("not_found", "Unknown player");
    const nudgedAt = iso(this.src.now());
    this.nudged.set(robloxId, nudgedAt);
    return { nudgedAt };
  }

  // ---------------------------------------------------------------------------
  // Leaderboards
  // ---------------------------------------------------------------------------

  leaderboard(q: { kind: LeaderboardKind; period: LeaderboardPeriod; limit?: number; guild?: GuildKey }): Leaderboard {
    const guild = q.guild ?? "main";
    const now = this.src.now();
    const base = { kind: q.kind, period: q.period, updatedAt: iso(Math.floor(now / MINUTE) * MINUTE) };
    if (q.period !== "all" && !this.since) return { ...base, available: false, since: null, items: [] };
    const share: Record<LeaderboardPeriod, number> = { day: 0.015, "2d": 0.03, week: 0.09, month: 0.32, all: 1 };
    const value = (m: CommunityMember) => {
      const u = unit(`${q.kind}:${guild}:${m.discordId}`);
      const total =
        q.kind === "general"
          ? this.serverPoints(m)
          : q.kind === "chat"
            ? Math.floor(Math.pow(u, 2.6) * 24_000)
            : q.kind === "voice"
              ? Math.floor(Math.pow(u, 2.8) * 30_000) // minutes
              : Math.floor(Math.pow(u, 2.4) * 5_200);
      if (q.period === "all") return total;
      // A period is a slice of the total, jittered per member so the order shuffles.
      return Math.floor(total * share[q.period] * (0.4 + 1.2 * unit(`${q.period}:${q.kind}:${m.discordId}`)));
    };
    const limit = Math.min(100, Math.max(1, q.limit ?? 50));
    const items: LeaderboardEntry[] = this.all()
      .filter((m) => m.guilds[guild])
      .map((m) => ({ m, v: value(m) }))
      .filter((x) => x.v > 0)
      .sort((a, b) => b.v - a.v || byName(a.m.displayName, b.m.displayName))
      .slice(0, limit)
      .map(({ m, v }, i) => {
        const d = Math.round((unit(`delta:${q.kind}:${q.period}:${m.discordId}:${Math.floor(now / DAY)}`) - 0.5) * 8);
        return {
          rank: i + 1,
          discordId: m.discordId,
          name: m.displayName,
          avatarUrl: m.avatarUrl,
          value: v,
          badge: this.badge(m),
          ...(d !== 0 ? { delta: d } : {}),
        };
      });
    return { ...base, available: true, since: q.period === "all" ? null : this.since, items };
  }
}

/** Players who bought in the game but never joined the Discord server. */
function seedOutside(now: number): OutsidePlayer[] {
  const rng = createRng(4_321);
  const used = new Set<string>();
  return Array.from({ length: 46 }, (_, i) => {
    let name = `${pick(rng, FIRST)}${pick(rng, SUFFIX)}`;
    while (used.has(name)) name = `${name}${int(rng, 2, 99)}`;
    used.add(name);
    const purchases = 1 + Math.floor(Math.pow(rng(), 2.2) * 14);
    return {
      robloxId: String(3_000_000_000 + i * 104_729),
      robloxName: name,
      robloxAvatarUrl: null,
      spentRobux: purchases * int(rng, 35, 420),
      purchases,
      lastPurchaseAt: iso(now - Math.floor(Math.pow(rng(), 1.6) * 40 * DAY)),
      nudgedAt: null,
    };
  });
}
