import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { MOCK_STAFF } from "@/lib/provider/mock-data";
import { ROLES } from "@/lib/types";
import { ApiError, assertSameOrigin, clientIp, errorResponse, readJson } from "@/lib/server/api";
import { env } from "@/lib/server/env";
import { rateLimit } from "@/lib/server/rate-limit";
import { applySavedLocale, sessionCookieName, sessionCookieOptions } from "@/lib/server/session";
import { createSession, writeAudit } from "@/lib/server/store";
import { DASHBOARD_CONFIG } from "@config/dashboard";

const Body = z.object({ role: z.enum(ROLES) });

/** Development-only login: sign in as a fake staff member with the chosen role. */
export async function POST(req: NextRequest) {
  try {
    if (!env.mockLoginEnabled) throw new ApiError(404, "not_found");
    assertSameOrigin(req);
    const ip = clientIp(req);
    const { limit, windowMs } = DASHBOARD_CONFIG.rateLimits.login;
    if (!rateLimit(`login:${ip ?? "local"}`, limit, windowMs).ok) throw new ApiError(429, "rate_limited");
    const { role } = await readJson(req, Body);
    const who = MOCK_STAFF.find((s) => s.roles.length === 1 && s.roles[0] === role)!;
    const user = { discordId: who.discordId, name: who.name, avatarUrl: null, roles: [role] };
    const { token, expiresAt } = createSession(user, { ip, userAgent: req.headers.get("user-agent") });
    writeAudit({ actor: user, action: "auth.login", target: "mock", ip });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookieName(), token, sessionCookieOptions(expiresAt));
    applySavedLocale(res, user.discordId);
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
