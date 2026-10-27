/**
 * What each permission lets a user *read*. Used by the SSE stream and the
 * API routes to filter / redact data before it leaves the server.
 */
import type { ActivityItem, ActivityKind, LiveEvent, MemberProfile } from "./types";
import { can, type Action, type SessionUser } from "./permissions";

type U = Pick<SessionUser, "roles" | "overrides">;

export const ACTIVITY_PERMISSION: Record<ActivityKind, Action> = {
  purchase: "purchases.view",
  transfer: "transfers.view",
  redeem: "points.view",
  points_adjust: "points.view",
  bot: "bots.view",
  assistant: "assistants.view",
  member_join: "stats.view",
  ticket: "tickets.view",
  protection: "protection.view",
};

export function canSeeActivity(user: U, item: ActivityItem) {
  return can(user, "activity.view") && can(user, ACTIVITY_PERMISSION[item.kind]);
}

/** Permission required to receive a live event (null = never forwarded). */
export function eventPermission(event: LiveEvent): Action | null {
  switch (event.type) {
    case "purchase":
      return "purchases.view";
    case "transfer":
      return "transfers.view";
    case "redemption":
    case "ledger":
      return "points.view";
    case "bot":
      return "bots.view";
    case "log":
      return "bots.logs";
    case "assistant":
      return "assistants.view";
    case "stats":
      return "stats.view";
    case "ticket":
      return "tickets.view";
    case "protection":
      return "protection.view";
    case "activity":
      return "activity.view";
  }
}

export function canReceive(user: U, event: LiveEvent): boolean {
  if (event.type === "activity") return canSeeActivity(user, event.data);
  const perm = eventPermission(event);
  return perm !== null && can(user, perm);
}

/** Strip economy data from a profile for users without members.view_full. */
export function redactProfile(user: U, profile: MemberProfile): MemberProfile {
  if (can(user, "members.view_full")) return profile;
  return {
    ...profile,
    points: null,
    lifetimePoints: null,
    totalRobux: null,
    purchases: null,
    tickets: can(user, "tickets.view") ? profile.tickets : [],
  };
}
