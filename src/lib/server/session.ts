import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DASHBOARD_CONFIG } from "@config/dashboard";
import { env } from "./env";
import { resolveSession, type SessionRecord } from "./store";

/** `__Host-` prefix pins the cookie to this exact origin when served over https. */
export function sessionCookieName() {
  return env.secureCookies ? "__Host-jh_session" : "jh_session";
}

export const LOCALE_COOKIE = "jh_locale";

export function sessionCookieOptions(expiresAt?: number) {
  return {
    httpOnly: true,
    secure: env.secureCookies,
    sameSite: "lax" as const,
    path: "/",
    ...(expiresAt ? { expires: new Date(expiresAt) } : { maxAge: DASHBOARD_CONFIG.sessionTtlHours * 3600 }),
  };
}

/** Current session for server components (memoised per request). */
export const getSession = cache(async (): Promise<SessionRecord | null> => {
  const jar = await cookies();
  return resolveSession(jar.get(sessionCookieName())?.value);
});

/** Use in server components/layouts that require a signed-in staff member. */
export async function requireSession(): Promise<SessionRecord> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
