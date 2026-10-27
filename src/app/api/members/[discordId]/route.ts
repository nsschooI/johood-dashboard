import { ApiError, guard } from "@/lib/server/api";
import { getMemberFor } from "@/lib/server/queries";
import { DiscordId } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

export const GET = guard<{ discordId: string }>({ permission: "members.view" }, async ({ params, user }) => {
  const profile = await getMemberFor(user, DiscordId.parse(params.discordId));
  if (!profile) throw new ApiError(404, "not_found");
  return profile;
});
