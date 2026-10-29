import { guard, readQuery } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { paged } from "../query";

export const dynamic = "force-dynamic";

const Query = paged(["spent", "last"] as const);

/** GET /api/roblox/outside — players who bought in the game but aren't in the Discord server. */
export const GET = guard({ permission: "roblox.view" }, async ({ req }) => {
  const q = readQuery(req, Query);
  return getProvider().getRobloxOutside({ ...q, q: q.q || undefined });
});
