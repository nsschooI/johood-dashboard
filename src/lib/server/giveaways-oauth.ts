import "server-only";
import crypto from "node:crypto";
import { env } from "./env";

/**
 * Discord OAuth for the public giveaway pages, with the "Giveaways System"
 * application (its own client id and secret, not the staff dashboard's).
 * The bot that adds members to our servers belongs to the same application,
 * which Discord requires for `guilds.join`.
 */

export type GiveawaysOAuthMode = "login" | "authorize";

export const GW_STATE_COOKIE = "jh_gw_oauth";
export const GW_STATE_PATH = "/api/giveaways";
const STATE_TTL_SECONDS = 600;

export const GW_SCOPES: Record<GiveawaysOAuthMode, string> = {
  login: "identify",
  authorize: "identify guilds.join",
};

export function giveawaysOAuthConfigured() {
  const g = env.giveawaysOAuth;
  return Boolean(g.clientId && g.clientSecret);
}

export interface OAuthState {
  /** random value that is also sent to Discord as `state` */
  s: string;
  mode: GiveawaysOAuthMode;
  /** validated relative path under /giveaways */
  next: string;
}

export function newState(mode: GiveawaysOAuthMode, next: string): OAuthState {
  return { s: crypto.randomBytes(24).toString("base64url"), mode, next };
}

export const encodeState = (state: OAuthState) => Buffer.from(JSON.stringify(state)).toString("base64url");

/** Parses the cookie value; null for anything that is not exactly our own shape. */
export function decodeState(raw: string | undefined | null): OAuthState | null {
  if (!raw || raw.length > 600) return null;
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<OAuthState>;
    if (typeof value.s !== "string" || value.s.length < 20 || value.s.length > 80) return null;
    if (value.mode !== "login" && value.mode !== "authorize") return null;
    if (typeof value.next !== "string" || !value.next.startsWith("/giveaways")) return null;
    return { s: value.s, mode: value.mode, next: value.next };
  } catch {
    return null;
  }
}

export function sameState(given: string, expected: string) {
  return given.length === expected.length && given.length > 0 && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export const stateCookieOptions = () => ({
  httpOnly: true,
  secure: env.secureCookies,
  sameSite: "lax" as const,
  path: GW_STATE_PATH,
  maxAge: STATE_TTL_SECONDS,
});

export const callbackUrl = () => `${env.appUrl}/api/giveaways/callback`;

export function authorizeUrl(state: OAuthState) {
  const params = new URLSearchParams({
    client_id: env.giveawaysOAuth.clientId,
    response_type: "code",
    redirect_uri: callbackUrl(),
    scope: GW_SCOPES[state.mode],
    state: state.s,
    ...(state.mode === "authorize" ? { prompt: "consent" } : {}),
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  scope: string;
}

/** Trades the code for tokens. The tokens stay on the server. */
export async function exchangeGiveawaysCode(code: string): Promise<OAuthTokens> {
  const g = env.giveawaysOAuth;
  const res = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: g.clientId,
      client_secret: g.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`token exchange failed (${res.status})`);
  const json = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string };
  if (!json.access_token) throw new Error("token exchange returned no access token");
  return { accessToken: json.access_token, refreshToken: json.refresh_token ?? null, expiresIn: json.expires_in ?? null, scope: json.scope ?? "" };
}

export function avatarOf(id: string, avatar: string | null | undefined) {
  if (avatar) return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128`;
  return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`;
}

export async function fetchGiveawaysUser(accessToken: string) {
  const res = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`users/@me failed (${res.status})`);
  const u = (await res.json()) as { id?: string; username?: string; global_name?: string | null; avatar?: string | null };
  if (!u.id || !/^\d{15,25}$/.test(u.id)) throw new Error("users/@me returned no id");
  return { id: u.id, name: (u.global_name || u.username || "Member").slice(0, 64), avatarUrl: avatarOf(u.id, u.avatar) };
}
