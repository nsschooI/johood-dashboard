import { z } from "zod";
import { guard, readJson, requireConfirm } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { BOT_NAMES } from "@/lib/types";

const Params = z.object({ name: z.enum(BOT_NAMES), action: z.enum(["restart", "stop", "start"]) });
const Body = z.object({ confirm: z.boolean().optional() });

/** POST /api/bots/:name/(restart|stop|start) */
export const POST = guard<{ name: string; action: string }>(
  { permission: ["bots.restart", "bots.stop"], mutation: true, rateLimit: "control" },
  async ({ req, params, require, audit }) => {
    const { name, action } = Params.parse(params);
    const target = `bot:${name}`;
    require(action === "restart" ? "bots.restart" : "bots.stop", target);
    const { confirm } = await readJson(req, Body);
    if (action === "stop") requireConfirm(confirm, "stopping a bot");

    const p = getProvider();
    const before = (await p.getBots()).find((b) => b.name === name);
    const after = await p.botAction(name, action);
    audit({ action: `bots.${action}`, target, before: { state: before?.state }, after: { state: after.state } });
    return after;
  },
);
