/**
 * Mock provider: a self-contained simulation of the JoHood backend.
 *
 * On construction it generates ~8 weeks of history from a seeded PRNG
 * (reproducible in tests), then a 1s ticker keeps everything moving:
 * purchases arrive from the "Roblox map", transfers progress, assistants hop
 * between voice rooms, bots fluctuate and occasionally error.
 *
 * Tests construct it with `autoTick: false` and drive `tick(now)` by hand.
 */
import type {
  ActivityItem,
  Assistant,
  AssistantAction,
  BotAction,
  BotLogLine,
  BotName,
  BotStatus,
  DataProvider,
  LedgerEntry,
  ListQuery,
  LiveEvent,
  LogLevel,
  MemberProfile,
  MemberRef,
  MemberSummary,
  Page,
  PointsAdjustInput,
  PointsSummary,
  ProtectionPatch,
  ProtectionSettings,
  PurchaseEvent,
  RankInfo,
  Redemption,
  RoleInfo,
  ServerStats,
  StaffMember,
  Ticket,
  TicketAction,
  TicketCategory,
  TicketQuery,
  TicketSummary,
  TotalsBucket,
  Transfer,
  TransferStatus,
} from "../types";
import { BOT_NAMES, RANKS } from "../types";
import { chance, createRng, int, pick, weighted, type Rng } from "../rng";
import { DAY, HOUR, MINUTE, dayKey, lastDays, lastWeeks, weekKey } from "../time";
import { ProviderError } from "./errors";
import {
  BOT_META,
  CATALOG,
  COMMANDS,
  FIRST,
  FIRST_AR,
  LOG_LINES,
  MOCK_STAFF,
  RANK_TABLE,
  REWARDS,
  SERVER_ROLES,
  STAFF_ROLE_IDS,
  SUFFIX,
  TICKET_SUBJECTS,
  TRANSFER_RATE,
  VOICE_ROOMS,
  cashbackFor,
  rankFor,
} from "./mock-data";

interface MockMember {
  discordId: string;
  username: string;
  displayName: string;
  robloxId: string;
  robloxName: string;
  linked: boolean;
  verifiedAt: string;
  joinedAt: string;
  roleIds: string[];
  balance: number;
  lifetime: number;
  totalRobux: number;
}

interface Scheduled {
  at: number;
  run: (now: number) => void;
}

export interface MockOptions {
  seed?: number;
  /** "Current" time for history generation. */
  now?: number;
  /** Days of history to generate. */
  historyDays?: number;
  members?: number;
  /** Start the 1s live ticker (default true). */
  autoTick?: boolean;
  /** PRNG for live events; defaults to Math.random. */
  liveRng?: Rng;
}

const MAX_ACTIVITY = 300;
const MAX_LOGS_PER_BOT = 400;
const BASE_SERVER_MEMBERS = 4_560;

