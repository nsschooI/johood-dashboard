import { NextResponse, type NextRequest } from "next/server";
import { clientIp } from "@/lib/server/api";
import { env } from "@/lib/server/env";
import { mockGiveaways } from "@/lib/server/giveaways";
import { createMemberSession, setMemberCookie } from "@/lib/server/member-session";
import { rateLimit } from "@/lib/server/rate-limit";
import { MOCK_MEMBER } from "@/lib/giveaways/mock";
import { safeNext } from "@/lib/giveaways/next";

export const dynamic = "force-dynamic";

/**
 * GET /api/giveaways/login?next=/giveaways/3 — sign a member in (scope
 * `identify`) and return to `next` (validated: relative, under /giveaways).
 */
export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (!rateLimit(`gw-login:${clientIp(req) ?? "local"}`, 20, 5 * 60_000).ok) {
    return NextResponse.redirect(new URL(`/giveaways?error=rate_limited`, env.appUrl));
  }

  if (mockGiveaways()) {
    // MOCK: a fake member so the whole flow can be clicked through without Discord.
    const { token, expiresAt } = createMemberSession({ ...MOCK_MEMBER });
    const res = NextResponse.redirect(new URL(next, env.appUrl));
    setMemberCookie(res, token, expiresAt);
    return res;
  }

  // REAL: redirect to https://discord.com/oauth2/authorize with scope=identify,
  // a one-time `state` cookie (httpOnly, path=/api/giveaways) that also carries
  // the validated `next`, and redirect_uri = ${APP_URL}/api/giveaways/callback.
  // The callback exchanges the code, reads /users/@me, calls
  // createMemberSession({ id, name, avatarUrl }) + setMemberCookie and redirects
  // to `next`. Never put tokens in URLs or logs.
  return NextResponse.redirect(new URL(`/giveaways?error=login_unavailable`, env.appUrl));
}
