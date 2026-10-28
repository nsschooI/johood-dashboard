import "server-only";
/**
 * Public member sessions for the giveaway pages. Deliberately separate from
 * staff sessions: own table, own cookie (`jh_member`), no roles and no
 * permissions — a member session can never reach a staff API.
 */
import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { PublicMember } from "../giveaways/types";
import { getDb } from "./db";
import { env } from "./env";

export const MEMBER_COOKIE = "jh_member";
const TTL_MS = 30 * 24 * 3_600_000;

export interface MemberSession {
  member: PublicMember;
  csrf: string;
  expiresAt: number;
}

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export function createMemberSession(member: PublicMember, now = Date.now()) {
  const token = crypto.randomBytes(32).toString("base64url");
  const csrf = crypto.randomBytes(24).toString("base64url");
  const expiresAt = now + TTL_MS;
  const db = getDb();
  db.prepare("DELETE FROM member_sessions WHERE expires_at < ?").run(now);
  db.prepare("INSERT INTO member_sessions (token_hash, member_id, name, avatar_url, csrf, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    sha256(token),
    member.id,
    member.name,
    member.avatarUrl,
    csrf,
    now,
    expiresAt,
  );
  return { token, csrf, expiresAt };
}

export function resolveMemberSession(token: string | undefined | null, now = Date.now()): MemberSession | null {
  if (!token || token.length > 100) return null;
  const row = getDb().prepare("SELECT * FROM member_sessions WHERE token_hash = ?").get(sha256(token)) as
    | { member_id: string; name: string; avatar_url: string | null; csrf: string; expires_at: number }
    | undefined;
  if (!row || row.expires_at < now) return null;
  return { member: { id: row.member_id, name: row.name, avatarUrl: row.avatar_url }, csrf: row.csrf, expiresAt: row.expires_at };
}

export function deleteMemberSession(token: string | undefined | null) {
  if (!token) return;
  getDb().prepare("DELETE FROM member_sessions WHERE token_hash = ?").run(sha256(token));
}

export function setMemberCookie(res: NextResponse, token: string, expiresAt: number) {
  res.cookies.set(MEMBER_COOKIE, token, { httpOnly: true, secure: env.secureCookies, sameSite: "lax", path: "/", expires: new Date(expiresAt) });
}

export function clearMemberCookie(res: NextResponse) {
  res.cookies.set(MEMBER_COOKIE, "", { httpOnly: true, secure: env.secureCookies, sameSite: "lax", path: "/", maxAge: 0 });
}

/** Current member for server components (memoised per request). */
export const getMemberSession = cache(async (): Promise<MemberSession | null> => {
  const jar = await cookies();
  return resolveMemberSession(jar.get(MEMBER_COOKIE)?.value);
});
