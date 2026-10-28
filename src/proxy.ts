import { NextResponse, type NextRequest } from "next/server";

const LOCALE_COOKIE = "jh_locale";

/**
 * Public giveaway pages only: a first-time visitor whose browser prefers
 * Arabic gets Arabic (RTL) from the very first paint. The choice is stored
 * in the same `jh_locale` cookie the language switch writes, so picking a
 * language later always wins. Staff pages are not matched.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(LOCALE_COOKIE)) return NextResponse.next();
  const lang = (request.headers.get("accept-language") ?? "").trim().toLowerCase();
  if (!lang.startsWith("ar")) return NextResponse.next();
  request.cookies.set(LOCALE_COOKIE, "ar");
  const res = NextResponse.next({ request: { headers: request.headers } });
  res.cookies.set(LOCALE_COOKIE, "ar", { path: "/", maxAge: 31_536_000, sameSite: "lax" });
  return res;
}

export const config = {
  matcher: ["/giveaways", "/giveaways/:path*"],
};
