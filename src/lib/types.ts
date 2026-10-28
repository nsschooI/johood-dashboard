/**
 * JoHood Dashboard — data contracts.
 *
 * Every piece of data the dashboard shows comes through a `DataProvider`.
 * Two providers implement it:
 *   - `MockProvider` (src/lib/provider/mock.ts): rich, live-moving fake data.
 *   - `RealProvider` (src/lib/provider/real.ts): HTTP client for the bot
 *     backend on the Oracle server, documented in docs/provider-api.md.
 *
 * All timestamps are ISO-8601 strings (UTC). All IDs are strings (Discord
 * snowflakes and Roblox IDs do not fit safely in a JS number).
 */

import type { GiveawaysApi } from "./giveaways/types";

// ---------------------------------------------------------------------------
// Servers (guilds)
// ---------------------------------------------------------------------------

/**
 * The backend serves two Discord servers. `main` is the community (default);
 * `catalog` is JoHood Catalog, where tickets, ops and ranks live and where
 * staff roles (and therefore dashboard sign-in) come from. The economy
 * (purchases, transfers, points) is global and identical in both.
 */
export const GUILD_KEYS = ["main", "catalog"] as const;
export type GuildKey = (typeof GUILD_KEYS)[number];
export const DEFAULT_GUILD: GuildKey = "main";

export function isGuildKey(v: unknown): v is GuildKey {
  return v === "main" || v === "catalog";
}

export interface GuildRef {
  key: GuildKey;
  id: string;
}

export interface GuildInfo extends GuildRef {
  name: string;
  description: string | null;
  /** Discord CDN URL (cdn.discordapp.com) or null. */
  iconUrl: string | null;
  bannerUrl: string | null;
  members: number;
  online: number;
  boosts: number;
  boostLevel: 0 | 1 | 2 | 3;
}

// ---------------------------------------------------------------------------
// Bots & assistants
// ---------------------------------------------------------------------------

/** Process names as registered with pm2 on the bot server. */
export const BOT_NAMES = [
  "ops",
  "tickets",
  "welcome",
  "system",
  "tempvoice",
  "network",
  "assistant-1",
  "assistant-2",
  "assistant-3",
] as const;
export type BotName = (typeof BOT_NAMES)[number];

export type BotState = "online" | "degraded" | "restarting" | "offline" | "stopped";

export interface BotError {
  at: string;
  message: string;
  /** Optional stack / code, only shown to roles with `bots.logs`. */
  detail?: string;
}

export interface BotStatus {
  name: BotName;
  /** Human label, e.g. "Tickets". */
  displayName: string;
  kind: "core" | "assistant";
  state: BotState;
  /** When the current process started; null while stopped/offline. */
  startedAt: string | null;
  /** Restarts in the last 24h (pm2 restart counter delta). */
  restarts24h: number;
  memoryMb: number;
  memoryLimitMb: number;
  cpuPct: number;
  /** Discord gateway latency. null when not connected. */
  pingMs: number | null;
  version: string;
  lastError: BotError | null;
  /** The bot's Discord avatar; null/absent → the UI draws a glyph tile. */
  avatarUrl?: string | null;
}

export type BotAction = "restart" | "stop" | "start";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface BotLogLine {
  id: string;
  at: string;
  bot: BotName;
  level: LogLevel;
  message: string;
}

export interface VoiceRoomRef {
  id: string;
  name: string;
  /** Members currently in the room. */
  listeners: number;
}

