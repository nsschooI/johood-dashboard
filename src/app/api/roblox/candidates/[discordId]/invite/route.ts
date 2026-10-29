import { z } from "zod";
import { guard, readJson, requireConfirm } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { DiscordId } from "@/lib/server/schemas";

const Body = z.object({ confirm: z.boolean().optional() });

/** POST /api/roblox/candidates/:id/invite — the bot DMs a link invitation. Confirm, rate limit, audit; 501 until built. */
export const POST = guard<{ discordId: string }>({ permission: "roblox.view", mutation: true, rateLimit: "outreach" }, async ({ req, params, user, guild, audit, intent }) => {
  const discordId = DiscordId.parse(params.discordId);
  const { confirm } = await readJson(req, Body);
  requireConfirm(confirm, "sending a link invitation");
  const target = `member:${discordId}`;
  intent({ action: "roblox.invite", target });
  const res = await getProvider().inviteCandidate(discordId, { discordId: user.discordId, name: user.name, avatarUrl: user.avatarUrl }, guild);
  audit({ action: "roblox.invite", target, after: res });
  return res;
});
