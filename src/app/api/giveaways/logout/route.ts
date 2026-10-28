import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, errorResponse } from "@/lib/server/api";
import { MEMBER_COOKIE, clearMemberCookie, deleteMemberSession, resolveMemberSession } from "@/lib/server/member-session";
import { ApiError } from "@/lib/server/api";
import crypto from "node:crypto";

/** POST /api/giveaways/logout — ends the member session (CSRF-checked). */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = req.cookies.get(MEMBER_COOKIE)?.value;
    const session = resolveMemberSession(token);
    if (session) {
      const sent = Buffer.from(req.headers.get("x-csrf-token") ?? "");
      const want = Buffer.from(session.csrf);
      if (sent.length !== want.length || !crypto.timingSafeEqual(sent, want)) throw new ApiError(403, "csrf_failed");
    }
    deleteMemberSession(token);
    const res = NextResponse.json({ ok: true });
    clearMemberCookie(res);
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
