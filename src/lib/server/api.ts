import "server-only";
/**
 * The guard every API route goes through:
 *   session → CSRF/origin (mutations) → can(user, action) → rate limit → handler
 * Denied mutations are written to the audit log with ok=false.
 */
import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { DASHBOARD_CONFIG } from "@config/dashboard";
import { canAny, type Action, type SessionUser } from "../permissions";
import { ProviderError } from "../provider/errors";
import { DEFAULT_GUILD, isGuildKey, type GuildKey } from "../types";
import { env } from "./env";
import { rateLimit } from "./rate-limit";
import { sessionCookieName } from "./session";
import { resolveSession, writeAudit, type AuditInput, type SessionRecord } from "./store";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message ?? code);
  }
}

export type RateLimitBucket = keyof typeof DASHBOARD_CONFIG.rateLimits;

export interface GuardOptions {
  /** User needs at least one of these. Omit for "any signed-in staff". */
  permission?: Action | readonly Action[];
  /** State-changing request: enforces CSRF + origin checks. */
  mutation?: boolean;
  rateLimit?: RateLimitBucket;
}

export interface RouteCtx<P> {
  req: NextRequest;
  user: SessionUser;
  session: SessionRecord;
  params: P;
  ip: string | null;
  /** Write an audit entry as the current user. */
  audit: (e: Omit<AuditInput, "actor" | "ip">) => void;
  /** Throw 403 (and log the denied attempt) unless the user can do `action`. */
  require: (action: Action, target?: string) => void;
  /**
   * Declare what this mutation is about to do. If the backend then answers
   * 501 (not built yet) or fails, the guard records the attempt with that
   * action/target instead of a change that never happened.
   */
  intent: (e: { action: string; target?: string | null; reason?: string | null; before?: unknown; after?: unknown }) => void;
  /** Server selected by `?guild=` (default: main). */
  guild: GuildKey;
}

export function clientIp(req: NextRequest): string | null {
  if (!env.trustProxy) return null;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64);
  return req.headers.get("x-real-ip")?.slice(0, 64) ?? null;
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    const headers: Record<string, string> = {};
    if (err.status === 429 && typeof err.extra?.retryAfterMs === "number") headers["Retry-After"] = String(Math.ceil(err.extra.retryAfterMs / 1000));
    return NextResponse.json({ error: err.code, message: err.message, ...err.extra }, { status: err.status, headers });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "invalid_input", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  }
  if (err instanceof ProviderError) {
    if (err.code === "not_implemented") {
      return NextResponse.json({ error: "not_implemented", message: "This action is not connected yet" }, { status: 501 });
    }
    return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
  }
  console.error("[api] unhandled error", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

function sameOrigin(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return site === "same-origin";
  const allowed = new Set([new URL(env.appUrl).origin, req.nextUrl.origin]);
  return allowed.has(origin);
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Check origin for unauthenticated POSTs (login). */
export function assertSameOrigin(req: NextRequest) {
  if (!sameOrigin(req)) throw new ApiError(403, "bad_origin");
}

/** 428: the client must repeat the request with `confirm: true` after asking the user. */
export function requireConfirm(confirmed: boolean | undefined, what: string) {
  if (!confirmed) throw new ApiError(428, "confirm_required", `Confirm ${what}`);
}

/** `?guild=main|catalog`, defaulting to the main server. */
export function readGuild(req: NextRequest): GuildKey {
  const g = req.nextUrl.searchParams.get("guild");
  return isGuildKey(g) ? g : DEFAULT_GUILD;
}

export function guard<P = Record<string, never>>(opts: GuardOptions, fn: (ctx: RouteCtx<P>) => Promise<unknown>) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }) => {
    let attempt: { user: SessionUser; ip: string | null; intent: Parameters<RouteCtx<P>["intent"]>[0] | null } | null = null;
    try {
      const session = resolveSession(req.cookies.get(sessionCookieName())?.value);
      if (!session) throw new ApiError(401, "unauthenticated");
      const { user } = session;
      const ip = clientIp(req);
      const params = (await routeCtx?.params) ?? ({} as P);
      const perms = opts.permission === undefined ? [] : typeof opts.permission === "string" ? [opts.permission] : opts.permission;

      if (opts.mutation) {
        const token = req.headers.get("x-csrf-token") ?? "";
        if (!sameOrigin(req) || !safeEqual(token, session.csrf)) throw new ApiError(403, "csrf_failed");
      }
      if (perms.length && !canAny(user, perms)) {
        if (opts.mutation) {
          writeAudit({ actor: user, action: perms[0]!, target: req.nextUrl.pathname, ok: false, ip, reason: "forbidden" });
        }
        throw new ApiError(403, "forbidden");
      }
      if (opts.rateLimit) {
        const { limit, windowMs } = DASHBOARD_CONFIG.rateLimits[opts.rateLimit];
        const rl = rateLimit(`${opts.rateLimit}:${user.discordId}`, limit, windowMs);
        if (!rl.ok) throw new ApiError(429, "rate_limited", "Too many requests", { retryAfterMs: rl.retryAfterMs });
      }

      if (opts.mutation) attempt = { user, ip, intent: perms[0] ? { action: perms[0], target: req.nextUrl.pathname } : null };
      const result = await fn({
        req,
        user,
        session,
        params,
        ip,
        guild: readGuild(req),
        audit: (e) => writeAudit({ ...e, actor: user, ip }),
        require: (action, target) => {
          if (attempt) attempt.intent = { action, target: target ?? req.nextUrl.pathname };
          if (canAny(user, [action])) return;
          writeAudit({ actor: user, action, target: target ?? req.nextUrl.pathname, outcome: "denied", ip, reason: "forbidden" });
          throw new ApiError(403, "forbidden");
        },
        intent: (e) => {
          if (attempt) attempt.intent = { ...attempt.intent, ...e };
        },
      });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      // A mutation the backend didn't perform is logged as an attempt, never as a change.
      if (attempt?.intent && err instanceof ProviderError && ["not_implemented", "unavailable", "upstream"].includes(err.code)) {
        const { action, target, reason, before } = attempt.intent;
        writeAudit({
          actor: attempt.user,
          ip: attempt.ip,
          action,
          target: target ?? null,
          reason: reason ?? null,
          before,
          after: attempt.intent.after,
          outcome: err.code === "not_implemented" ? "not_connected" : "failed",
        });
      }
      return errorResponse(err);
    }
  };
}

const MAX_BODY = 32 * 1024;

export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) throw new ApiError(413, "body_too_large");
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) throw new ApiError(413, "body_too_large");
    raw = text ? JSON.parse(text) : {};
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, "invalid_json");
  }
  return schema.parse(raw);
}

/** Parse query params with a schema. */
export function readQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}
