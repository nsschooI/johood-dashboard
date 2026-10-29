import { z } from "zod";
import { ApiError, guard, readJson, requireConfirm } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { GIVEAWAY_LIMITS, IMAGE_TYPES, base64Bytes, validateGiveaway } from "@/lib/giveaways/admin";

export const dynamic = "force-dynamic";

/** GET /api/giveaways-admin — every giveaway, newest first. */
export const GET = guard({ permission: ["giveaways.view", "giveaways.manage"] }, async () => getProvider().adminGiveaways.list());

const Body = z.object({
  prize: z.string().trim().min(1).max(GIVEAWAY_LIMITS.prizeMax * 2),
  minutes: z.number().int().min(GIVEAWAY_LIMITS.minutesMin).max(GIVEAWAY_LIMITS.minutesMax),
  winners: z.number().int().min(GIVEAWAY_LIMITS.winnersMin).max(GIVEAWAY_LIMITS.winnersMax),
  channelId: z.string().min(1).max(32).regex(/^[\w-]+$/),
  servers: z.array(z.enum(["catalog", "main"])).max(2),
  authorize: z.boolean(),
  imageBase64: z.string().regex(/^[A-Za-z0-9+/=\s]+$/, "base64 only").optional(),
  imageType: z.enum(IMAGE_TYPES).optional(),
  confirm: z.boolean().optional(),
});

/** Base64 of a 5 MB file plus the JSON around it. */
const MAX_BODY = Math.ceil((GIVEAWAY_LIMITS.imageMaxBytes * 4) / 3) + 64 * 1024;

/**
 * POST /api/giveaways-admin — start a giveaway (the bot posts the card in
 * Discord). Owner/Founders only, CSRF + rate limit, explicit confirm, and
 * an audit entry that never contains the image data.
 */
export const POST = guard({ permission: "giveaways.manage", mutation: true, rateLimit: "giveaways" }, async ({ req, user, audit, intent }) => {
  const body = await readJson(req, Body, { maxBytes: MAX_BODY });
  const image = body.imageBase64 ? { type: body.imageType ?? "", bytes: base64Bytes(body.imageBase64) } : null;
  const problems = validateGiveaway({ prize: body.prize, minutes: body.minutes, winners: body.winners, channelId: body.channelId, image });
  if (Object.keys(problems).length) throw new ApiError(400, "invalid_input", "The giveaway can't be posted as is", { problems });
  requireConfirm(body.confirm, "posting a giveaway");

  const actor = { discordId: user.discordId, name: user.name, avatarUrl: user.avatarUrl };
  const summary = {
    prize: body.prize,
    minutes: body.minutes,
    winners: body.winners,
    channelId: body.channelId,
    servers: body.servers,
    authorize: body.authorize,
    image: image ? { type: image.type, bytes: image.bytes } : null,
  };
  intent({ action: "giveaways.create", target: `channel:${body.channelId}`, after: summary });
  const { id } = await getProvider().adminGiveaways.create({
    actor,
    prize: body.prize,
    minutes: body.minutes,
    winners: body.winners,
    channelId: body.channelId,
    servers: [...new Set(body.servers)],
    authorize: body.authorize,
    ...(body.imageBase64 ? { imageBase64: body.imageBase64.replace(/\s/g, ""), imageType: body.imageType } : {}),
  });
  audit({ action: "giveaways.create", target: `giveaway:${id}`, after: summary });
  return { id };
});
