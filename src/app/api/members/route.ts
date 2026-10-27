import { z } from "zod";
import { guard, readQuery } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

const Query = z.object({ q: z.string().max(64).default(""), limit: z.coerce.number().int().min(1).max(50).optional() });

export const GET = guard({ permission: "members.view" }, async ({ req, guild }) => {
  const { q, limit } = readQuery(req, Query);
  return getProvider().searchMembers(q, limit, guild);
});
