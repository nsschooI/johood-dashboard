import { z } from "zod";
import { guard, readQuery } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { LEADERBOARD_KINDS, LEADERBOARD_PERIODS } from "@/lib/types";

export const dynamic = "force-dynamic";

const Query = z.object({
  kind: z.enum(LEADERBOARD_KINDS).default("general"),
  period: z.enum(LEADERBOARD_PERIODS).default("all"),
  limit: z.coerce.number().int().min(3).max(100).default(50),
});

/** GET /api/leaderboard — one board for the selected server. */
export const GET = guard({ permission: "members.view" }, async ({ req, guild }) => {
  const q = readQuery(req, Query);
  return getProvider().getLeaderboard({ ...q, guild });
});
