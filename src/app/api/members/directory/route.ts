import { z } from "zod";
import { guard, readQuery } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { can } from "@/lib/permissions";
import { redactMemberRow } from "@/lib/visibility";

export const dynamic = "force-dynamic";

const Query = z.object({
  q: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
  sort: z.enum(["points", "joined", "name"]).default("points"),
});

/** GET /api/members/directory — every member of the selected server, a page at a time. */
export const GET = guard({ permission: "members.view" }, async ({ req, user, guild }) => {
  const q = readQuery(req, Query);
  // Sorting by points would reveal the order of numbers this viewer may not see.
  const sort = q.sort === "points" && !can(user, "members.view_full") ? "joined" : q.sort;
  const page = await getProvider().listMembers({ ...q, q: q.q || undefined, sort, guild });
  return { ...page, sort, items: page.items.map((r) => redactMemberRow(user, r)) };
});
