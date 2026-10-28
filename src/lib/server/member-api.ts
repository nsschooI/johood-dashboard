import "server-only";
/**
 * Guard for the public giveaway API: member session (if required), CSRF +
 * same-origin on every POST, per-member rate limits. Never touches staff
 * sessions or permissions.
 */
import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError, assertSameOrigin, errorResponse } from "./api";
import { rateLimit } from "./rate-limit";
import { MEMBER_COOKIE, resolveMemberSession, type MemberSession } from "./member-session";

export interface MemberCtx<P> {
  req: NextRequest;
  session: MemberSession | null;
  params: P;
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function memberGuard<P = Record<string, never>>(
  opts: { requireMember?: boolean; mutation?: boolean; rateLimit?: { key: string; limit: number; windowMs: number } },
  fn: (ctx: MemberCtx<P>) => Promise<unknown>,
) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }) => {
    try {
      const session = resolveMemberSession(req.cookies.get(MEMBER_COOKIE)?.value);
      if ((opts.requireMember || opts.mutation) && !session) throw new ApiError(401, "login_required");
      if (opts.mutation) {
        assertSameOrigin(req);
        const token = req.headers.get("x-csrf-token") ?? "";
        if (!session || !safeEqual(token, session.csrf)) throw new ApiError(403, "csrf_failed");
      }
      if (opts.rateLimit && session) {
        const rl = rateLimit(`${opts.rateLimit.key}:${session.member.id}`, opts.rateLimit.limit, opts.rateLimit.windowMs);
        if (!rl.ok) throw new ApiError(429, "rate_limited", "Too many requests", { retryAfterMs: rl.retryAfterMs });
      }
      const params = (await routeCtx?.params) ?? ({} as P);
      const result = await fn({ req, session, params });
      if (result instanceof Response) return result;
      return NextResponse.json(result === undefined ? { ok: true } : result, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return errorResponse(err);
    }
  };
}
