import { z } from "zod";
import { ApiError, guard } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

export const GET = guard<{ id: string }>({ permission: "tickets.view" }, async ({ params }) => {
  const t = await getProvider().getTicket(z.string().max(64).parse(params.id));
  if (!t) throw new ApiError(404, "not_found");
  return t;
});
