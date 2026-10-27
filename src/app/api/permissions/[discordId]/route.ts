import { z } from "zod";
import { ApiError, guard, readJson, requireConfirm } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { ACTIONS, NON_GRANTABLE } from "@/lib/permissions";
import { DiscordId } from "@/lib/server/schemas";
import { setOverrides } from "@/lib/server/store";

const Body = z.object({
  allow: z.array(z.enum(ACTIONS)).max(ACTIONS.length),
  deny: z.array(z.enum(ACTIONS)).max(ACTIONS.length),
  reason: z.string().trim().max(500).optional(),
  confirm: z.boolean().optional(),
});

/** PUT /api/permissions/:discordId — Owner-only; replaces a staff member's overrides. */
export const PUT = guard<{ discordId: string }>(
  { permission: "permissions.manage", mutation: true, rateLimit: "settings" },
  async ({ req, params, user, audit }) => {
    const discordId = DiscordId.parse(params.discordId);
    const body = await readJson(req, Body);
    requireConfirm(body.confirm, "a permission change");
    const bad = body.allow.filter((a) => NON_GRANTABLE.includes(a));
    if (bad.length) throw new ApiError(400, "not_grantable", `Can't grant: ${bad.join(", ")}`);
    const staff = (await getProvider().getStaff()).find((s) => s.discordId === discordId);
    if (!staff) throw new ApiError(404, "not_found", "Not a staff member");

    const next = { allow: [...new Set(body.allow)], deny: [...new Set(body.deny)] };
    const before = setOverrides(discordId, next, user.discordId);
    audit({ action: "permissions.manage", target: `staff:${discordId}`, reason: body.reason ?? null, before, after: next });
    return { discordId, overrides: next };
  },
);
