/**
 * Giveaways — public data contract (see docs/giveaways.md).
 *
 * The "Giveaways System" Discord bot runs giveaways; these pages are what
 * its "Details · التفاصيل" button opens. Members follow a giveaway, see what
 * they still need, authorize our app and join.
 */

export type Requirement = { type: "server"; key: string; name: string } | { type: "authorize" };

export interface Winner {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface GiveawayServerRequirement {
  key: string;
  id: string;
  name: string;
  /** Optional invite link so a member can join the server from our page. */
  inviteUrl?: string;
}

export interface Giveaway {
  id: number;
  prize: string;
  status: "active" | "ended";
  /** ISO time the giveaway ends / ended. */
  endsAt: string;
  winnersCount: number;
  hostId: string;
  hostName?: string;
  hostAvatarUrl?: string;
  entries: number;
  requirements: { servers: GiveawayServerRequirement[]; authorize: boolean };
  /** Only when ended. */
  winners: Winner[];
  messageUrl: string | null;
  bannerUrl?: string;
  // Only when a member is signed in:
  joined?: boolean;
  authorized?: boolean;
  missing?: Requirement[];
}

export type JoinStatus = "joined" | "already" | "missing" | "ended" | "notfound";

export interface JoinResult {
  status: JoinStatus;
  missing?: Requirement[];
}

/** The `giveaways` section of the DataProvider. */
export interface GiveawaysApi {
  list(): Promise<Giveaway[]>;
  get(id: number, memberId?: string): Promise<Giveaway | null>;
  join(id: number, memberId: string): Promise<JoinResult>;
  authorizeState(memberId: string): Promise<{ authorized: boolean }>;
  revoke(memberId: string): Promise<{ removed: boolean }>;
}

/** A signed-in member (public area). Never carries staff roles. */
export interface PublicMember {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** Sort for the list page: running first (soonest ending), then ended (latest first). */
export function sortGiveaways(list: Giveaway[]): Giveaway[] {
  const running = list.filter((g) => g.status === "active").sort((a, b) => a.endsAt.localeCompare(b.endsAt));
  const ended = list.filter((g) => g.status === "ended").sort((a, b) => b.endsAt.localeCompare(a.endsAt));
  return [...running, ...ended];
}
