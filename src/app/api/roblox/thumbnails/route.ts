import { z } from "zod";
import { guard, readQuery } from "@/lib/server/api";
import { resolveThumbnails } from "@/lib/server/roblox";

export const dynamic = "force-dynamic";

const Ids = z
  .string()
  .max(2200)
  .optional()
  .transform((s) => (s ? s.split(",").filter(Boolean).slice(0, 100) : []));
const Query = z.object({ users: Ids, assets: Ids });

/** GET /api/roblox/thumbnails?users=1,2&assets=3 → { users: {id: url|null}, assets: {...} } */
export const GET = guard({}, async ({ req }) => {
  const { users, assets } = readQuery(req, Query);
  const [u, a] = await Promise.all([resolveThumbnails("headshot", users), resolveThumbnails("asset", assets)]);
  return { users: u, assets: a };
});
