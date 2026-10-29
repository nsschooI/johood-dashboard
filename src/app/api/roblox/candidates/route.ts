import { z } from "zod";
import { guard, readQuery } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { paged } from "../query";

export const dynamic = "force-dynamic";

const Query = paged(["points", "ticket"] as const).extend({
  hasTicket: z.enum(["0", "1"]).optional(),
  minPoints: z.coerce.number().int().min(0).max(10_000_000).optional(),
});

/** GET /api/roblox/candidates — active members who haven't linked yet. */
export const GET = guard({ permission: "roblox.view" }, async ({ req, guild }) => {
  const { hasTicket, ...q } = readQuery(req, Query);
  return getProvider().getRobloxCandidates({ ...q, q: q.q || undefined, hasTicket: hasTicket === "1", guild });
});
