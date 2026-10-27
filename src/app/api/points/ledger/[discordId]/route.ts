import { guard, readQuery } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { DiscordId, ListQuery } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

export const GET = guard<{ discordId: string }>({ permission: "points.view" }, async ({ req, params }) => {
  const id = DiscordId.parse(params.discordId);
  return getProvider().getLedger(id, readQuery(req, ListQuery));
});
