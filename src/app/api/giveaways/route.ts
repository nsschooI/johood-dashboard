import { memberGuard } from "@/lib/server/member-api";
import { getProvider } from "@/lib/provider";
import { sortGiveaways } from "@/lib/giveaways/types";

export const dynamic = "force-dynamic";

/** GET /api/giveaways — public list (read-only). */
export const GET = memberGuard({}, async () => sortGiveaways(await getProvider().giveaways.list()));
