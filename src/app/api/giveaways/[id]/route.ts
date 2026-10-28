import { z } from "zod";
import { ApiError } from "@/lib/server/api";
import { memberGuard } from "@/lib/server/member-api";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

const Id = z.coerce.number().int().positive().max(1e9);

/** GET /api/giveaways/:id — public; adds joined/authorized/missing for a signed-in member. */
export const GET = memberGuard<{ id: string }>({}, async ({ params, session }) => {
  const g = await getProvider().giveaways.get(Id.parse(params.id), session?.member.id);
  if (!g) throw new ApiError(404, "not_found");
  return g;
});
