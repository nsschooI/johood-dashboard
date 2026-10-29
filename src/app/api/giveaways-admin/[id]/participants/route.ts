import { guard } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { GiveawayId } from "../../ids";

export const dynamic = "force-dynamic";

/** GET /api/giveaways-admin/:id/participants — entries and members blocked at a requirement (max 1000 each). */
export const GET = guard<{ id: string }>({ permission: ["giveaways.view", "giveaways.manage"] }, async ({ params }) => getProvider().adminGiveaways.participants(GiveawayId.parse(params.id)));
