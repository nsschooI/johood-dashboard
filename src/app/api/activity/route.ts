import { z } from "zod";
import { guard, readQuery } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { canSeeActivity } from "@/lib/visibility";

export const dynamic = "force-dynamic";

const Query = z.object({ limit: z.coerce.number().int().min(1).max(200).optional() });

export const GET = guard({ permission: "activity.view" }, async ({ req, user }) => {
  const { limit = 50 } = readQuery(req, Query);
  const items = await getProvider().getActivity(200);
  return items.filter((a) => canSeeActivity(user, a)).slice(0, limit);
});
