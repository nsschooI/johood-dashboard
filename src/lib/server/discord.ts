import "server-only";
/**
 * Discord OAuth2 (authorization code flow).
 * Scopes: `identify` (who you are) + `guilds.members.read` (your roles in the
 * JoHood server). We never store the Discord access token.
 */
import { env } from "./env";

const API = "https://discord.com/api/v10";

export function authorizeUrl(state: string) {
  const d = env.discord;
  const u = new URL("https://discord.com/oauth2/authorize");
  u.searchParams.set("client_id", d.clientId);
  u.searchParams.set("redirect_uri", d.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "identify guilds.members.read");
  u.searchParams.set("state", state);
  u.searchParams.set("prompt", "none");
  return u.toString();
}

export async function exchangeCode(code: string): Promise<string> {
  const d = env.discord;
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: d.clientId,
      client_secret: d.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: d.redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("token exchange returned no access_token");
  return body.access_token;
}

export interface GuildMember {
  discordId: string;
  name: string;
  avatarUrl: string | null;
  roleIds: string[];
}

/** Returns null when the user is not in the guild. */
export async function fetchGuildMember(accessToken: string): Promise<GuildMember | null> {
  const res = await fetch(`${API}/users/@me/guilds/${env.discord.guildId}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`member lookup failed: ${res.status}`);
  const m = (await res.json()) as {
    nick?: string | null;
    avatar?: string | null;
    roles: string[];
    user: { id: string; username: string; global_name?: string | null; avatar?: string | null };
  };
  const u = m.user;
  const avatarUrl = m.avatar
    ? `https://cdn.discordapp.com/guilds/${env.discord.guildId}/users/${u.id}/avatars/${m.avatar}.png?size=96`
    : u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=96`
      : null;
  return { discordId: u.id, name: m.nick || u.global_name || u.username, avatarUrl, roleIds: m.roles ?? [] };
}
