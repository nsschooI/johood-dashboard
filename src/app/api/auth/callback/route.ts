import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { rolesFromDiscord } from "@config/roles";
import { clientIp } from "@/lib/server/api";
import { exchangeCode, fetchGuildMember } from "@/lib/server/discord";
import { env } from "@/lib/server/env";
import { sessionCookieName, sessionCookieOptions } from "@/lib/server/session";
import { createSession, writeAudit } from "@/lib/server/store";

export const dynamic = "force-dynamic";

function fail(code: string) {
  const res = NextResponse.redirect(new URL(`/login?error=${code}`, env.appUrl));
  res.cookies.delete({ name: "jh_oauth_state", path: "/api/auth" });
  return res;
}

/** Discord redirects here with ?code&state. */
export async function GET(req: NextRequest) {
  if (!env.discordConfigured) return fail("config");
  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail("denied");
  const code = params.get("code");
  const state = params.get("state") ?? "";
  const expected = req.cookies.get("jh_oauth_state")?.value ?? "";
  if (!code || !expected || state.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expected))) {
    return fail("state");
  }

  try {
    const accessToken = await exchangeCode(code);
    const member = await fetchGuildMember(accessToken);
    if (!member) return fail("not_member");
    const roles = rolesFromDiscord(member.roleIds);
    if (!roles.length) return fail("not_staff");

    const user = { discordId: member.discordId, name: member.name, avatarUrl: member.avatarUrl, roles };
    const ip = clientIp(req);
    const { token, expiresAt } = createSession(user, { ip, userAgent: req.headers.get("user-agent") });
    writeAudit({ actor: user, action: "auth.login", target: "discord", ip });

    const res = NextResponse.redirect(new URL("/overview", env.appUrl));
    res.cookies.set(sessionCookieName(), token, sessionCookieOptions(expiresAt));
    res.cookies.delete({ name: "jh_oauth_state", path: "/api/auth" });
    return res;
  } catch (err) {
    console.error("[auth] discord callback failed", err);
    return fail("oauth");
  }
}
