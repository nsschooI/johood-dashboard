/**
 * Static seed material for the mock provider. Every name here is invented;
 * IDs use obviously synthetic patterns so they can't collide with real people.
 */
import type { BotName, DiscordRole, GuildInfo, GuildKey, Rank, RankInfo, Role, TicketCategory } from "../types";

export const BOT_META: Record<BotName, { displayName: string; kind: "core" | "assistant"; memoryLimitMb: number; version: string }> = {
  ops: { displayName: "Ops", kind: "core", memoryLimitMb: 512, version: "3.4.1" },
  tickets: { displayName: "Tickets", kind: "core", memoryLimitMb: 512, version: "2.9.0" },
  welcome: { displayName: "Welcome", kind: "core", memoryLimitMb: 256, version: "1.7.2" },
  system: { displayName: "System", kind: "core", memoryLimitMb: 384, version: "2.2.5" },
  tempvoice: { displayName: "TempVoice", kind: "core", memoryLimitMb: 256, version: "1.5.0" },
  network: { displayName: "Network", kind: "core", memoryLimitMb: 384, version: "1.3.3" },
  "assistant-1": { displayName: "Assistant 1", kind: "assistant", memoryLimitMb: 320, version: "4.0.2" },
  "assistant-2": { displayName: "Assistant 2", kind: "assistant", memoryLimitMb: 320, version: "4.0.2" },
  "assistant-3": { displayName: "Assistant 3", kind: "assistant", memoryLimitMb: 320, version: "4.0.2" },
};

export const RANK_TABLE: Omit<RankInfo, "members">[] = [
  { rank: "newcomer", minLifetimePoints: 0, cashbackRate: 0.05 },
  { rank: "bronze", minLifetimePoints: 50, cashbackRate: 0.08 },
  { rank: "silver", minLifetimePoints: 200, cashbackRate: 0.1 },
  { rank: "gold", minLifetimePoints: 600, cashbackRate: 0.12 },
  { rank: "diamond", minLifetimePoints: 1_500, cashbackRate: 0.15 },
  { rank: "legend", minLifetimePoints: 3_500, cashbackRate: 0.2 },
];

export function rankFor(lifetimePoints: number): Rank {
  let r: Rank = "newcomer";
  for (const row of RANK_TABLE) if (lifetimePoints >= row.minLifetimePoints) r = row.rank;
  return r;
}

export function cashbackFor(rank: Rank): number {
  return RANK_TABLE.find((r) => r.rank === rank)?.cashbackRate ?? 0.05;
}

/** Robux paid out per point when a member converts points. */
export const TRANSFER_RATE = 0.8;

export const CATALOG: readonly { item: string; robux: number }[] = [
  { item: "Neon Street Hoodie", robux: 85 },
  { item: "Desert Camo Set", robux: 120 },
  { item: "Gold Chain", robux: 250 },
  { item: "Shadow Wings", robux: 750 },
  { item: "Falcon Pet", robux: 400 },
  { item: "Royal Crown", robux: 1200 },
  { item: "VIP Pass", robux: 499 },
  { item: "Glow Sneakers", robux: 60 },
  { item: "Night Cap", robux: 35 },
  { item: "Keffiyeh Scarf", robux: 45 },
  { item: "Petra Backpack", robux: 150 },
  { item: "Midnight Jacket", robux: 180 },
  { item: "Diamond Aura", robux: 2500 },
  { item: "Oud Emote", robux: 99 },
  { item: "Wadi Rum Cape", robux: 320 },
];

/** Fake Roblox asset IDs per catalog item (mock thumbnails are generated art). */
export const ASSET_IDS: Record<string, string> = Object.fromEntries(CATALOG.map((c, i) => [c.item, String(90_000_000_100 + i * 7919)]));

export const REWARDS: readonly { reward: string; points: number }[] = [
  { reward: "Custom role colour (30d)", points: 300 },
  { reward: "Private voice room", points: 500 },
  { reward: "Giveaway entry", points: 50 },
  { reward: "Name in credits", points: 150 },
  { reward: "Priority support badge", points: 800 },
];

export const FIRST = [
  "Abood", "Fahad", "Saif", "Nour", "Lina", "Omar", "Yazan", "Rami", "Dana", "Hamza", "Zaid", "Layan",
  "Tala", "Kareem", "Jood", "Mira", "Laith", "Sama", "Faris", "Reem", "Bader", "Ali", "Hala", "Tamer",
  "Noah", "Maya", "Leo", "Sara", "Adam", "Zain", "Yara", "Malik",
] as const;

export const FIRST_AR: Record<string, string> = {
  Abood: "عبود", Fahad: "فهد", Saif: "سيف", Nour: "نور", Lina: "لينا", Omar: "عمر", Yazan: "يزن",
  Rami: "رامي", Dana: "دانة", Hamza: "حمزة", Zaid: "زيد", Layan: "ليان", Tala: "تالا", Kareem: "كريم",
  Jood: "جود", Mira: "ميرا", Laith: "ليث", Sama: "سما", Faris: "فارس", Reem: "ريم", Bader: "بدر",
  Ali: "علي", Hala: "هلا", Tamer: "تامر", Zain: "زين", Yara: "يارا", Malik: "مالك", Sara: "سارة", Adam: "آدم",
};

export const SUFFIX = ["_JO", "x", "YT", "Plays", "_7", "_99", "Pro", "Rbx", "Dz", "_962", "OG", "Gg"] as const;

