import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, readJson } from "@/lib/server/api";
import { env } from "@/lib/server/env";
import { LOCALE_COOKIE } from "@/lib/server/session";
import { setPrefs } from "@/lib/server/store";

const Body = z.object({ locale: z.enum(["en", "ar"]).optional(), muted: z.boolean().optional() }).strict();

/** Remember language + sound preference for the signed-in user. */
export const POST = guard({ mutation: true }, async ({ req, user }) => {
  const patch = await readJson(req, Body);
  const prefs = setPrefs(user.discordId, patch);
  const res = NextResponse.json(prefs);
  if (patch.locale) {
    res.cookies.set(LOCALE_COOKIE, patch.locale, { path: "/", sameSite: "lax", secure: env.secureCookies, maxAge: 365 * 24 * 3600 });
  }
  return res;
});
