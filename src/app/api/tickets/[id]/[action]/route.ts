import { z } from "zod";
import { ApiError, guard, readJson } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { can, type Action } from "@/lib/permissions";
import { DiscordId } from "@/lib/server/schemas";
import type { TicketAction } from "@/lib/types";

const Params = z.object({ id: z.string().max(64), action: z.enum(["claim", "reply", "close", "transfer"]) });
const Body = z.object({
  body: z.string().trim().min(1).max(2000).optional(),
  reason: z.string().trim().max(500).optional(),
  to: DiscordId.optional(),
});

const PERMISSION: Record<z.infer<typeof Params>["action"], Action> = {
  claim: "tickets.claim",
  reply: "tickets.reply",
  close: "tickets.close",
  transfer: "tickets.transfer",
};

/** POST /api/tickets/:id/(claim|reply|close|transfer) */
export const POST = guard<{ id: string; action: string }>(
  { permission: ["tickets.claim", "tickets.reply", "tickets.close", "tickets.transfer"], mutation: true, rateLimit: "tickets" },
  async ({ req, params, user, require, audit }) => {
    const { id, action } = Params.parse(params);
    const target = `ticket:${id}`;
    require(PERMISSION[action], target);
    const body = await readJson(req, Body);
    const actor = { discordId: user.discordId, name: user.name, avatarUrl: user.avatarUrl };
    const p = getProvider();
    const before = await p.getTicket(id);
    if (!before) throw new ApiError(404, "not_found");

    let op: TicketAction;
    if (action === "reply") {
      if (!body.body) throw new ApiError(400, "invalid_input", "Reply body is required");
      op = { type: "reply", actor, body: body.body };
    } else if (action === "transfer") {
      if (!body.to) throw new ApiError(400, "invalid_input", "Target staff member is required");
      const staff = (await p.getStaff()).find((s) => s.discordId === body.to);
      if (!staff || !can({ roles: staff.roles }, "tickets.view")) throw new ApiError(400, "invalid_input", "Target can't handle tickets");
      op = { type: "transfer", actor, to: { discordId: staff.discordId, name: staff.name, avatarUrl: staff.avatarUrl } };
    } else if (action === "close") {
      op = { type: "close", actor, reason: body.reason };
    } else {
      op = { type: "claim", actor };
    }

    const after = await p.ticketAction(id, op);
    audit({
      action: PERMISSION[action],
      target,
      reason: body.reason ?? null,
      before: { status: before.status, claimedBy: before.claimedBy?.name ?? null },
      after: { status: after.status, claimedBy: after.claimedBy?.name ?? null, ...(action === "reply" ? { replyChars: body.body!.length } : {}) },
    });
    return after;
  },
);