export const VOICE_ROOMS = [
  { id: "vc-lounge", name: "🎧 Lounge" },
  { id: "vc-chill", name: "☕ Chill" },
  { id: "vc-gaming-1", name: "🎮 Gaming 1" },
  { id: "vc-gaming-2", name: "🎮 Gaming 2" },
  { id: "vc-quran", name: "📖 Quran" },
  { id: "vc-music", name: "🎵 Music" },
  { id: "vc-events", name: "🎉 Events" },
] as const;


/**
 * The two servers. `mock:` URLs are rendered as designed artwork by the
 * <Art> component — they never leave the browser and are never used in real mode.
 */
export const MOCK_GUILDS: Record<GuildKey, Omit<GuildInfo, "members" | "online">> = {
  main: {
    key: "main",
    id: "mock-guild-main",
    name: "JoHood",
    description: "مجتمع جوهود — Jordan's Roblox & gaming hangout",
    iconUrl: "mock:guild:main",
    bannerUrl: "mock:banner:main",
    boosts: 14,
    boostLevel: 2,
  },
  catalog: {
    key: "catalog",
    id: "mock-guild-catalog",
    name: "JoHood Catalog",
    description: "Shop, tickets and ranks for the JoHood Catalog map",
    iconUrl: "mock:guild:catalog",
    bannerUrl: "mock:banner:catalog",
    boosts: 7,
    boostLevel: 1,
  },
};

/** Community roles of the main server. */
export const MAIN_ROLES: DiscordRole[] = [
  { id: "main-owner", name: "Owner", color: "#f472b6" },
  { id: "main-admin", name: "Admins", color: "#c084fc" },
  { id: "main-mod", name: "Moderators", color: "#60a5fa" },
  { id: "main-events", name: "Event Team", color: "#f59e0b" },
  { id: "main-booster", name: "Server Booster", color: "#f9a8d4" },
  { id: "main-vip", name: "VIP", color: "#fbbf24" },
  { id: "main-gamer", name: "Gamer", color: "#34d399" },
  { id: "main-active", name: "Active", color: "#22d3ee" },
  { id: "main-member", name: "Member", color: "#94a3b8" },
];

/** Roles of JoHood Catalog (staff roles live here). */
export const SERVER_ROLES: DiscordRole[] = [
  { id: "role-owner", name: "Owner", color: "#f472b6" },
  { id: "role-founder", name: "Founder", color: "#e879f9" },
  { id: "role-head-managers", name: "Head Managers", color: "#c084fc" },
  { id: "role-manager", name: "Manager", color: "#a78bfa" },
  { id: "role-dev", name: "Dev", color: "#38bdf8" },
  { id: "role-head-support", name: "Head of Support", color: "#34d399" },
  { id: "role-support", name: "Support Staff", color: "#6ee7b7" },
  { id: "role-vip", name: "VIP", color: "#fbbf24" },
  { id: "role-booster", name: "Server Booster", color: "#f9a8d4" },
  { id: "role-verified", name: "Verified", color: "#94a3b8" },
  { id: "role-member", name: "Member", color: "#64748b" },
];

export const STAFF_ROLE_IDS: Record<Role, string> = {
  owner: "role-owner",
  manager: "role-manager",
  dev: "role-dev",
  head_support: "role-head-support",
  support: "role-support",
};

/** Fake staff. The `mock-*` IDs double as the identities offered by mock login. */
export const MOCK_STAFF: { discordId: string; name: string; roles: Role[] }[] = [
  { discordId: "mock-owner", name: "Mock Owner", roles: ["owner"] },
  { discordId: "mock-manager", name: "Mock Manager", roles: ["manager"] },
  { discordId: "mock-dev", name: "Mock Dev", roles: ["dev"] },
  { discordId: "mock-head-support", name: "Mock Head of Support", roles: ["head_support"] },
  { discordId: "mock-support", name: "Mock Support", roles: ["support"] },
  { discordId: "900000000000000901", name: "Faris (staff)", roles: ["manager"] },
  { discordId: "900000000000000902", name: "Lina (staff)", roles: ["head_support"] },
  { discordId: "900000000000000903", name: "Yazan (staff)", roles: ["dev", "support"] },
  { discordId: "900000000000000904", name: "Reem (staff)", roles: ["support"] },
  { discordId: "900000000000000905", name: "Omar (staff)", roles: ["support"] },
];

export const TICKET_SUBJECTS: Record<TicketCategory, readonly string[]> = {
  conversion: ["Transfer not received", "لم يصلني التحويل", "Robux amount is wrong", "التحويل معلق من أمس"],
  purchase: ["Points missing after purchase", "نقاط الشراء ما نزلت", "Bought item twice"],
  report: ["Report a scammer", "بلاغ عن شخص ينصب", "Spam in general chat"],
  support: ["Can't link my Roblox account", "كيف أربط حسابي؟", "Rank not updating"],
  partnership: ["Partnership request", "طلب شراكة سيرفر"],
};

export const LOG_LINES: Record<"info" | "warn" | "error" | "debug", readonly string[]> = {
  debug: ["heartbeat ack", "cache sweep: {n} entries", "gateway sequence {n}"],
  info: [
    "command /{cmd} handled in {n}ms",
    "member joined, roles synced",
    "interaction deferred",
    "shard 0 ready",
    "config reloaded",
  ],
  warn: ["rate limited on route /channels/:id/messages, retry in {n}ms", "slow interaction ({n}ms)", "reconnecting to voice gateway"],
  error: [
    "DiscordAPIError[50013]: Missing Permissions",
    "TypeError: Cannot read properties of undefined (reading 'id')",
    "ECONNRESET while contacting Roblox API",
    "Voice connection timed out after 15000ms",
  ],
};

export const COMMANDS = ["points", "rank", "ticket", "link", "play", "skip", "top", "redeem", "help"] as const;