export interface MemberRef {
  discordId: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Assistant {
  /** Matches the bot process, e.g. "assistant-1". */
  bot: BotName;
  displayName: string;
  state: "free" | "busy" | "offline";
  room: VoiceRoomRef | null;
  calledBy: MemberRef | null;
  /** When it joined the current room. */
  since: string | null;
  avatarUrl?: string | null;
}

export type AssistantAction = "disconnect";

// ---------------------------------------------------------------------------
// Server health
// ---------------------------------------------------------------------------

export interface ServerStats {
  /** Which server these numbers describe (absent = the default server). */
  guild?: GuildKey;
  at: string;
  members: number;
  online: number;
  newToday: number;
  /** null when the server has no ticket system (tickets live in `catalog`). */
  ticketsOpen: number | null;
  inVoice: number;
  boosts: number;
}

// ---------------------------------------------------------------------------
// Points, purchases, transfers
// ---------------------------------------------------------------------------

/** A purchase reported by the Roblox map ("JoHood Catalog"). */
export interface PurchaseEvent {
  id: string;
  at: string;
  /** Linked Discord account, when the Roblox account is verified. */
  discordId?: string;
  robloxId: string;
  robloxName: string;
  item: string;
  /** Roblox asset ID of the item, when the map reports it (for thumbnails). */
  assetId?: string;
  robux: number;
  points: number;
  /** Fraction of Robux returned as points, e.g. 0.1 = 10%. */
  cashbackRate: number;
}

export type TransferStatus = "pending" | "processing" | "completed" | "failed" | "refunded";

/** A conversion of points into Robux paid out to a Roblox account. */
export interface Transfer {
  id: string;
  at: string;
  /** Roblox user ID of the receiver (for the headshot), when known. */
  robloxId?: string;
  robloxName: string;
  robux: number;
  points: number;
  discordId?: string;
  status: TransferStatus;
  /** 1–5 review left by the member after completion. */
  stars?: number;
  comment?: string;
  /** Support ticket opened about this conversion, if any. */
  ticketId?: string;
}

/** Points spent on a reward inside Discord (role, item, perk). */
export interface Redemption {
  id: string;
  at: string;
  discordId: string;
  memberName: string;
  avatarUrl?: string | null;
  reward: string;
  points: number;
}

export type LedgerKind = "purchase" | "transfer" | "redeem" | "adjust" | "refund";

export interface LedgerEntry {
  id: string;
  at: string;
  discordId: string;
  kind: LedgerKind;
  /** Positive = credit, negative = debit. */
  delta: number;
  balanceAfter: number;
  /** Required for `adjust`. */
  reason?: string;
  /** Staff member who made a manual adjustment. */
  actor?: MemberRef;
  /** Purchase / transfer / redemption id this entry came from. */
  refId?: string;
}

export interface PointsAdjustInput {
  discordId: string;
  /** Non-zero integer. */
  delta: number;
  reason: string;
  actor: MemberRef;
}

export interface TotalsBucket {
  /** Bucket start (day or ISO week start). */
  start: string;
  robux: number;
  pointsEarned: number;
  pointsRedeemed: number;
  purchases: number;
  transfers: number;
}

export interface TopBuyer {
  robloxId?: string;
  robloxName: string;
  discordId?: string;
  robux: number;
  purchases: number;
  points: number;
}

export interface PointsSummary {
  daily: TotalsBucket[];
  weekly: TotalsBucket[];
  topBuyers: TopBuyer[];
  today: {
    robux: number;
    pointsEarned: number;
    pointsRedeemed: number;
    purchases: number;
    transfersCompleted: number;
    avgStars: number | null;
  };
  /** Points currently held by all members. */
  outstandingPoints: number;
}

// ---------------------------------------------------------------------------
// Members & tickets
// ---------------------------------------------------------------------------

export const RANKS = ["newcomer", "bronze", "silver", "gold", "diamond", "legend"] as const;
export type Rank = (typeof RANKS)[number];

export interface DiscordRole {
  id: string;
  name: string;
  /** Hex colour, e.g. "#c77dff". */
  color: string;
}

export interface MemberSummary {
  discordId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  rank: Rank;
  robloxName: string | null;
}

export interface RobloxLink {
  robloxId: string;
  robloxName: string;
  verifiedAt: string;
}

/**
 * Full member profile. Roles without `members.view_full` receive a redacted
 * copy (see `redactProfile`): points, purchases and ledger are removed.
 */
export interface MemberProfile extends MemberSummary {
  joinedAt: string;
  roles: DiscordRole[];
  roblox: RobloxLink | null;
  points: number | null;
  lifetimePoints: number | null;
  totalRobux: number | null;
  purchases: PurchaseEvent[] | null;
  tickets: TicketSummary[];
}

export interface RankInfo {
  rank: Rank;
  /** Lifetime points needed to reach this rank. */
  minLifetimePoints: number;
  cashbackRate: number;
  members: number;
}

export interface RoleInfo extends DiscordRole {
  members: number;
}

export type TicketStatus = "open" | "claimed" | "closed";
export type TicketCategory = "conversion" | "purchase" | "report" | "support" | "partnership";

export interface TicketSummary {
  /** Server the ticket lives in (tickets live in `catalog`). */
  guild?: GuildKey;
  id: string;
  number: number;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  openedAt: string;
  openedBy: MemberRef;
  claimedBy: MemberRef | null;
  /** Transfer this ticket is about, for conversion tickets. */
  transferId?: string;
  lastMessageAt: string;
}

export interface TicketMessage {
  id: string;
  at: string;
  author: MemberRef;
  staff: boolean;
  body: string;
}

export interface Ticket extends TicketSummary {
  messages: TicketMessage[];
}

export type TicketAction =
  | { type: "claim"; actor: MemberRef }
  | { type: "reply"; actor: MemberRef; body: string }
  | { type: "close"; actor: MemberRef; reason?: string }
  | { type: "transfer"; actor: MemberRef; to: MemberRef };

// ---------------------------------------------------------------------------
// Staff, protection, audit
// ---------------------------------------------------------------------------

/** Dashboard roles, mapped from Discord role IDs in config/roles.ts. */
export const ROLES = ["owner", "manager", "dev", "head_support", "support"] as const;
export type Role = (typeof ROLES)[number];

export interface StaffMember {
  discordId: string;
  name: string;
  avatarUrl: string | null;
  /** Dashboard roles derived from the member's Discord roles. */
  roles: Role[];
  lastSeenAt: string | null;
}

export interface BlockedWordList {
  id: string;
  /** i18n key suffix, e.g. "profanity". */
  category: "profanity" | "slurs" | "scam_links" | "invites" | "mass_mentions" | "custom";
  enabled: boolean;
  words: number;
}

export interface ProtectionSettings {
  lockdown: boolean;
  raidMode: boolean;
  /** Joins per minute that auto-trigger raid mode. */
  raidJoinThreshold: number;
  /** Minimum account age (days) to join while raid mode is on. */
  minAccountAgeDays: number;
  antiLinks: boolean;
  blockedWords: BlockedWordList[];
  updatedAt: string;
}

export type ProtectionPatch = Partial<
  Pick<ProtectionSettings, "lockdown" | "raidMode" | "raidJoinThreshold" | "minAccountAgeDays" | "antiLinks">
> & { blockedWords?: { id: string; enabled: boolean }[] };

/** One row of the dashboard's own audit log (stored in SQLite). */
export interface AuditEntry {
  id: number;
  at: string;
  actorId: string;
  actorName: string;
  actorRoles: Role[];
  /** Permission action, e.g. "bots.restart". */
  action: string;
  target: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
  ok: boolean;
  /** ok = applied, denied = refused by permissions, not_connected = backend answered 501, failed = backend error. */
  outcome: AuditOutcome;
  ip: string | null;
}

export type AuditOutcome = "ok" | "denied" | "not_connected" | "failed";

export interface AuditQuery {
  actorId?: string;
  action?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  beforeId?: number;
  outcome?: AuditOutcome;
}

// ---------------------------------------------------------------------------
// Activity feed & live events
// ---------------------------------------------------------------------------

export type ActivityKind =
  | "purchase"
  | "transfer"
  | "redeem"
  | "points_adjust"
  | "bot"
  | "assistant"
  | "member_join"
  | "ticket"
  | "protection";

/**
 * A feed line. `params` are interpolated into the i18n string
 * `activity.<kind>.<variant>` so the feed is bilingual.
 */
export interface ActivityItem {
  /** Set for server-specific lines (joins, tickets); absent = global. */
  guild?: GuildKey;
  id: string;
  at: string;
  kind: ActivityKind;
  variant: string;
  tone: "neutral" | "success" | "warning" | "danger";
  params: Record<string, string | number>;
}

/** Everything that can arrive on the live stream. */
export type LiveEvent =
  | { type: "purchase"; data: PurchaseEvent }
  | { type: "transfer"; data: Transfer }
  | { type: "redemption"; data: Redemption }
  | { type: "ledger"; data: LedgerEntry }
  | { type: "bot"; data: BotStatus }
  | { type: "log"; data: BotLogLine }
  | { type: "assistant"; data: Assistant }
  | { type: "stats"; data: ServerStats }
  | { type: "ticket"; data: TicketSummary }
  | { type: "protection"; data: ProtectionSettings }
  | { type: "activity"; data: ActivityItem };

export type LiveEventType = LiveEvent["type"];

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface Page<T> {
  items: T[];
  /** Cursor for the next (older) page, or null at the end. */
  nextCursor: string | null;
}

export interface ListQuery {
  limit?: number;
  /** Opaque cursor from a previous page. */
  cursor?: string;
  discordId?: string;
  search?: string;
}

export interface TicketQuery extends ListQuery {
  status?: TicketStatus | "active";
  guild?: GuildKey;
}

/**
 * The single seam between the dashboard and the JoHood backend.
 *
 * Every method maps 1:1 to an endpoint in docs/provider-api.md. Authorization
 * is NOT the provider's job: API routes call `can(user, action)` before they
 * reach the provider, and the dashboard writes the audit log itself.
 */
export interface DataProvider {
  readonly kind: "mock" | "real";

