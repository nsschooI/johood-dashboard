import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, errorResponse } from "@/lib/server/api";
import { sessionCookieName, sessionCookieOptions } from "@/lib/server/session";
import { deleteSession, resolveSession, writeAudit } from "@/lib/server/store";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = req.cookies.get(sessionCookieName())?.value;
    const s = resolveSession(token);
    deleteSession(token);
    if (s) writeAudit({ actor: s.user, action: "auth.logout" });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookieName(), "", { ...sessionCookieOptions(), maxAge: 0 });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
