import { z } from "zod";
import { ApiError, readJson } from "@/lib/server/api";
import { mockGiveaways } from "@/lib/server/giveaways";
import { memberGuard } from "@/lib/server/member-api";

const Body = z.object({ key: z.string().max(32) });

/** MOCK only: pretend the member joined a required server via its invite. 404 in real mode. */
export const POST = memberGuard({ mutation: true }, async ({ req, session }) => {
  const mock = mockGiveaways();
  if (!mock) throw new ApiError(404, "not_found");
  const { key } = await readJson(req, Body);
  mock.mockJoinServer(session!.member.id, key);
  return { ok: true };
});
