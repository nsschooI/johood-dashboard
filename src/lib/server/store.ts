import "server-only";
/**
 * SQLite-backed stores: sessions, audit log, preferences, permission
 * overrides. Pure functions over the DB so they're easy to test.
 */
import crypto from "node:crypto";
import type { AuditEntry, AuditQuery, Role } from "../types";
import { isAction, isRole, type Action, type PermissionOverrides, type SessionUser } from "../permissions";
import { DASHBOARD_CONFIG } from "@config/dashboard";
import { getDb } from "./db";

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface SessionRecord {
  user: SessionUser;
  csrf: string;
  expiresAt: number;
}

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export function createSession(
  user: Pick<SessionUser, "discordId" | "name" | "avatarUrl" | "roles">,
  meta: { ip?: string | null; userAgent?: string | null } = {},
  now = Date.now(),
): { token: string; csrf: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString("base64url");
  const csrf = crypto.randomBytes(24).toString("base64url");
  const expiresAt = now + DASHBOARD_CONFIG.sessionTtlHours * 3_600_000;
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
  db.prepare(
    `INSERT INTO sessions (token_hash, discord_id, name, avatar_url, roles, csrf, created_at, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(sha256(token), user.discordId, user.name, user.avatarUrl, JSON.stringify(user.roles), csrf, now, expiresAt, meta.ip ?? null, meta.userAgent?.slice(0, 200) ?? null);
  return { token, csrf, expiresAt };
}

export function resolveSession(token: string | undefined | null, now = Date.now()): SessionRecord | null {
  if (!token || token.length > 100) return null;
  const row = getDb().prepare("SELECT * FROM sessions WHERE token_hash = ?").get(sha256(token)) as
    | { discord_id: string; name: string; avatar_url: string | null; roles: string; csrf: string; expires_at: number }
    | undefined;
  if (!row || row.expires_at < now) return null;
  const roles = (JSON.parse(row.roles) as unknown[]).filter(isRole) as Role[];
  return {
    user: { discordId: row.discord_id, name: row.name, avatarUrl: row.avatar_url, roles, overrides: getOverrides(row.discord_id) },
    csrf: row.csrf,
    expiresAt: row.expires_at,
  };
}

export function deleteSession(token: string | undefined | null) {
  if (!token) return;
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}

/** Sign a member out everywhere (e.g. after their access was revoked). */
export function deleteSessionsFor(discordId: string) {
  return getDb().prepare("DELETE FROM sessions WHERE discord_id = ?").run(discordId).changes;
}

// ---------------------------------------------------------------------------
// Permission overrides
// ---------------------------------------------------------------------------

export function getOverrides(discordId: string): PermissionOverrides {
  const rows = getDb().prepare("SELECT action, effect FROM permission_overrides WHERE discord_id = ?").all(discordId) as { action: string; effect: string }[];
  const out: PermissionOverrides = { allow: [], deny: [] };
  for (const r of rows) {
    if (!isAction(r.action)) continue;
    (r.effect === "allow" ? out.allow : out.deny).push(r.action);
  }
  return out;
}

export function getAllOverrides(): Record<string, PermissionOverrides> {
  const rows = getDb().prepare("SELECT discord_id, action, effect FROM permission_overrides").all() as { discord_id: string; action: string; effect: string }[];
  const out: Record<string, PermissionOverrides> = {};
  for (const r of rows) {
    if (!isAction(r.action)) continue;
    const o = (out[r.discord_id] ??= { allow: [], deny: [] });
    (r.effect === "allow" ? o.allow : o.deny).push(r.action);
  }
  return out;
}

/** Replace a member's overrides. Returns the previous value for the audit log. */
export function setOverrides(discordId: string, next: PermissionOverrides, setBy: string): PermissionOverrides {
  const db = getDb();
  const before = getOverrides(discordId);
  const at = new Date().toISOString();
  db.transaction(() => {
    db.prepare("DELETE FROM permission_overrides WHERE discord_id = ?").run(discordId);
    const ins = db.prepare("INSERT INTO permission_overrides (discord_id, action, effect, set_by, set_at) VALUES (?, ?, ?, ?, ?)");
    const seen = new Set<Action>();
    for (const a of next.deny) if (!seen.has(a)) (seen.add(a), ins.run(discordId, a, "deny", setBy, at));
    for (const a of next.allow) if (!seen.has(a)) (seen.add(a), ins.run(discordId, a, "allow", setBy, at));
  })();
  return before;
}

// ---------------------------------------------------------------------------
// Audit log (append-only; enforced by triggers)
// ---------------------------------------------------------------------------

export interface AuditInput {
  actor: Pick<SessionUser, "discordId" | "name" | "roles">;
  action: string;
  target?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  ok?: boolean;
  ip?: string | null;
}

export function writeAudit(e: AuditInput, now = new Date()): number {
  const res = getDb()
    .prepare(
      `INSERT INTO audit_log (at, actor_id, actor_name, actor_roles, action, target, reason, before_json, after_json, ok, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      now.toISOString(),
      e.actor.discordId,
      e.actor.name,
      JSON.stringify(e.actor.roles),
      e.action,
      e.target ?? null,
      e.reason ?? null,
      e.before === undefined ? null : JSON.stringify(e.before),
      e.after === undefined ? null : JSON.stringify(e.after),
      e.ok === false ? 0 : 1,
      e.ip ?? null,
    );
  return Number(res.lastInsertRowid);
}

type AuditRow = {
  id: number; at: string; actor_id: string; actor_name: string; actor_roles: string; action: string;
  target: string | null; reason: string | null; before_json: string | null; after_json: string | null; ok: number; ip: string | null;
};

const parse = (s: string | null) => (s === null ? null : (JSON.parse(s) as unknown));

export function queryAudit(q: AuditQuery = {}): { items: AuditEntry[]; nextCursor: number | null } {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (q.actorId) (where.push("actor_id = ?"), args.push(q.actorId));
  if (q.action) (where.push("action LIKE ? ESCAPE '\\'"), args.push(`${escapeLike(q.action)}%`));
  if (q.from) (where.push("at >= ?"), args.push(q.from));
  if (q.to) (where.push("at <= ?"), args.push(q.to));
  if (q.beforeId) (where.push("id < ?"), args.push(q.beforeId));
  if (q.q) {
    const like = `%${escapeLike(q.q)}%`;
    where.push("(actor_name LIKE ? ESCAPE '\\' OR target LIKE ? ESCAPE '\\' OR reason LIKE ? ESCAPE '\\' OR action LIKE ? ESCAPE '\\')");
    args.push(like, like, like, like);
  }
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
  const rows = getDb()
    .prepare(`SELECT * FROM audit_log ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC LIMIT ?`)
    .all(...args, limit) as AuditRow[];
  const items = rows.map<AuditEntry>((r) => ({
    id: r.id,
    at: r.at,
    actorId: r.actor_id,
    actorName: r.actor_name,
    actorRoles: (JSON.parse(r.actor_roles) as unknown[]).filter(isRole) as Role[],
    action: r.action,
    target: r.target,
    reason: r.reason,
    before: parse(r.before_json),
    after: parse(r.after_json),
    ok: r.ok === 1,
    ip: r.ip,
  }));
  return { items, nextCursor: items.length === limit ? items[items.length - 1].id : null };
}

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Distinct actors and actions, for the audit filter dropdowns. */
export function auditFacets() {
  const db = getDb();
  return {
    actors: db.prepare("SELECT actor_id AS id, MAX(actor_name) AS name FROM audit_log GROUP BY actor_id ORDER BY name").all() as { id: string; name: string }[],
    actions: (db.prepare("SELECT DISTINCT action FROM audit_log ORDER BY action").all() as { action: string }[]).map((r) => r.action),
  };
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export interface Prefs {
  locale: "en" | "ar" | null;
  muted: boolean | null;
}

export function getPrefs(discordId: string): Prefs {
  const row = getDb().prepare("SELECT locale, muted FROM user_prefs WHERE discord_id = ?").get(discordId) as { locale: string | null; muted: number | null } | undefined;
  return {
    locale: row?.locale === "ar" || row?.locale === "en" ? row.locale : null,
    muted: row?.muted === null || row?.muted === undefined ? null : row.muted === 1,
  };
}

export function setPrefs(discordId: string, patch: Partial<Prefs>) {
  const cur = getPrefs(discordId);
  const next = { ...cur, ...patch };
  getDb()
    .prepare(
      `INSERT INTO user_prefs (discord_id, locale, muted, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(discord_id) DO UPDATE SET locale = excluded.locale, muted = excluded.muted, updated_at = excluded.updated_at`,
    )
    .run(discordId, next.locale, next.muted === null ? null : next.muted ? 1 : 0, Date.now());
  return next;
}