const iso = (t: number) => new Date(t).toISOString();
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export class MockProvider implements DataProvider {
  readonly kind = "mock" as const;

  private rng: Rng;
  private live: Rng;
  private seq = 0;
  private tickCount = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(e: LiveEvent) => void>();
  private scheduled: Scheduled[] = [];

  private members: MockMember[] = [];
  private byId = new Map<string, MockMember>();
  private purchases: PurchaseEvent[] = [];
  private transfers: Transfer[] = [];
  private redemptions: Redemption[] = [];
  private ledger: LedgerEntry[] = [];
  private ledgerByMember = new Map<string, LedgerEntry[]>();
  private tickets: Ticket[] = [];
  private activity: ActivityItem[] = [];
  private logs = new Map<BotName, BotLogLine[]>();
  private bots = new Map<BotName, BotStatus>();
  private assistants = new Map<BotName, Assistant>();
  private protection!: ProtectionSettings;
  private stats!: ServerStats;
  private ticketNo = 1000;

  constructor(opts: MockOptions = {}) {
    const now = opts.now ?? Date.now();
    this.rng = createRng(opts.seed ?? 962);
    this.live = opts.liveRng ?? Math.random;
    this.seedMembers(opts.members ?? 260, now);
    this.seedHistory(opts.historyDays ?? 56, now);
    this.seedBots(now);
    this.seedTickets(now);
    this.seedProtection(now);
    this.stats = {
      at: iso(now),
      members: BASE_SERVER_MEMBERS + this.members.length,
      online: 640,
      newToday: this.members.filter((m) => dayKey(m.joinedAt) === dayKey(now)).length + 11,
      ticketsOpen: this.openTicketCount(),
      inVoice: this.voiceCount(),
      boosts: 14,
    };
    if (opts.autoTick ?? true) this.start();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 1000);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private id(prefix: string) {
    this.seq += 1;
    return `${prefix}_${this.seq.toString(36).padStart(6, "0")}`;
  }

  private emit(event: LiveEvent) {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch {
        // A broken listener must not stop the simulation.
      }
    }
  }

  subscribe(listener: (e: LiveEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private schedule(at: number, run: (now: number) => void) {
    this.scheduled.push({ at, run });
  }

  // -------------------------------------------------------------------------
  // Seeding
  // -------------------------------------------------------------------------

  private seedMembers(count: number, now: number) {
    const used = new Set<string>();
    for (let i = 0; i < count; i++) {
      const first = pick(this.rng, FIRST);
      let robloxName = `${first}${pick(this.rng, SUFFIX)}`;
      while (used.has(robloxName.toLowerCase())) robloxName = `${first}${pick(this.rng, SUFFIX)}${int(this.rng, 1, 999)}`;
      used.add(robloxName.toLowerCase());
      const arabic = FIRST_AR[first];
      const displayName = arabic && chance(this.rng, 0.45) ? arabic : first;
      const joinedAt = now - int(this.rng, 0, 600) * DAY - int(this.rng, 0, DAY);
      const linked = chance(this.rng, 0.9);
      const roleIds = ["role-member"];
      if (linked) roleIds.push("role-verified");
      if (chance(this.rng, 0.08)) roleIds.push("role-vip");
      if (chance(this.rng, 0.05)) roleIds.push("role-booster");
      const m: MockMember = {
        discordId: `9000000000${String(100000 + i).padStart(8, "0")}`,
        username: robloxName.toLowerCase(),
        displayName,
        robloxId: String(1_000_000_000 + Math.floor(this.rng() * 8_000_000_000)),
        robloxName,
        linked,
        verifiedAt: iso(joinedAt + int(this.rng, 1, 30) * HOUR),
        joinedAt: iso(joinedAt),
        roleIds,
        balance: 0,
        lifetime: 0,
        totalRobux: 0,
      };
      this.members.push(m);
      this.byId.set(m.discordId, m);
    }
  }

  private seedHistory(days: number, now: number) {
    type Plan = { at: number; kind: "purchase" | "transfer" | "redeem" };
    const plans: Plan[] = [];
    for (let d = days - 1; d >= 0; d--) {
      const dayStart = now - d * DAY - (now % DAY);
      const date = new Date(dayStart);
      const weekend = date.getUTCDay() === 5 || date.getUTCDay() === 6;
      const growth = 1 + (days - d) / days / 2;
      const purchasesToday = Math.round((34 + this.rng() * 22) * growth * (weekend ? 1.35 : 1));
      for (let i = 0; i < purchasesToday; i++) plans.push({ at: dayStart + this.diurnal(), kind: "purchase" });
      for (let i = 0, n = int(this.rng, 4, 11); i < n; i++) plans.push({ at: dayStart + this.diurnal(), kind: "transfer" });
      for (let i = 0, n = int(this.rng, 3, 9); i < n; i++) plans.push({ at: dayStart + this.diurnal(), kind: "redeem" });
    }
    plans.sort((a, b) => a.at - b.at);
    for (const p of plans) {
      if (p.at > now) continue;
      if (p.kind === "purchase") this.makePurchase(p.at, this.rng, false);
      else if (p.kind === "transfer") this.makeTransfer(p.at, this.rng, false, now);
      else this.makeRedemption(p.at, this.rng, false);
    }
  }

  /** Offset into a day weighted towards the evening (Amman time, UTC+3). */
  private diurnal() {
    const hour = weighted(this.rng, [
      [5, 1], [8, 1], [11, 2], [13, 3], [15, 4], [17, 6], [19, 9], [21, 8], [23, 3],
    ] as const);
    return clamp((hour - 3 + this.rng() * 2) * HOUR, 0, DAY - 1);
  }

  private seedBots(now: number) {
    for (const name of BOT_NAMES) {
      const meta = BOT_META[name];
      const started = now - int(this.rng, 2, 400) * HOUR;
      this.bots.set(name, {
        name,
        displayName: meta.displayName,
        kind: meta.kind,
        state: "online",
        startedAt: iso(started),
        restarts24h: weighted(this.rng, [[0, 6], [1, 2], [2, 1]] as const),
        memoryMb: Math.round(meta.memoryLimitMb * (0.3 + this.rng() * 0.3)),
        memoryLimitMb: meta.memoryLimitMb,
        cpuPct: Math.round(this.rng() * 8 * 10) / 10,
        pingMs: int(this.rng, 38, 90),
        version: meta.version,
        lastError: chance(this.rng, 0.4)
          ? { at: iso(now - int(this.rng, 1, 72) * HOUR), message: pick(this.rng, LOG_LINES.error) }
          : null,
      });
      const lines: BotLogLine[] = [];
      for (let i = 60; i > 0; i--) lines.push(this.logLine(name, now - i * int(this.rng, 20, 90) * 1000, this.rng));
      lines.sort((a, b) => a.at.localeCompare(b.at));
      this.logs.set(name, lines);
      if (meta.kind === "assistant") {
        const busy = chance(this.rng, 0.6);
        this.assistants.set(name, this.assistantState(name, busy, now - int(this.rng, 2, 80) * MINUTE, this.rng));
      }
    }
  }

  private assistantState(name: BotName, busy: boolean, since: number, rng: Rng): Assistant {
    const taken = new Set([...this.assistants.values()].filter((a) => a.bot !== name).map((a) => a.room?.id));
    const rooms = VOICE_ROOMS.filter((r) => !taken.has(r.id));
    const room = busy && rooms.length ? pick(rng, rooms) : null;
    const caller = room ? pick(rng, this.members) : null;
    return {
      bot: name,
      displayName: BOT_META[name].displayName,
      state: room ? "busy" : "free",
      room: room ? { id: room.id, name: room.name, listeners: int(rng, 2, 14) } : null,
      calledBy: caller ? this.ref(caller) : null,
      since: room ? iso(since) : null,
    };
  }

  private seedTickets(now: number) {
    const staff = MOCK_STAFF.filter((s) => s.roles.some((r) => r === "support" || r === "head_support"));
    const problemTransfers = this.transfers.filter((t) => t.status === "failed" || t.status === "refunded" || t.status === "processing").slice(-8);
    for (const t of problemTransfers) {
      const member = t.discordId ? this.byId.get(t.discordId) : undefined;
      if (!member) continue;
      const tk = this.newTicket("conversion", member, Date.parse(t.at) + int(this.rng, 5, 90) * MINUTE, this.rng, t.id);
      t.ticketId = tk.id;
    }
    for (let i = 0; i < 26; i++) {
      const cat = weighted<TicketCategory>(this.rng, [["purchase", 3], ["report", 2], ["support", 4], ["partnership", 1], ["conversion", 1]]);
      this.newTicket(cat, pick(this.rng, this.members), now - int(this.rng, 5, 7 * 24 * 60) * MINUTE, this.rng);
    }
    this.tickets.sort((a, b) => a.openedAt.localeCompare(b.openedAt));
    for (const t of this.tickets) {
      const age = now - Date.parse(t.openedAt);
      if (age > 2 * DAY ? chance(this.rng, 0.92) : age > 6 * HOUR ? chance(this.rng, 0.5) : false) {
        const s = pick(this.rng, staff);
        t.claimedBy = { discordId: s.discordId, name: s.name, avatarUrl: null };
        t.status = "closed";
      } else if (age > 30 * MINUTE && chance(this.rng, 0.5)) {
        const s = pick(this.rng, staff);
        t.claimedBy = { discordId: s.discordId, name: s.name, avatarUrl: null };
        t.status = "claimed";
        t.messages.push({ id: this.id("msg"), at: iso(Date.parse(t.openedAt) + 20 * MINUTE), author: t.claimedBy, staff: true, body: "Hi! Looking into this now. / أهلاً، أشيك عليها الحين." });
        t.lastMessageAt = t.messages[t.messages.length - 1].at;
      }
    }
  }

  private newTicket(category: TicketCategory, member: MockMember, at: number, rng: Rng, transferId?: string): Ticket {
    this.ticketNo += 1;
    const subject = pick(rng, TICKET_SUBJECTS[category]);
    const t: Ticket = {
      id: this.id("tkt"),
      number: this.ticketNo,
      subject,
      category,
      status: "open",
      openedAt: iso(at),
      openedBy: this.ref(member),
      claimedBy: null,
      transferId,
      lastMessageAt: iso(at),
      messages: [{ id: this.id("msg"), at: iso(at), author: this.ref(member), staff: false, body: subject }],
    };
    this.tickets.push(t);
    return t;
  }

  private seedProtection(now: number) {
    this.protection = {
      lockdown: false,
      raidMode: false,
      raidJoinThreshold: 12,
      minAccountAgeDays: 7,
      antiLinks: true,
      blockedWords: [
        { id: "bw-profanity", category: "profanity", enabled: true, words: 184 },
        { id: "bw-slurs", category: "slurs", enabled: true, words: 96 },
        { id: "bw-scam", category: "scam_links", enabled: true, words: 412 },
        { id: "bw-invites", category: "invites", enabled: true, words: 3 },
        { id: "bw-mentions", category: "mass_mentions", enabled: false, words: 1 },
        { id: "bw-custom", category: "custom", enabled: true, words: 27 },
      ],
      updatedAt: iso(now - 3 * DAY),
    };
  }

  // -------------------------------------------------------------------------
  // Event factories (shared by history and live ticks)
  // -------------------------------------------------------------------------

  private ref(m: MockMember): MemberRef {
    return { discordId: m.discordId, name: m.displayName, avatarUrl: null };
  }

  private pushLedger(entry: Omit<LedgerEntry, "id" | "balanceAfter">, member: MockMember): LedgerEntry {
    member.balance += entry.delta;
    const full: LedgerEntry = { ...entry, id: this.id("led"), balanceAfter: member.balance };
    this.ledger.push(full);
    let list = this.ledgerByMember.get(member.discordId);
    if (!list) this.ledgerByMember.set(member.discordId, (list = []));
    list.push(full);
    return full;
  }

  private pushActivity(item: Omit<ActivityItem, "id">, emit: boolean) {
    const full: ActivityItem = { ...item, id: this.id("act") };
    this.activity.push(full);
    if (this.activity.length > MAX_ACTIVITY) this.activity.splice(0, this.activity.length - MAX_ACTIVITY);
    if (emit) this.emit({ type: "activity", data: full });
    return full;
  }

  private makePurchase(at: number, rng: Rng, emit: boolean) {
    // Big spenders buy more often: bias towards the start of the list.
    const member = this.members[Math.floor(Math.pow(rng(), 1.8) * this.members.length)];
    const { item, robux } = weighted(rng, CATALOG.map((c) => [c, c.robux > 1000 ? 1 : c.robux > 300 ? 3 : 6] as const));
    const rate = cashbackFor(rankFor(member.lifetime));
    const points = Math.round(robux * rate);
    const p: PurchaseEvent = {
      id: this.id("pur"),
      at: iso(at),
      discordId: member.linked ? member.discordId : undefined,
      robloxId: member.robloxId,
      robloxName: member.robloxName,
      item,
      robux,
      points,
      cashbackRate: rate,
    };
    this.purchases.push(p);
    member.totalRobux += robux;
    member.lifetime += points;
    let led: LedgerEntry | null = null;
    if (member.linked) led = this.pushLedger({ at: p.at, discordId: member.discordId, kind: "purchase", delta: points, refId: p.id }, member);
    this.pushActivity(
      { at: p.at, kind: "purchase", variant: "bought", tone: "success", params: { name: member.robloxName, item, robux, points } },
      emit,
    );
    if (emit) {
      this.emit({ type: "purchase", data: p });
      if (led) this.emit({ type: "ledger", data: led });
    }
    return p;
  }

  private makeTransfer(at: number, rng: Rng, emit: boolean, now: number) {
    const candidates = this.members.filter((m) => m.linked && m.balance >= 200);
    if (!candidates.length) return null;
    const member = pick(rng, candidates);
    const points = Math.min(member.balance, Math.round((200 + rng() * 1800) / 50) * 50);
    const age = now - at;
    let status: TransferStatus;
    if (emit) status = "pending";
    else if (age < 15 * MINUTE) status = weighted(rng, [["pending", 2], ["processing", 3]] as const);
    else status = weighted(rng, [["completed", 93], ["failed", 3], ["refunded", 4]] as const);
    const t: Transfer = {
      id: this.id("trf"),
      at: iso(at),
      robloxName: member.robloxName,
      robux: Math.floor(points * TRANSFER_RATE),
      points,
      discordId: member.discordId,
      status,
    };
    if (status === "completed") this.maybeReview(t, rng);
    this.transfers.push(t);
    const led = this.pushLedger({ at: t.at, discordId: member.discordId, kind: "transfer", delta: -points, refId: t.id }, member);
    if (status === "refunded") {
      this.pushLedger({ at: iso(at + 2 * HOUR), discordId: member.discordId, kind: "refund", delta: points, refId: t.id, reason: "Transfer failed" }, member);
    }
    this.pushActivity(
      { at: t.at, kind: "transfer", variant: "requested", tone: "neutral", params: { name: t.robloxName, robux: t.robux, points } },
      emit,
    );
    if (emit) {
      this.emit({ type: "transfer", data: t });
      this.emit({ type: "ledger", data: led });
      this.schedule(at + int(rng, 8, 20) * 1000, (n) => this.advanceTransfer(t.id, n));
    }
    return t;
  }

  private maybeReview(t: Transfer, rng: Rng) {
    if (!chance(rng, 0.7)) return;
    t.stars = weighted(rng, [[5, 70], [4, 18], [3, 7], [2, 3], [1, 2]] as const);
    if (chance(rng, 0.45)) {
      t.comment = pick(rng, t.stars >= 4
        ? ["Fast, thanks!", "سريع جداً، شكراً", "ممتاز 👌", "Arrived in minutes", "أفضل سيرفر"]
        : ["Took a while", "تأخر شوي", "Had to open a ticket", "Late by a day"]);
    }
  }

  private advanceTransfer(id: string, now: number) {
    const idx = this.transfers.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const cur = this.transfers[idx];
    let next: Transfer;
    if (cur.status === "pending") {
      next = { ...cur, status: "processing" };
      this.schedule(now + int(this.live, 10, 25) * 1000, (n) => this.advanceTransfer(id, n));
    } else if (cur.status === "processing") {
      const failed = chance(this.live, 0.06);
      next = { ...cur, status: failed ? "failed" : "completed" };
      if (!failed) {
        this.maybeReview(next, this.live);
      }
      this.pushActivity(
        {
          at: iso(now),
          kind: "transfer",
          variant: failed ? "failed" : "completed",
          tone: failed ? "danger" : "success",
          params: { name: cur.robloxName, robux: cur.robux, stars: next.stars ?? 0 },
        },
        true,
      );
    } else return;
    this.transfers[idx] = next;
    this.emit({ type: "transfer", data: next });
  }

  private makeRedemption(at: number, rng: Rng, emit: boolean) {
    const reward = pick(rng, REWARDS);
    const candidates = this.members.filter((m) => m.linked && m.balance >= reward.points);
    if (!candidates.length) return null;
    const member = pick(rng, candidates);
    const r: Redemption = { id: this.id("rdm"), at: iso(at), discordId: member.discordId, memberName: member.displayName, reward: reward.reward, points: reward.points };
    this.redemptions.push(r);
    const led = this.pushLedger({ at: r.at, discordId: member.discordId, kind: "redeem", delta: -r.points, refId: r.id }, member);
    this.pushActivity({ at: r.at, kind: "redeem", variant: "redeemed", tone: "neutral", params: { name: member.displayName, reward: r.reward, points: r.points } }, emit);
    if (emit) {
      this.emit({ type: "redemption", data: r });
      this.emit({ type: "ledger", data: led });
    }
    return r;
  }

  private logLine(bot: BotName, at: number, rng: Rng, forced?: LogLevel): BotLogLine {
    const level: LogLevel = forced ?? weighted(rng, [["debug", 2], ["info", 12], ["warn", 2], ["error", 0.4]] as const);
    const message = pick(rng, LOG_LINES[level]).replace("{n}", String(int(rng, 3, 2400))).replace("{cmd}", pick(rng, COMMANDS));
    return { id: this.id("log"), at: iso(at), bot, level, message };
  }

  private pushLog(line: BotLogLine) {
    const list = this.logs.get(line.bot)!;
    list.push(line);
    if (list.length > MAX_LOGS_PER_BOT) list.splice(0, list.length - MAX_LOGS_PER_BOT);
    this.emit({ type: "log", data: line });
  }

  private setBot(name: BotName, patch: Partial<BotStatus>) {
    const next = { ...this.bots.get(name)!, ...patch };
    this.bots.set(name, next);
    this.emit({ type: "bot", data: next });
    return next;
  }

  private setAssistant(next: Assistant) {
    this.assistants.set(next.bot, next);
    this.emit({ type: "assistant", data: next });
    this.refreshStats(Date.now(), true);
    return next;
  }

  private openTicketCount() {
    return this.tickets.filter((t) => t.status !== "closed").length;
  }

  private voiceCount() {
    return 24 + [...this.assistants.values()].reduce((s, a) => s + (a.room?.listeners ?? 0), 0);
  }

  private refreshStats(now: number, emit: boolean) {
    this.stats = { ...this.stats, at: iso(now), ticketsOpen: this.openTicketCount(), inVoice: this.voiceCount() };
    if (emit) this.emit({ type: "stats", data: this.stats });
  }

  // -------------------------------------------------------------------------
  // Live simulation
  // -------------------------------------------------------------------------

  /** Advance the simulation by one step. Public for tests. */
  tick(now = Date.now()) {
    this.tickCount += 1;
    const r = this.live;

    const due = this.scheduled.filter((s) => s.at <= now);
    this.scheduled = this.scheduled.filter((s) => s.at > now);
    for (const s of due) s.run(now);

    if (chance(r, 0.08)) this.makePurchase(now, r, true);
    if (chance(r, 0.025)) this.makeTransfer(now, r, true, now);
    if (chance(r, 0.02)) this.makeRedemption(now, r, true);

    if (chance(r, 0.04)) {
      this.stats = { ...this.stats, members: this.stats.members + 1, newToday: this.stats.newToday + 1 };
      this.pushActivity({ at: iso(now), kind: "member_join", variant: "joined", tone: "neutral", params: { name: `${pick(r, FIRST)}${pick(r, SUFFIX)}` } }, true);
      this.refreshStats(now, true);
    }

    if (chance(r, 0.012)) {
      const cat = weighted<TicketCategory>(r, [["purchase", 3], ["report", 2], ["support", 4], ["conversion", 2]]);
      const t = this.newTicket(cat, pick(r, this.members), now, r);
      this.emit({ type: "ticket", data: summarize(t) });
      this.pushActivity({ at: t.openedAt, kind: "ticket", variant: "opened", tone: "warning", params: { number: t.number, name: t.openedBy.name, subject: t.subject } }, true);
      this.refreshStats(now, true);
    }

    if (chance(r, 0.03)) {
      const list = [...this.assistants.values()].filter((a) => a.state !== "offline");
      if (list.length) {
        const a = pick(r, list);
        const next = this.assistantState(a.bot, a.state === "free", now, r);
        this.setAssistant(next);
        this.pushActivity(
          next.state === "busy"
            ? { at: iso(now), kind: "assistant", variant: "joined", tone: "neutral", params: { bot: next.displayName, room: next.room!.name, name: next.calledBy!.name } }
            : { at: iso(now), kind: "assistant", variant: "left", tone: "neutral", params: { bot: next.displayName, room: a.room?.name ?? "" } },
          true,
        );
      }
    }

    if (chance(r, 0.6)) {
      const online = BOT_NAMES.filter((n) => this.bots.get(n)!.state === "online" || this.bots.get(n)!.state === "degraded");
      if (online.length) this.pushLog(this.logLine(pick(r, online), now, r));
    }

    if (this.tickCount % 3 === 0) {
      for (const name of BOT_NAMES) {
        const b = this.bots.get(name)!;
        if (b.state !== "online" && b.state !== "degraded") continue;
        this.setBot(name, {
          memoryMb: Math.round(clamp(b.memoryMb + (r() - 0.48) * 6, b.memoryLimitMb * 0.2, b.memoryLimitMb * 0.95)),
          cpuPct: Math.round(clamp(b.cpuPct + (r() - 0.5) * 3, 0.2, 60) * 10) / 10,
          pingMs: Math.round(clamp((b.pingMs ?? 60) + (r() - 0.5) * 12, 25, 240)),
        });
      }
    }

    if (this.tickCount % 5 === 0) {
      this.stats = { ...this.stats, online: Math.round(clamp(this.stats.online + (r() - 0.5) * 18, 380, 1100)) };
      this.refreshStats(now, true);
    }

    if (chance(r, 0.004)) {
      const name = pick(r, BOT_NAMES.filter((n) => this.bots.get(n)!.state === "online"));
      if (name) {
        const line = this.logLine(name, now, r, "error");
        this.pushLog(line);
        this.setBot(name, { state: "degraded", lastError: { at: line.at, message: line.message } });
        this.pushActivity({ at: line.at, kind: "bot", variant: "error", tone: "danger", params: { bot: BOT_META[name].displayName, message: line.message } }, true);
        this.schedule(now + int(r, 20, 60) * 1000, () => {
          if (this.bots.get(name)!.state === "degraded") this.setBot(name, { state: "online" });
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // DataProvider: bots
  // -------------------------------------------------------------------------

  async getBots() {
    return BOT_NAMES.map((n) => this.bots.get(n)!);
  }

  async getBotLogs(name: BotName, opts: { limit?: number; level?: LogLevel } = {}) {
    const list = this.logs.get(name);
    if (!list) throw new ProviderError("not_found", `Unknown bot ${name}`);
    const order: LogLevel[] = ["debug", "info", "warn", "error"];
    const min = order.indexOf(opts.level ?? "debug");
    const filtered = list.filter((l) => order.indexOf(l.level) >= min);
    return filtered.slice(-clamp(opts.limit ?? 200, 1, MAX_LOGS_PER_BOT));
  }

  async botAction(name: BotName, action: BotAction) {
    const bot = this.bots.get(name);
    if (!bot) throw new ProviderError("not_found", `Unknown bot ${name}`);
    const now = Date.now();
    const isUp = bot.state === "online" || bot.state === "degraded";
    if (action === "stop") {
      if (bot.state === "stopped") throw new ProviderError("conflict", "Bot is already stopped");
      const next = this.setBot(name, { state: "stopped", startedAt: null, pingMs: null, cpuPct: 0, memoryMb: 0 });
      if (bot.kind === "assistant") this.setAssistant({ ...this.assistants.get(name)!, state: "offline", room: null, calledBy: null, since: null });
      this.pushActivity({ at: iso(now), kind: "bot", variant: "stopped", tone: "warning", params: { bot: bot.displayName } }, true);
      return next;
    }
    if (action === "start" && isUp) throw new ProviderError("conflict", "Bot is already running");
    if (bot.state === "restarting") throw new ProviderError("conflict", "Bot is already restarting");
    const next = this.setBot(name, { state: "restarting", pingMs: null });
    this.pushLog({ id: this.id("log"), at: iso(now), bot: name, level: "info", message: action === "start" ? "start requested from dashboard" : "restart requested from dashboard" });
    this.schedule(now + 2500, (n) => {
      const restarts = action === "restart" || bot.state !== "stopped" ? bot.restarts24h + 1 : bot.restarts24h;
      this.setBot(name, {
        state: "online",
        startedAt: iso(n),
        restarts24h: restarts,
        pingMs: int(this.live, 40, 80),
        memoryMb: Math.round(bot.memoryLimitMb * 0.28),
        cpuPct: 4.2,
      });
      this.pushLog({ id: this.id("log"), at: iso(n), bot: name, level: "info", message: "shard 0 ready" });
      if (bot.kind === "assistant") this.setAssistant({ ...this.assistants.get(name)!, state: "free", room: null, calledBy: null, since: null });
      this.pushActivity({ at: iso(n), kind: "bot", variant: action === "start" ? "started" : "restarted", tone: "success", params: { bot: bot.displayName } }, true);
    });
    return next;
  }

  // -------------------------------------------------------------------------
  // Assistants & server
  // -------------------------------------------------------------------------

  async getAssistants() {
    return BOT_NAMES.filter((n) => BOT_META[n].kind === "assistant").map((n) => this.assistants.get(n)!);
  }

  async assistantAction(name: BotName, action: AssistantAction) {
    const a = this.assistants.get(name);
    if (!a) throw new ProviderError("not_found", `Unknown assistant ${name}`);
    if (action === "disconnect") {
      if (a.state !== "busy") throw new ProviderError("conflict", "Assistant is not in a voice room");
      const next = this.setAssistant({ ...a, state: "free", room: null, calledBy: null, since: null });
      this.pushActivity({ at: iso(Date.now()), kind: "assistant", variant: "left", tone: "neutral", params: { bot: a.displayName, room: a.room?.name ?? "" } }, true);
      return next;
    }
    throw new ProviderError("invalid", `Unknown action ${action}`);
  }

  async getServerStats() {
    return this.stats;
  }

  async getActivity(limit = 50) {
    return this.activity.slice(-clamp(limit, 1, MAX_ACTIVITY)).reverse();
  }

  // -------------------------------------------------------------------------
  // Points & purchases
  // -------------------------------------------------------------------------

  async getPurchases(q: ListQuery = {}) {
    const s = q.search?.toLowerCase();
    return paginate(this.purchases, q, (p) =>
      (!q.discordId || p.discordId === q.discordId) &&
      (!s || p.robloxName.toLowerCase().includes(s) || p.item.toLowerCase().includes(s)),
    );
  }

  async getTransfers(q: ListQuery & { status?: TransferStatus } = {}) {
    const s = q.search?.toLowerCase();
    return paginate(this.transfers, q, (t) =>
      (!q.discordId || t.discordId === q.discordId) && (!q.status || t.status === q.status) && (!s || t.robloxName.toLowerCase().includes(s)),
    );
  }

  async getRedemptions(q: ListQuery = {}) {
    return paginate(this.redemptions, q, (r) => !q.discordId || r.discordId === q.discordId);
  }

  async getPointsSummary(): Promise<PointsSummary> {
    const now = Date.now();
    const days = lastDays(14, now);
    const weeks = lastWeeks(8, now);
    const daily = new Map<string, TotalsBucket>(days.map((d) => [d, bucket(d)]));
    const weekly = new Map<string, TotalsBucket>(weeks.map((w) => [w, bucket(w)]));
    const add = (at: string, f: (b: TotalsBucket) => void) => {
      const d = dayKey(at);
      const db = daily.get(d);
      if (db) f(db);
      const wb = weekly.get(weekKey(d));
      if (wb) f(wb);
    };
    const since = now - 60 * DAY;
    for (const p of this.purchases) {
      if (Date.parse(p.at) < since) continue;
      add(p.at, (b) => {
        b.robux += p.robux;
        b.pointsEarned += p.points;
        b.purchases += 1;
      });
    }
    for (const t of this.transfers) if (Date.parse(t.at) >= since) add(t.at, (b) => (b.transfers += 1));
    for (const r of this.redemptions) if (Date.parse(r.at) >= since) add(r.at, (b) => (b.pointsRedeemed += r.points));
    for (const t of this.transfers) if (Date.parse(t.at) >= since && t.status !== "refunded" && t.status !== "failed") add(t.at, (b) => (b.pointsRedeemed += t.points));

    const todayKey = dayKey(now);
    const t = daily.get(todayKey) ?? bucket(todayKey);
    const todayTransfers = this.transfers.filter((x) => dayKey(x.at) === todayKey);
    const starred = this.transfers.filter((x) => x.stars && Date.parse(x.at) > now - 30 * DAY);

    const top = new Map<string, { robloxName: string; discordId?: string; robux: number; purchases: number; points: number }>();
    for (const p of this.purchases) {
      if (Date.parse(p.at) < now - 30 * DAY) continue;
      const cur = top.get(p.robloxId) ?? { robloxName: p.robloxName, discordId: p.discordId, robux: 0, purchases: 0, points: 0 };
      cur.robux += p.robux;
      cur.purchases += 1;
      cur.points += p.points;
      top.set(p.robloxId, cur);
    }

    return {
      daily: [...daily.values()],
      weekly: [...weekly.values()],
      topBuyers: [...top.values()].sort((a, b) => b.robux - a.robux).slice(0, 8),
      today: {
        robux: t.robux,
        pointsEarned: t.pointsEarned,
        pointsRedeemed: t.pointsRedeemed,
        purchases: t.purchases,
        transfersCompleted: todayTransfers.filter((x) => x.status === "completed").length,
        avgStars: starred.length ? Math.round((starred.reduce((s, x) => s + (x.stars ?? 0), 0) / starred.length) * 100) / 100 : null,
      },
      outstandingPoints: this.members.reduce((s, m) => s + m.balance, 0),
    };
  }

  async getLedger(discordId: string, q: ListQuery = {}) {
    if (!this.byId.has(discordId)) throw new ProviderError("not_found", "Unknown member");
    return paginate(this.ledgerByMember.get(discordId) ?? [], q);
  }

  async adjustPoints(input: PointsAdjustInput) {
    const m = this.byId.get(input.discordId);
    if (!m) throw new ProviderError("not_found", "Unknown member");
    if (!Number.isInteger(input.delta) || input.delta === 0) throw new ProviderError("invalid", "Delta must be a non-zero integer");
    if (m.balance + input.delta < 0) throw new ProviderError("conflict", "Adjustment would make the balance negative");
    const at = iso(Date.now());
    const entry = this.pushLedger({ at, discordId: m.discordId, kind: "adjust", delta: input.delta, reason: input.reason, actor: input.actor }, m);
    this.emit({ type: "ledger", data: entry });
    this.pushActivity(
      { at, kind: "points_adjust", variant: input.delta > 0 ? "added" : "removed", tone: "neutral", params: { actor: input.actor.name, name: m.displayName, points: Math.abs(input.delta) } },
      true,
    );
    return entry;
  }

  // -------------------------------------------------------------------------
  // Members
  // -------------------------------------------------------------------------

  private summary(m: MockMember): MemberSummary {
    return {
      discordId: m.discordId,
      username: m.username,
      displayName: m.displayName,
      avatarUrl: null,
      rank: rankFor(m.lifetime),
      robloxName: m.linked ? m.robloxName : null,
    };
  }

  async searchMembers(query: string, limit = 20) {
    const q = query.trim().toLowerCase();
    const list = q
      ? this.members.filter(
          (m) => m.displayName.toLowerCase().includes(q) || m.username.includes(q) || m.robloxName.toLowerCase().includes(q) || m.discordId === q || m.robloxId === q,
        )
      : [...this.members].sort((a, b) => b.lifetime - a.lifetime);
    return list.slice(0, clamp(limit, 1, 50)).map((m) => this.summary(m));
  }

  async getMember(discordId: string): Promise<MemberProfile | null> {
    const m = this.byId.get(discordId);
    if (!m) return null;
    const roles = SERVER_ROLES.filter((r) => m.roleIds.includes(r.id));
    return {
      ...this.summary(m),
      joinedAt: m.joinedAt,
      roles,
      roblox: m.linked ? { robloxId: m.robloxId, robloxName: m.robloxName, verifiedAt: m.verifiedAt } : null,
      points: m.balance,
      lifetimePoints: m.lifetime,
      totalRobux: m.totalRobux,
      purchases: this.purchases.filter((p) => p.robloxId === m.robloxId).slice(-20).reverse(),
      tickets: this.tickets.filter((t) => t.openedBy.discordId === m.discordId).map(summarize).reverse(),
    };
  }

  async getRanks(): Promise<RankInfo[]> {
    const counts = new Map(RANKS.map((r) => [r, 0]));
    for (const m of this.members) counts.set(rankFor(m.lifetime), (counts.get(rankFor(m.lifetime)) ?? 0) + 1);
    return RANK_TABLE.map((r) => ({ ...r, members: counts.get(r.rank) ?? 0 }));
  }

  async getRoles(): Promise<RoleInfo[]> {
    const staffCount = (roleId: string) => MOCK_STAFF.filter((s) => s.roles.some((r) => STAFF_ROLE_IDS[r] === roleId)).length;
    return SERVER_ROLES.map((r) => {
      let members = this.members.filter((m) => m.roleIds.includes(r.id)).length;
      if (r.id === "role-member") members = this.stats.members;
      if (r.id.startsWith("role-") && members === 0) members = staffCount(r.id) || (r.id === "role-founder" || r.id === "role-head-managers" ? 1 : 0);
      return { ...r, members };
    });
  }

  async getStaff(): Promise<StaffMember[]> {
    const now = Date.now();
    return MOCK_STAFF.map((s, i) => ({
      discordId: s.discordId,
      name: s.name,
      avatarUrl: null,
      roles: s.roles,
      lastSeenAt: iso(now - (i * 37 + 3) * MINUTE),
    }));
  }

  // -------------------------------------------------------------------------
  // Tickets
  // -------------------------------------------------------------------------

  async getTickets(q: TicketQuery = {}) {
    const s = q.search?.toLowerCase();
    const sorted = [...this.tickets].sort((a, b) => a.lastMessageAt.localeCompare(b.lastMessageAt));
    const page = paginate(sorted, q, (t) =>
      (!q.status || (q.status === "active" ? t.status !== "closed" : t.status === q.status)) &&
      (!q.discordId || t.openedBy.discordId === q.discordId) &&
      (!s || t.subject.toLowerCase().includes(s) || String(t.number).includes(s) || t.openedBy.name.toLowerCase().includes(s)),
    );
    return { items: page.items.map(summarize), nextCursor: page.nextCursor };
  }

  async getTicket(id: string) {
    return this.tickets.find((t) => t.id === id) ?? null;
  }

  async ticketAction(id: string, action: TicketAction) {
    const idx = this.tickets.findIndex((t) => t.id === id);
    if (idx === -1) throw new ProviderError("not_found", "Unknown ticket");
    const cur = this.tickets[idx];
    const now = iso(Date.now());
    let next: Ticket;
    switch (action.type) {
      case "claim":
        if (cur.status !== "open") throw new ProviderError("conflict", "Ticket is not open");
        next = { ...cur, status: "claimed", claimedBy: action.actor };
        break;
      case "reply": {
        if (cur.status === "closed") throw new ProviderError("conflict", "Ticket is closed");
        const msg = { id: this.id("msg"), at: now, author: action.actor, staff: true, body: action.body };
        next = { ...cur, messages: [...cur.messages, msg], lastMessageAt: now };
        break;
      }
      case "close":
        if (cur.status === "closed") throw new ProviderError("conflict", "Ticket is already closed");
        next = { ...cur, status: "closed", lastMessageAt: now };
        break;
      case "transfer":
        if (cur.status === "closed") throw new ProviderError("conflict", "Ticket is closed");
        next = { ...cur, status: "claimed", claimedBy: action.to };
        break;
    }
    this.tickets[idx] = next;
    this.emit({ type: "ticket", data: summarize(next) });
    if (action.type !== "reply") {
      this.pushActivity(
        { at: now, kind: "ticket", variant: action.type === "claim" ? "claimed" : action.type === "close" ? "closed" : "transferred", tone: "neutral", params: { number: cur.number, actor: action.actor.name, to: action.type === "transfer" ? action.to.name : "" } },
        true,
      );
    }
    this.refreshStats(Date.now(), true);
    return next;
  }

  // -------------------------------------------------------------------------
  // Protection
  // -------------------------------------------------------------------------

  async getProtection() {
    return this.protection;
  }

  async setProtection(patch: ProtectionPatch) {
    const { blockedWords, ...rest } = patch;
    const lists = blockedWords
      ? this.protection.blockedWords.map((b) => {
          const p = blockedWords.find((x) => x.id === b.id);
          return p ? { ...b, enabled: p.enabled } : b;
        })
      : this.protection.blockedWords;
    this.protection = { ...this.protection, ...rest, blockedWords: lists, updatedAt: iso(Date.now()) };
    this.emit({ type: "protection", data: this.protection });
    if (patch.lockdown !== undefined || patch.raidMode !== undefined) {
      const which = patch.lockdown !== undefined ? "lockdown" : "raid";
      const on = patch.lockdown ?? patch.raidMode;
      this.pushActivity({ at: this.protection.updatedAt, kind: "protection", variant: `${which}_${on ? "on" : "off"}`, tone: on ? "danger" : "success", params: {} }, true);
    }
    return this.protection;
  }
}

function bucket(start: string): TotalsBucket {
  return { start, robux: 0, pointsEarned: 0, pointsRedeemed: 0, purchases: 0, transfers: 0 };
}

export function summarize(t: Ticket): TicketSummary {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { messages, ...rest } = t;
  return rest;
}

/** Newest-first cursor pagination over a chronologically ordered list. */
export function paginate<T extends { id: string }>(list: readonly T[], q: ListQuery = {}, filter?: (t: T) => boolean): Page<T> {
  const limit = clamp(Math.floor(q.limit ?? 50), 1, 200);
  let i = list.length - 1;
  if (q.cursor) {
    const idx = list.findIndex((x) => x.id === q.cursor);
    i = idx === -1 ? -1 : idx - 1;
  }
  const items: T[] = [];
  for (; i >= 0 && items.length < limit; i--) if (!filter || filter(list[i])) items.push(list[i]);
  return { items, nextCursor: items.length === limit && i >= 0 ? items[items.length - 1].id : null };
}
