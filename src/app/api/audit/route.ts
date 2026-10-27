import { z } from "zod";
import { guard, readQuery } from "@/lib/server/api";
import { auditFacets, queryAudit } from "@/lib/server/store";

export const dynamic = "force-dynamic";

const Query = z.object({
  actorId: z.string().max(32).optional(),
  action: z.string().max(64).optional(),
  q: z.string().max(64).optional(),
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  beforeId: z.coerce.number().int().positive().optional(),
  outcome: z.enum(["ok", "denied", "not_connected", "failed"]).optional(),
  facets: z.literal("1").optional(),
});

export const GET = guard({ permission: "audit.view" }, async ({ req }) => {
  const { facets, ...q } = readQuery(req, Query);
  const page = queryAudit(q);
  return facets ? { ...page, facets: auditFacets() } : page;
});
