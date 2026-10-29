import { z } from "zod";
import { guard, readJson, requireConfirm } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { GiveawayId } from "../../ids";

const Body = z.object({ confirm: z.boolean().optional() });

/**
 * POST /api/giveaways-admin/:id/delete — removes the giveaway, its entries
 * and its Discord message for good. Owner/Founders only, confirm required,
 * audited (with what was deleted).
 */
export const POST = guard<{ id: string }>({ permission: "giveaways.manage", mutation: true, rateLimit: "giveaways" }, async ({ req, params, user, audit, intent }) => {
  const id = GiveawayId.parse(params.id);
  const { confirm } = await readJson(req, Body);
  requireConfirm(confirm, "deleting a giveaway");
  const p = getProvider();
  const g = await p.adminGiveaways.get(id);
  const target = `giveaway:${id}`;
  const before = g ? { prize: g.prize, status: g.status, entries: g.entries, winners: g.winners.map((w) => w.id) } : null;
  intent({ action: "giveaways.delete", target, before });
  const res = await p.adminGiveaways.delete(id, { discordId: user.discordId, name: user.name, avatarUrl: user.avatarUrl });
  audit({ action: "giveaways.delete", target, before });
  return res;
});
