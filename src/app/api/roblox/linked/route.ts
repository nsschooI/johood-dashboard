import { guard, readQuery } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { paged } from "../query";

export const dynamic = "force-dynamic";

const Query = paged(["spent", "linked", "points"] as const);

/** GET /api/roblox/linked — members who linked their Roblox account. */
export const GET = guard({ permission: "roblox.view" }, async ({ req, guild }) => {
  const q = readQuery(req, Query);
  return getProvider().getRobloxLinked({ ...q, q: q.q || undefined, guild });
});
