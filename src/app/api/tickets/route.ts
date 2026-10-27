import { z } from "zod";
import { guard, readQuery } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { ListQuery } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

const Query = ListQuery.extend({
  status: z.enum(["open", "claimed", "closed", "active"]).optional(),
  guild: z.enum(["main", "catalog"]).optional(),
});

export const GET = guard({ permission: "tickets.view" }, async ({ req }) => getProvider().getTickets(readQuery(req, Query)));
