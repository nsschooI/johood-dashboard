import { NextResponse } from "next/server";
import { ApiError, guard } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { IMAGE_TYPES } from "@/lib/giveaways/admin";
import { GiveawayId } from "../../ids";

export const dynamic = "force-dynamic";

const ALLOWED = new Set<string>([...IMAGE_TYPES, "image/svg+xml"]);

/**
 * GET /api/giveaways-admin/banner/:id — the giveaway's picture as an image
 * response, so the browser never talks to the bot backend. Admin only.
 * The image bytes are never logged.
 */
export const GET = guard<{ id: string }>({ permission: ["giveaways.view", "giveaways.manage"] }, async ({ params }) => {
  const { contentType, base64 } = await getProvider().adminGiveaways.banner(GiveawayId.parse(params.id));
  if (!ALLOWED.has(contentType)) throw new ApiError(502, "bad_banner");
  const bytes = Buffer.from(base64, "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=300",
      // An SVG placeholder must never run scripts.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
