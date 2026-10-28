import { z } from "zod";
import { memberGuard } from "@/lib/server/member-api";
import { getProvider } from "@/lib/provider";

const Id = z.coerce.number().int().positive().max(1e9);

/**
 * POST /api/giveaways/:id/join — the member joins. CSRF + same-origin,
 * 5 joins per minute per member. Answers the provider's status as-is.
 */
export const POST = memberGuard<{ id: string }>(
  { mutation: true, rateLimit: { key: "gw-join", limit: 5, windowMs: 60_000 } },
  async ({ params, session }) => getProvider().giveaways.join(Id.parse(params.id), session!.member.id),
);
