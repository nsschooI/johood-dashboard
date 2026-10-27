import { z } from "zod";
import { guard } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { BOT_NAMES } from "@/lib/types";

const Params = z.object({ name: z.enum(BOT_NAMES) });

export const POST = guard<{ name: string }>(
  { permission: "assistants.control", mutation: true, rateLimit: "control" },
  async ({ params, audit, intent }) => {
    const { name } = Params.parse(params);
    const p = getProvider();
    const before = (await p.getAssistants()).find((a) => a.bot === name);
    intent({ action: "assistants.disconnect", target: `assistant:${name}`, before: { room: before?.room?.name ?? null } });
    const after = await p.assistantAction(name, "disconnect");
    audit({ action: "assistants.disconnect", target: `assistant:${name}`, before: { room: before?.room?.name ?? null }, after: { room: null } });
    return after;
  },
);
