import { z } from "zod";
import { guard, readQuery } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { BOT_NAMES, type BotName } from "@/lib/types";

export const dynamic = "force-dynamic";

const Params = z.object({ name: z.enum(BOT_NAMES) });
const Query = z.object({
  limit: z.coerce.number().int().min(1).max(400).optional(),
  level: z.enum(["debug", "info", "warn", "error"]).optional(),
});

export const GET = guard<{ name: string }>({ permission: "bots.logs" }, async ({ req, params }) => {
  const { name } = Params.parse(params);
  const q = readQuery(req, Query);
  return getProvider().getBotLogs(name as BotName, q);
});
