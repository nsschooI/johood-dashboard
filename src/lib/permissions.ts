/**
 * The permission matrix. This file is the single source of truth: API routes,
 * server components and the UI all ask `can(user, action)`. docs/permissions.md
 * mirrors it and a test keeps the two in sync.
 *
 * Isomorphic on purpose (no server-only imports) so the client can hide what
 * a user cannot use. Hiding is a courtesy; the server always re-checks.
 */
import { DASHBOARD_CONFIG } from "@config/dashboard";
import { ROLES, type Role } from "./types";

export const ACTIONS = [
  "bots.view",
  "bots.logs",
  "bots.restart",
  "bots.stop",
  "assistants.view",
  "assistants.control",
  "stats.view",
  "activity.view",
  "tickets.view",
  "tickets.claim",
  "tickets.reply",
  "tickets.close",
  "tickets.transfer",
  "purchases.view",
  "transfers.view",
  "points.view",
  "points.adjust",
  "points.adjust_limited",
  "members.view",
  "members.view_full",
  "staff.view",
  "protection.view",
  "protection.manage",
  "audit.view",
  "permissions.manage",
] as const;
export type Action = (typeof ACTIONS)[number];

const ALL: readonly Action[] = ACTIONS;

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Action[]>> = {
  owner: ALL,
  manager: ALL.filter((a) => a !== "permissions.manage" && a !== "points.adjust_limited"),
  dev: ["bots.view", "bots.logs", "bots.restart", "assistants.view", "activity.view"],
  head_support: [
    "stats.view",
    "activity.view",
    "tickets.view",
    "tickets.claim",
    "tickets.reply",
    "tickets.close",
    "tickets.transfer",
    "purchases.view",
    "transfers.view",
    "points.view",
    "points.adjust_limited",
    "members.view",
    "members.view_full",
  ],
  support: ["activity.view", "tickets.view", "tickets.claim", "tickets.reply", "purchases.view", "members.view"],
};

/**
 * Actions that can never be granted through a per-user override: only the
 * Owner role carries them, so an override can't be used to escalate.
 */
export const NON_GRANTABLE: readonly Action[] = ["permissions.manage"];

/** Actions that must pass an explicit confirm step (enforced server-side). */
export const CONFIRM_REQUIRED: readonly Action[] = ["bots.stop", "permissions.manage"];

export interface PermissionOverrides {
  allow: Action[];
  deny: Action[];
}

/** The authenticated staff member, as resolved from the session. */
export interface SessionUser {
  discordId: string;
  name: string;
  avatarUrl: string | null;
  roles: Role[];
  /** Per-user grants/denials set by an Owner. */
  overrides?: PermissionOverrides;
}

export function isAction(value: unknown): value is Action {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Effective permission set: union of role grants, plus allows, minus denies. */
export function permissionsFor(user: Pick<SessionUser, "roles" | "overrides"> | null | undefined): Set<Action> {
  const set = new Set<Action>();
  if (!user) return set;
  for (const role of user.roles) for (const a of ROLE_PERMISSIONS[role] ?? []) set.add(a);
  const isOwner = user.roles.includes("owner");
  for (const a of user.overrides?.allow ?? []) {
    if (isAction(a) && !NON_GRANTABLE.includes(a)) set.add(a);
  }
  for (const a of user.overrides?.deny ?? []) {
    // An owner can't be locked out of permission management.
    if (isOwner && a === "permissions.manage") continue;
    set.delete(a);
  }
  return set;
}

export function can(user: Pick<SessionUser, "roles" | "overrides"> | null | undefined, action: Action): boolean {
  return permissionsFor(user).has(action);
}

export function canAny(user: Pick<SessionUser, "roles" | "overrides"> | null | undefined, actions: readonly Action[]) {
  const set = permissionsFor(user);
  return actions.some((a) => set.has(a));
}

/** Highest role, for display. */
export function primaryRole(roles: readonly Role[]): Role | null {
  return ROLES.find((r) => roles.includes(r)) ?? null;
}

/**
 * Largest absolute point adjustment the user may make in one go.
 * Infinity = unlimited, 0 = not allowed.
 */
export function maxPointAdjust(user: Pick<SessionUser, "roles" | "overrides"> | null | undefined): number {
  const set = permissionsFor(user);
  if (set.has("points.adjust")) return Number.POSITIVE_INFINITY;
  if (set.has("points.adjust_limited")) return DASHBOARD_CONFIG.limitedAdjustMax;
  return 0;
}

/** Adjustments above the threshold are "dangerous" and need a confirm step. */
export function pointAdjustNeedsConfirm(delta: number): boolean {
  return Math.abs(delta) > DASHBOARD_CONFIG.pointsConfirmThreshold;
}

/** Pages and the permissions that make them visible. */
export const PAGE_ACCESS = {
  overview: ["bots.view", "assistants.view", "stats.view", "tickets.view", "activity.view"],
  points: ["purchases.view", "transfers.view", "points.view"],
  members: ["members.view", "staff.view", "protection.view", "audit.view"],
  /** Everyone signed in may see what they (and others) can do. */
  access: [],
} as const satisfies Record<string, readonly Action[]>;
export type PageKey = keyof typeof PAGE_ACCESS;

export function canSeePage(user: Pick<SessionUser, "roles" | "overrides"> | null | undefined, page: PageKey) {
  const needs: readonly Action[] = PAGE_ACCESS[page];
  if (needs.length === 0) return Boolean(user && user.roles.length > 0) || permissionsFor(user).size > 0;
  return canAny(user, needs);
}

/** Roles that grant an action, lowest first (for "Needs … role" hints). */
export function rolesGranting(action: Action): Role[] {
  return [...ROLES].reverse().filter((r) => ROLE_PERMISSIONS[r].includes(action));
}

export type DenialReason = { kind: "role"; roles: Role[] } | { kind: "override" } | { kind: "owner_only" };

/**
 * Why a user can't do something — for tooltips on disabled controls.
 * null when they can.
 */
export function denialReason(user: Pick<SessionUser, "roles" | "overrides"> | null | undefined, action: Action): DenialReason | null {
  if (can(user, action)) return null;
  if (user?.overrides?.deny.includes(action)) return { kind: "override" };
  if (NON_GRANTABLE.includes(action)) return { kind: "owner_only" };
  const roles = rolesGranting(action);
  // Suggest the lowest role that would grant it.
  return { kind: "role", roles: roles.slice(0, 1) };
}
