import { z } from "zod";
import { ApiError, guard, readJson, requireConfirm } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { DiscordId } from "@/lib/server/schemas";

const RoleId = z.string().min(1).max(32).regex(/^[\w-]+$/);
const Body = z.object({
  add: z.array(RoleId).max(25).default([]),
  remove: z.array(RoleId).max(25).default([]),
  confirm: z.boolean().optional(),
});

/**
 * POST /api/members/:id/roles — add / remove Discord roles. Owner and
 * Founders only (`members.roles`, can't be granted by override), confirm
 * required, audited. 501 from the backend until it's built.
 */
export const POST = guard<{ discordId: string }>({ permission: "members.roles", mutation: true, rateLimit: "settings" }, async ({ req, params, user, guild, audit, intent }) => {
  const discordId = DiscordId.parse(params.discordId);
  const body = await readJson(req, Body);
  const add = [...new Set(body.add)];
  const remove = [...new Set(body.remove)].filter((id) => !add.includes(id));
  if (!add.length && !remove.length) throw new ApiError(400, "invalid_input", "Nothing to change");
  requireConfirm(body.confirm, "a role change");

  const p = getProvider();
  const access = await p.getMemberAccess(discordId, guild);
  if (!access) throw new ApiError(404, "not_found");
  // Check against the server's own list: no unknown roles, nothing the bot can't manage.
  const roles = new Map(access.roles.map((r) => [r.id, r]));
  const bad = [...add, ...remove].filter((id) => !roles.get(id)?.assignable);
  if (bad.length) throw new ApiError(400, "not_assignable", "The bot can't manage these roles", { roles: bad });

  const target = `member:${discordId}`;
  const names = (ids: string[]) => ids.map((id) => roles.get(id)?.name ?? id);
  const summary = { guild, add: names(add), remove: names(remove) };
  intent({ action: "members.roles", target, before: { roles: names(access.memberRoleIds) }, after: summary });
  const actor = { discordId: user.discordId, name: user.name, avatarUrl: user.avatarUrl };
  const res = await p.setMemberRoles(discordId, { actor, add, remove }, guild);
  audit({ action: "members.roles", target, before: { roles: names(access.memberRoleIds) }, after: { ...summary, roles: names(res.memberRoleIds) } });
  return res;
});
