import { z } from "zod";
import { DASHBOARD_CONFIG } from "@config/dashboard";
import { ApiError, guard, readJson, requireConfirm } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { maxPointAdjust, pointAdjustNeedsConfirm } from "@/lib/permissions";
import { DiscordId } from "@/lib/server/schemas";

const Body = z.object({
  discordId: DiscordId,
  delta: z.number().int().refine((n) => n !== 0, "Must not be zero").refine((n) => Math.abs(n) <= 1_000_000, "Too large"),
  reason: z.string().trim().min(DASHBOARD_CONFIG.minReasonLength, `A reason of at least ${DASHBOARD_CONFIG.minReasonLength} characters is required`).max(500),
  confirm: z.boolean().optional(),
});

/**
 * POST /api/points/adjust — manual credit/debit.
 * Reason required; capped for limited roles; confirm above the threshold.
 */
export const POST = guard(
  { permission: ["points.adjust", "points.adjust_limited"], mutation: true, rateLimit: "points" },
  async ({ req, user, audit }) => {
    const body = await readJson(req, Body);
    const target = `member:${body.discordId}`;
    const max = maxPointAdjust(user);
    if (Math.abs(body.delta) > max) {
      audit({ action: "points.adjust", target, reason: body.reason, after: { delta: body.delta }, ok: false });
      throw new ApiError(403, "over_limit", `Your limit is ${max} points per adjustment`, { limit: max });
    }
    if (pointAdjustNeedsConfirm(body.delta)) requireConfirm(body.confirm, "a large adjustment");

    const p = getProvider();
    const member = await p.getMember(body.discordId);
    if (!member) throw new ApiError(404, "not_found", "Unknown member");
    const actor = { discordId: user.discordId, name: user.name, avatarUrl: user.avatarUrl };
    const entry = await p.adjustPoints({ discordId: body.discordId, delta: body.delta, reason: body.reason, actor });
    audit({
      action: "points.adjust",
      target,
      reason: body.reason,
      before: { balance: member.points },
      after: { balance: entry.balanceAfter, delta: body.delta },
    });
    return entry;
  },
);
