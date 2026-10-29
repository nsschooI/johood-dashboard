import { z } from "zod";
import { guard, readJson, requireConfirm } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";

const RobloxId = z.string().regex(/^\d{1,20}$/);
const Body = z.object({ confirm: z.boolean().optional() });

/** POST /api/roblox/outside/:robloxId/nudge — show the in-game "join our server" message. Confirm, rate limit, audit; 501 until built. */
export const POST = guard<{ robloxId: string }>({ permission: "roblox.view", mutation: true, rateLimit: "outreach" }, async ({ req, params, user, audit, intent }) => {
  const robloxId = RobloxId.parse(params.robloxId);
  const { confirm } = await readJson(req, Body);
  requireConfirm(confirm, "nudging a player in game");
  const target = `roblox:${robloxId}`;
  intent({ action: "roblox.nudge", target });
  const res = await getProvider().nudgeOutside(robloxId, { discordId: user.discordId, name: user.name, avatarUrl: user.avatarUrl });
  audit({ action: "roblox.nudge", target, after: res });
  return res;
});
