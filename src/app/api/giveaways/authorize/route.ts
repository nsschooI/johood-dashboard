import { NextResponse, type NextRequest } from "next/server";
import { clientIp } from "@/lib/server/api";
import { env } from "@/lib/server/env";
import { mockGiveaways, withFlag } from "@/lib/server/giveaways";
import { MEMBER_COOKIE, createMemberSession, resolveMemberSession, setMemberCookie } from "@/lib/server/member-session";
import { rateLimit } from "@/lib/server/rate-limit";
import { MOCK_MEMBER } from "@/lib/giveaways/mock";
import { safeNext } from "@/lib/giveaways/next";

export const dynamic = "force-dynamic";

/**
 * GET /api/giveaways/authorize?next=… — the "Authorize" button: Discord's
 * own consent screen with scopes `identify guilds.join`.
 */
export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (!rateLimit(`gw-authorize:${clientIp(req) ?? "local"}`, 20, 5 * 60_000).ok) {
    return NextResponse.redirect(new URL(`/giveaways?error=rate_limited`, env.appUrl));
  }

  const mock = mockGiveaways();
  if (mock) {
    // MOCK: stands in for consent + callback. Signs the fake member in if
    // needed and records the authorization, then returns to `next`.
    let session = resolveMemberSession(req.cookies.get(MEMBER_COOKIE)?.value);
    const res = NextResponse.redirect(new URL(withFlag(next, "authorized"), env.appUrl));
    if (!session) {
      const created = createMemberSession({ ...MOCK_MEMBER });
      setMemberCookie(res, created.token, created.expiresAt);
      session = { member: { ...MOCK_MEMBER }, csrf: created.csrf, expiresAt: created.expiresAt };
    }
    mock.mockAuthorize(session.member.id);
    return res;
  }

  // REAL: redirect to https://discord.com/oauth2/authorize with
  // scope="identify guilds.join", prompt=consent, a one-time `state` cookie
  // carrying the validated `next`, redirect_uri = ${APP_URL}/api/giveaways/callback.
  // The callback hands the OAuth tokens to the bot backend server-to-server
  // (it stores them for guilds.join) — never to the browser, never in a URL,
  // never in logs — then signs the member in and redirects to `next?authorized=1`.
  return NextResponse.redirect(new URL(withFlag(next, "error", "authorize_unavailable"), env.appUrl));
}
