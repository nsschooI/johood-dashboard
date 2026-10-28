import { memberGuard } from "@/lib/server/member-api";
import { getProvider } from "@/lib/provider";

/** POST /api/giveaways/revoke — remove our app's authorization for this member. */
export const POST = memberGuard({ mutation: true, rateLimit: { key: "gw-revoke", limit: 5, windowMs: 60_000 } }, async ({ session }) =>
  getProvider().giveaways.revoke(session!.member.id),
);
