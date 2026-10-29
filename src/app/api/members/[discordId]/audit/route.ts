import { z } from "zod";
import { guard, readQuery } from "@/lib/server/api";
import { DiscordId } from "@/lib/server/schemas";
import { queryAudit } from "@/lib/server/store";

export const dynamic = "force-dynamic";

const Query = z.object({ beforeId: z.coerce.number().int().positive().optional() });

/** GET /api/members/:id/audit — audit entries about one member (roles, permissions, points, invitations). */
export const GET = guard<{ discordId: string }>({ permission: "audit.view" }, async ({ req, params }) => {
  const discordId = DiscordId.parse(params.discordId);
  const { beforeId } = readQuery(req, Query);
  return queryAudit({ targets: [`member:${discordId}`, `staff:${discordId}`], beforeId, limit: 30 });
});
