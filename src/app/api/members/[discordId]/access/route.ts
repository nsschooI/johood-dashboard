import { ApiError, guard } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { DiscordId } from "@/lib/server/schemas";
import { getOverrides } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/members/:id/access — the Manage access panel: dashboard roles,
 * overrides (kept by the dashboard), the member's Discord roles and every
 * role of the server with what the bot may do with it.
 */
export const GET = guard<{ discordId: string }>({ permission: ["permissions.manage", "members.roles"] }, async ({ params, guild }) => {
  const discordId = DiscordId.parse(params.discordId);
  const access = await getProvider().getMemberAccess(discordId, guild);
  if (!access) throw new ApiError(404, "not_found");
  return { ...access, overrides: getOverrides(discordId) };
});
