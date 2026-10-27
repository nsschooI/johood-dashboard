import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl } from "@/lib/server/discord";
import { clientIp } from "@/lib/server/api";
import { env } from "@/lib/server/env";
import { rateLimit } from "@/lib/server/rate-limit";
import { DASHBOARD_CONFIG } from "@config/dashboard";

export const dynamic = "force-dynamic";

/** Start Discord OAuth: set a one-time state cookie and redirect. */
export async function GET(req: NextRequest) {
  if (!env.discordConfigured) return NextResponse.redirect(new URL("/login?error=config", env.appUrl));
  const { limit, windowMs } = DASHBOARD_CONFIG.rateLimits.login;
  if (!rateLimit(`login:${clientIp(req) ?? "local"}`, limit, windowMs).ok) {
    return NextResponse.redirect(new URL("/login?error=oauth", env.appUrl));
  }
  const state = crypto.randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set("jh_oauth_state", state, {
    httpOnly: true,
    secure: env.secureCookies,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 600,
  });
  return res;
}
