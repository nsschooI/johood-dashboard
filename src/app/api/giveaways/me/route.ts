import { memberGuard } from "@/lib/server/member-api";

export const dynamic = "force-dynamic";

/** GET /api/giveaways/me → { id, name, avatarUrl } | null */
export const GET = memberGuard({}, async ({ session }) => session?.member ?? null);
