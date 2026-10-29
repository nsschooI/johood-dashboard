import { guard } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

/** GET /api/giveaways-admin/channels — text channels the bot can post in, both servers. */
export const GET = guard({ permission: ["giveaways.view", "giveaways.manage"] }, async () => getProvider().adminGiveaways.channels());