  // Servers ------------------------------------------------------------
  getGuilds(): Promise<GuildRef[]>;
  getGuildInfo(guild: GuildKey): Promise<GuildInfo>;

  // Bots ---------------------------------------------------------------
  getBots(): Promise<BotStatus[]>;
  getBotLogs(name: BotName, opts?: { limit?: number; level?: LogLevel }): Promise<BotLogLine[]>;
  botAction(name: BotName, action: BotAction): Promise<BotStatus>;

  // Assistants ---------------------------------------------------------
  getAssistants(): Promise<Assistant[]>;
  assistantAction(name: BotName, action: AssistantAction): Promise<Assistant>;

  // Server -------------------------------------------------------------
  getServerStats(guild?: GuildKey): Promise<ServerStats>;
  getActivity(limit?: number): Promise<ActivityItem[]>;

  // Points & purchases -------------------------------------------------
  getPurchases(q?: ListQuery): Promise<Page<PurchaseEvent>>;
  getTransfers(q?: ListQuery & { status?: TransferStatus }): Promise<Page<Transfer>>;
  getRedemptions(q?: ListQuery): Promise<Page<Redemption>>;
  getPointsSummary(): Promise<PointsSummary>;
  getLedger(discordId: string, q?: ListQuery): Promise<Page<LedgerEntry>>;
  adjustPoints(input: PointsAdjustInput): Promise<LedgerEntry>;

  // Members ------------------------------------------------------------
  searchMembers(query: string, limit?: number, guild?: GuildKey): Promise<MemberSummary[]>;
  getMember(discordId: string, guild?: GuildKey): Promise<MemberProfile | null>;
  getRanks(guild?: GuildKey): Promise<RankInfo[]>;
  getRoles(guild?: GuildKey): Promise<RoleInfo[]>;
  getStaff(guild?: GuildKey): Promise<StaffMember[]>;

  // Tickets ------------------------------------------------------------
  getTickets(q?: TicketQuery): Promise<Page<TicketSummary>>;
  getTicket(id: string): Promise<Ticket | null>;
  ticketAction(id: string, action: TicketAction): Promise<Ticket>;

  // Protection ---------------------------------------------------------
  getProtection(): Promise<ProtectionSettings>;
  setProtection(patch: ProtectionPatch): Promise<ProtectionSettings>;

  // Giveaways (public area) -------------------------------------------
  /** See src/lib/giveaways/types.ts and docs/giveaways.md. */
  readonly giveaways: GiveawaysApi;

  // Live ---------------------------------------------------------------
  /** Subscribe to live events. Returns an unsubscribe function. */
  subscribe(listener: (event: LiveEvent) => void): () => void;
}
