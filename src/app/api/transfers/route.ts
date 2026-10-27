import { z } from "zod";
import { guard, readQuery } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { ListQuery } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

const Query = ListQuery.extend({ status: z.enum(["pending", "processing", "completed", "failed", "refunded"]).optional() });

export const GET = guard({ permission: "transfers.view" }, async ({ req }) => getProvider().getTransfers(readQuery(req, Query)));
