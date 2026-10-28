import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { MockGiveaways, MOCK_MEMBER } from "@/lib/giveaways/mock";
import { safeNext } from "@/lib/giveaways/next";
import { sortGiveaways } from "@/lib/giveaways/types";
import { RealGiveaways } from "@/lib/provider/real";
import { MockProvider } from "@/lib/provider/mock";
import { openDb, setDbForTests } from "@/lib/server/db";
import { createMemberSession, resolveMemberSession } from "@/lib/server/member-session";
import { createSession } from "@/lib/server/store";
import { resetRateLimits } from "@/lib/server/rate-limit";
import { GET as getOne } from "@/app/api/giveaways/[id]/route";
import { POST as join } from "@/app/api/giveaways/[id]/join/route";
import { GET as me } from "@/app/api/giveaways/me/route";
import { POST as revoke } from "@/app/api/giveaways/revoke/route";
import { GET as login } from "@/app/api/giveaways/login/route";
import { GET as authorize } from "@/app/api/giveaways/authorize/route";
import { GET as staffBots } from "@/app/api/bots/route";

const T0 = Date.parse("2026-10-28T12:00:00Z");

describe("MockGiveaways", () => {
  let now = T0;
  const make = () => new MockGiveaways({ now: () => now, start: T0 });
  beforeEach(() => {
    now = T0;
  });

  it("has 3 running and 3 ended giveaways with the required shapes", async () => {
    const list = await make().list();
    expect(list).toHaveLength(6);
    const running = list.filter((g) => g.status === "active");
    const ended = list.filter((g) => g.status === "ended");
    expect(running).toHaveLength(3);
    expect(running.some((g) => g.requirements.servers.length === 1 && g.requirements.authorize)).toBe(true);
    expect(running.some((g) => g.requirements.servers.length === 0 && g.requirements.authorize)).toBe(true);
    expect(running.some((g) => Date.parse(g.endsAt) - T0 < 60_000)).toBe(true);
    expect(ended.map((g) => g.winners.length).sort((a, b) => a - b)).toEqual([0, 1, 10]);
    expect(running.every((g) => g.winners.length === 0)).toBe(true);
  });

  it("reports what a member is missing", async () => {
    const g = (await make().get(1, MOCK_MEMBER.id))!;
    expect(g.authorized).toBe(false);
    expect(g.joined).toBe(false);
    expect(g.missing).toEqual([{ type: "server", key: "catalog", name: "JoHood Catalog" }, { type: "authorize" }]);
    // Without a member there are no personal fields.
    const anon = (await make().get(1))!;
    expect(anon.missing).toBeUndefined();
    expect(anon.joined).toBeUndefined();
  });

  it("applies the join rules: notfound, missing, joined, already, ended", async () => {
    const gw = make();
    expect(await gw.join(999, "m")).toEqual({ status: "notfound" });
    const missing = await gw.join(2, "m");
    expect(missing.status).toBe("missing");
    expect(missing.missing).toEqual([{ type: "authorize" }]);
    gw.mockAuthorize("m");
    const before = (await gw.get(2))!.entries;
    expect(await gw.join(2, "m")).toEqual({ status: "joined" });
    expect((await gw.get(2))!.entries).toBe(before + 1);
    expect((await gw.get(2, "m"))!.joined).toBe(true);
    expect(await gw.join(2, "m")).toEqual({ status: "already" });
    expect(await gw.join(4, "m")).toEqual({ status: "ended" });
  });

  it("needs every required server as well as authorization", async () => {
    const gw = make();
    gw.mockAuthorize("m");
    expect((await gw.join(1, "m")).missing).toEqual([{ type: "server", key: "catalog", name: "JoHood Catalog" }]);
    gw.mockJoinServer("m", "catalog");
    expect((await gw.join(1, "m")).status).toBe("joined");
  });

  it("ends a giveaway when its time passes and draws at most winnersCount winners", async () => {
    const gw = make();
    gw.mockAuthorize("m");
    expect((await gw.join(3, "m")).status).toBe("joined");
    now = T0 + 60_000;
    const g = (await gw.get(3))!;
    expect(g.status).toBe("ended");
    expect(g.winners.length).toBe(Math.min(g.winnersCount, g.entries));
    expect(await gw.join(3, "m")).toEqual({ status: "ended" });
  });

  it("revokes authorization", async () => {
    const gw = make();
    expect(await gw.revoke("m")).toEqual({ removed: false });
    gw.mockAuthorize("m");
    expect(await gw.authorizeState("m")).toEqual({ authorized: true });
    expect(await gw.revoke("m")).toEqual({ removed: true });
    expect(await gw.authorizeState("m")).toEqual({ authorized: false });
  });

  it("sorts running (soonest first) before ended (latest first)", async () => {
    const ids = sortGiveaways(await make().list()).map((g) => g.id);
    expect(ids).toEqual([3, 2, 1, 4, 5, 6]);
  });
});

describe("safeNext", () => {
  it.each([
    ["/giveaways", "/giveaways"],
    ["/giveaways/3", "/giveaways/3"],
    ["/giveaways/me?x=1#y", "/giveaways/me?x=1#y"],
  ])("accepts %s", (input, out) => expect(safeNext(input)).toBe(out));

  it.each([
    "https://evil.example/giveaways",
    "//evil.example/giveaways",
    "/\\evil.example",
    "/overview",
    "/giveawaysevil",
    "/giveaways/../overview",
    "/giveaways/%2e%2e/overview",
    "javascript:alert(1)",
    "/giveaways\n/x",
    "",
    null,
    42,
  ])("rejects %s", (input) => expect(safeNext(input)).toBe("/giveaways"));
});

