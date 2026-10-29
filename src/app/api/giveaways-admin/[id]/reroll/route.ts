import { z } from "zod";
import { guard, readJson, requireConfirm } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { GiveawayId } from "../../ids";

const Body = z.object({ confirm: z.boolean().optional() });

/** POST /api/giveaways-admin/:id/reroll — Owner/Founders only, confirm required, audited. */
export const POST = guard<{ id: string }>({ permission: "giveaways.manage", mutation: true, rateLimit: "giveaways" }, async ({ req, params, user, audit, intent }) => {
  const id = GiveawayId.parse(params.id);
  const { confirm } = await readJson(req, Body);
  requireConfirm(confirm, "rerolling the winners");
  const p = getProvider();
  const before = await p.adminGiveaways.get(id);
  const target = `giveaway:${id}`;
  intent({ action: "giveaways.reroll", target, before: before ? { status: before.status, winners: before.winners.map((w) => w.id) } : null });
  const res = await p.adminGiveaways.reroll(id, { discordId: user.discordId, name: user.name, avatarUrl: user.avatarUrl });
  audit({ action: "giveaways.reroll", target, before: before ? { status: before.status, winners: before.winners.map((w) => w.id) } : null, after: { winners: res.winners.map((w) => w.id) } });
  return res;
});
