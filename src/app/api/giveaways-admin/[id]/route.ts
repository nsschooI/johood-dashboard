import { ApiError, guard } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { GiveawayId } from "../ids";

export const dynamic = "force-dynamic";

/** GET /api/giveaways-admin/:id */
export const GET = guard<{ id: string }>({ permission: ["giveaways.view", "giveaways.manage"] }, async ({ params }) => {
  const g = await getProvider().adminGiveaways.get(GiveawayId.parse(params.id));
  if (!g) throw new ApiError(404, "not_found");
  return g;
});
