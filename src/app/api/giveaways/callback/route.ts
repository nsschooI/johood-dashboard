import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/server/env";
import { withFlag } from "@/lib/server/giveaways";
import {
  GW_STATE_COOKIE,
  GW_STATE_PATH,
  decodeState,
  exchangeGiveawaysCode,
  fetchGiveawaysUser,
  giveawaysOAuthConfigured,
  sameState,
} from "@/lib/server/giveaways-oauth";
import { createMemberSession, setMemberCookie } from "@/lib/server/member-session";
import { getProvider } from "@/lib/provider";
import { RealGiveaways } from "@/lib/provider/real";

export const dynamic = "force-dynamic";

function back(next: string, error?: string) {
  const res = NextResponse.redirect(new URL(error ? withFlag(next, "error", error) : next, env.appUrl));
  res.cookies.delete({ name: GW_STATE_COOKIE, path: GW_STATE_PATH });
  return res;
}

/** Discord comes back here (real mode) after Login or Authorize. */
export async function GET(req: NextRequest) {
  const state = decodeState(req.cookies.get(GW_STATE_COOKIE)?.value);
  const next = state?.next ?? "/giveaways";
  if (!giveawaysOAuthConfigured()) return back(next, "login_unavailable");

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return back(next, "denied");
  const code = params.get("code");
  if (!state || !code || !sameState(params.get("state") ?? "", state.s)) return back(next, "state");

  try {
    const tokens = await exchangeGiveawaysCode(code);
    const user = await fetchGiveawaysUser(tokens.accessToken);

    if (state.mode === "authorize") {
      // the tokens go to the bot backend (server to server), never to the browser
      const giveaways = getProvider().giveaways;
      if (!(giveaways instanceof RealGiveaways)) return back(next, "authorize_unavailable");
      await giveaways.storeAuthorization({ memberId: user.id, username: user.name, ...tokens });
    }

    const session = createMemberSession({ id: user.id, name: user.name, avatarUrl: user.avatarUrl });
    const res = NextResponse.redirect(new URL(state.mode === "authorize" ? withFlag(next, "authorized") : next, env.appUrl));
    setMemberCookie(res, session.token, session.expiresAt);
    res.cookies.delete({ name: GW_STATE_COOKIE, path: GW_STATE_PATH });
    return res;
  } catch (err) {
    console.error("[giveaways] oauth callback failed", err instanceof Error ? err.message : "unknown");
    return back(next, "oauth");
  }
}