describe("real giveaways client", () => {
  it("maps calls to the documented endpoints", async () => {
    const calls: [string, string, unknown][] = [];
    const gw = new RealGiveaways(async (method, path, opts) => {
      calls.push([method, path, opts?.body ?? opts?.query]);
      return {} as never;
    });
    await gw.list();
    await gw.get(3, "m1");
    await gw.join(3, "m1");
    await gw.authorizeState("m1");
    await gw.revoke("m1");
    expect(calls).toEqual([
      ["GET", "/giveaways", undefined],
      ["GET", "/giveaways/3", { memberId: "m1" }],
      ["POST", "/giveaways/3/join", { memberId: "m1" }],
      ["GET", "/giveaways/authorize-state", { memberId: "m1" }],
      ["POST", "/giveaways/revoke", { memberId: "m1" }],
    ]);
  });
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const ORIGIN = "http://localhost:3000";
const provider = new MockProvider({ seed: 9, autoTick: false });
(globalThis as unknown as { __johoodProvider: unknown }).__johoodProvider = provider;

function memberReq(method: string, path: string, opts: { cookie?: string; csrf?: string | null; body?: unknown; origin?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", origin: opts.origin ?? ORIGIN };
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.csrf) headers["x-csrf-token"] = opts.csrf;
  return new NextRequest(new URL(path, ORIGIN), { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
}
const ctx = <P,>(params: P) => ({ params: Promise.resolve(params) });

describe("giveaway routes", () => {
  let cookie = "";
  let csrf = "";
  beforeEach(() => {
    setDbForTests(openDb(":memory:"));
    resetRateLimits();
    const s = createMemberSession({ id: `member-${Math.random()}`, name: "Test", avatarUrl: null });
    cookie = `jh_member=${s.token}`;
    csrf = s.csrf;
  });

  it("/me is null when signed out and the member when signed in", async () => {
    expect(await (await me(memberReq("GET", "/api/giveaways/me"), ctx({}))).json()).toBeNull();
    const m = await (await me(memberReq("GET", "/api/giveaways/me", { cookie }), ctx({}))).json();
    expect(m.name).toBe("Test");
  });

  it("detail adds personal fields only for a signed-in member", async () => {
    const anon = await (await getOne(memberReq("GET", "/api/giveaways/2"), ctx({ id: "2" }))).json();
    expect(anon.missing).toBeUndefined();
    const mine = await (await getOne(memberReq("GET", "/api/giveaways/2", { cookie }), ctx({ id: "2" }))).json();
    expect(mine.missing).toEqual([{ type: "authorize" }]);
    expect((await getOne(memberReq("GET", "/api/giveaways/999"), ctx({ id: "999" }))).status).toBe(404);
    expect((await getOne(memberReq("GET", "/api/giveaways/abc"), ctx({ id: "abc" }))).status).toBe(400);
  });

  it("join needs a session, a CSRF token and the same origin", async () => {
    expect((await join(memberReq("POST", "/api/giveaways/2/join", {}), ctx({ id: "2" }))).status).toBe(401);
    expect((await join(memberReq("POST", "/api/giveaways/2/join", { cookie }), ctx({ id: "2" }))).status).toBe(403);
    expect((await join(memberReq("POST", "/api/giveaways/2/join", { cookie, csrf: "nope" }), ctx({ id: "2" }))).status).toBe(403);
    expect((await join(memberReq("POST", "/api/giveaways/2/join", { cookie, csrf, origin: "https://evil.example" }), ctx({ id: "2" }))).status).toBe(403);
    const res = await join(memberReq("POST", "/api/giveaways/2/join", { cookie, csrf }), ctx({ id: "2" }));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("missing");
  });

  it("rate-limits join to 5 per minute per member", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await join(memberReq("POST", "/api/giveaways/2/join", { cookie, csrf }), ctx({ id: "2" }))).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it("revoke needs CSRF and reports what it removed", async () => {
    expect((await revoke(memberReq("POST", "/api/giveaways/revoke", { cookie }), ctx({}))).status).toBe(403);
    const res = await revoke(memberReq("POST", "/api/giveaways/revoke", { cookie, csrf }), ctx({}));
    expect(await res.json()).toEqual({ removed: false });
  });

  it("login and authorize validate `next` and set the member cookie (mock)", async () => {
    const res = await login(memberReq("GET", "/api/giveaways/login?next=https://evil.example/x"));
    expect(res.headers.get("location")).toBe(`${ORIGIN}/giveaways`);
    expect(res.headers.get("set-cookie")).toMatch(/^jh_member=/);
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    const auth = await authorize(memberReq("GET", "/api/giveaways/authorize?next=/giveaways/2"));
    expect(auth.headers.get("location")).toBe(`${ORIGIN}/giveaways/2?authorized=1`);
    expect(auth.headers.get("location")).not.toMatch(/token|code=/);
  });

  it("a member session never opens staff APIs", async () => {
    const res = await staffBots(memberReq("GET", "/api/bots", { cookie }), ctx({}));
    expect(res.status).toBe(401);
    // …and a staff session isn't a member session.
    const staff = createSession({ discordId: "mock-owner", name: "Owner", avatarUrl: null, roles: ["owner"] });
    expect(resolveMemberSession(staff.token)).toBeNull();
  });
});
