/**
 * Round 3: members directory and badges, member access and Discord roles,
 * the Roblox lists with invitations and nudges, leaderboards, and giveaway
 * delete — permissions, the mock, the real endpoint mapping and the routes.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ACTIONS, NON_GRANTABLE, can, canSeePage, permissionsFor, type Action } from "@/lib/permissions";
import { MockProvider } from "@/lib/provider/mock";
import { SERVER_RANKS } from "@/lib/provider/mock-community";
import { RealProvider } from "@/lib/provider/real";
import { openDb, setDbForTests } from "@/lib/server/db";
import { createSession, queryAudit } from "@/lib/server/store";
import { resetRateLimits } from "@/lib/server/rate-limit";
import type { Role } from "@/lib/types";
import { GET as directory } from "@/app/api/members/directory/route";
import { GET as access } from "@/app/api/members/[discordId]/access/route";
import { POST as roles } from "@/app/api/members/[discordId]/roles/route";
import { GET as memberAudit } from "@/app/api/members/[discordId]/audit/route";
import { GET as linked } from "@/app/api/roblox/linked/route";
import { GET as candidates } from "@/app/api/roblox/candidates/route";
import { POST as invite } from "@/app/api/roblox/candidates/[discordId]/invite/route";
import { GET as outside } from "@/app/api/roblox/outside/route";
import { POST as nudge } from "@/app/api/roblox/outside/[robloxId]/nudge/route";
import { GET as leaderboard } from "@/app/api/leaderboard/route";
import { POST as deleteGiveaway } from "@/app/api/giveaways-admin/[id]/delete/route";
import { GET as getGiveaway } from "@/app/api/giveaways-admin/[id]/route";

const actor = { discordId: "900000000000000001", name: "Owner", avatarUrl: null };
const NOW = Date.parse("2026-10-28T12:00:00Z");
const mock = (opts: ConstructorParameters<typeof MockProvider>[0] = {}) => new MockProvider({ seed: 5, autoTick: false, now: NOW, ...opts });

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

describe("round 3 permissions", () => {
  const u = (roles: Role[], allow: Action[] = []) => ({ roles, overrides: { allow, deny: [] } });

  it("roblox.view: Owner, Manager, Head of Support", () => {
    expect((["owner", "manager", "head_support"] as Role[]).every((r) => can(u([r]), "roblox.view"))).toBe(true);
    expect(can(u(["support"]), "roblox.view")).toBe(false);
    expect(can(u(["dev"]), "roblox.view")).toBe(false);
    expect(canSeePage(u(["support"]), "roblox")).toBe(false);
    expect(canSeePage(u(["head_support"]), "roblox")).toBe(true);
  });

  it("members.roles: Owner (and Founders, who map to Owner) only — and never through an override", () => {
    expect(can(u(["owner"]), "members.roles")).toBe(true);
    expect(can(u(["manager"]), "members.roles")).toBe(false);
    expect(NON_GRANTABLE).toContain("members.roles");
    expect(permissionsFor(u(["manager"], ["members.roles"])).has("members.roles")).toBe(false);
  });

  it("leaderboards follow members.view; giveaways.manage covers delete", () => {
    expect(canSeePage(u(["support"]), "leaderboards")).toBe(true);
    expect(canSeePage(u(["dev"]), "leaderboards")).toBe(false);
    expect(ACTIONS).not.toContain("giveaways.delete" as Action);
  });
});

// ---------------------------------------------------------------------------
// Mock provider
// ---------------------------------------------------------------------------

describe("mock: members directory", () => {
  it("pages through every member with a stable total", async () => {
    const p = mock();
    const first = await p.listMembers({ page: 1, pageSize: 25 });
    const second = await p.listMembers({ page: 2, pageSize: 25 });
    expect(first.total).toBeGreaterThan(200);
    expect(first.items).toHaveLength(25);
    expect(second.page).toBe(2);
    const ids = new Set([...first.items, ...second.items].map((m) => m.discordId));
    expect(ids.size).toBe(50);
    // A page past the end clamps to the last page.
    const last = await p.listMembers({ page: 10_000, pageSize: 25 });
    expect(last.page).toBe(Math.ceil(first.total / 25));
  });

  it("sorts by points, newest and name, and searches name or exact ID", async () => {
    const p = mock();
    const pts = (await p.listMembers({ pageSize: 50 })).items.map((m) => m.points ?? 0);
    expect(pts).toEqual([...pts].sort((a, b) => b - a));
    const joined = (await p.listMembers({ sort: "joined", pageSize: 50 })).items.map((m) => m.joinedAt!);
    expect(joined).toEqual([...joined].sort().reverse());
    const names = (await p.listMembers({ sort: "name", pageSize: 30 })).items.map((m) => m.displayName.toLowerCase());
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
    const someone = (await p.listMembers({ pageSize: 1 })).items[0];
    const byId = await p.listMembers({ q: someone.discordId });
    expect(byId.items.map((m) => m.discordId)).toEqual([someone.discordId]);
  });

  it("badges: staff get their staff role, others a server rank or nothing — never 'Newcomer'", async () => {
    const p = mock();
    const all = (await p.listMembers({ pageSize: 100, page: 1 })).items.concat((await p.listMembers({ pageSize: 100, page: 2 })).items, (await p.listMembers({ pageSize: 100, page: 3 })).items);
    const staff = all.find((m) => m.discordId === "mock-manager")!;
    expect(staff.badge).toMatchObject({ kind: "staff", label: "Manager" });
    const ranked = all.filter((m) => m.badge?.kind === "rank");
    expect(ranked.length).toBeGreaterThan(0);
    for (const m of ranked) expect(SERVER_RANKS.map((r) => r.label)).toContain(m.badge!.label);
    expect(all.some((m) => m.badge === null)).toBe(true);
    expect(JSON.stringify(all)).not.toMatch(/newcomer/i);
  });

  it("the profile is Discord-only: linked + robloxId, giveaways, no purchases or Robux", async () => {
    const p = mock();
    const id = (await p.listMembers({ pageSize: 1 })).items[0].discordId;
    const m = (await p.getMember(id))!;
    expect(m).not.toHaveProperty("purchases");
    expect(m).not.toHaveProperty("totalRobux");
    expect(typeof m.linked).toBe("boolean");
    expect(m.robloxId === null).toBe(!m.linked);
    expect(Array.isArray(m.giveaways)).toBe(true);
    // Directory points and profile points agree (one points system).
    const row = (await p.listMembers({ q: id })).items[0];
    expect(row.points).toBe(m.points);
  });
});

describe("mock: member access and Discord roles", () => {
  it("lists every role with what the bot may do and what it grants", async () => {
    const p = mock();
    const a = (await p.getMemberAccess("mock-manager", "catalog"))!;
    expect(a.siteRoles).toEqual(["manager"]);
    const byName = new Map(a.roles.map((r) => [r.name, r]));
    expect(byName.get("Owner")).toMatchObject({ assignable: false, reason: "above_bot" });
    expect(byName.get("Server Booster")).toMatchObject({ assignable: false, reason: "managed" });
    expect(byName.get("@everyone")).toMatchObject({ assignable: false, reason: "everyone" });
    expect(byName.get("Manager")!.permissions).toContain("bots.stop");
    expect(byName.get("VIP")!.permissions).toEqual([]);
    expect(await p.getMemberAccess("nobody", "catalog")).toBeNull();
  });

  it("adds and removes roles; dashboard roles follow; unmanageable roles are refused", async () => {
    const p = mock();
    const before = (await p.getMemberAccess("mock-support", "catalog"))!;
    expect(before.siteRoles).toEqual(["support"]);
    const res = await p.setMemberRoles("mock-support", { actor, add: ["role-head-support"], remove: ["role-support"] }, "catalog");
    expect(res.memberRoleIds).toContain("role-head-support");
    expect(res.memberRoleIds).not.toContain("role-support");
    expect((await p.getMemberAccess("mock-support", "catalog"))!.siteRoles).toEqual(["head_support"]);
    await expect(p.setMemberRoles("mock-support", { actor, add: ["role-owner"], remove: [] }, "catalog")).rejects.toMatchObject({ code: "invalid" });
    await expect(p.setMemberRoles("mock-support", { actor, add: ["nope"], remove: [] }, "catalog")).rejects.toMatchObject({ code: "invalid" });
  });

  it("answers 501 like the backend before it's built", async () => {
    const p = mock({ notImplemented: true });
    await expect(p.setMemberRoles("mock-support", { actor, add: ["role-vip"], remove: [] }, "catalog")).rejects.toMatchObject({ code: "not_implemented", status: 501 });
  });
});

describe("mock: the Roblox world", () => {
  it("linked players: only linked members, with purchase totals, sorted", async () => {
    const p = mock();
    const page = await p.getRobloxLinked({ pageSize: 40 });
    expect(page.total).toBeGreaterThan(0);
    const spent = page.items.map((x) => x.spentRobux);
    expect(spent).toEqual([...spent].sort((a, b) => b - a));
    for (const x of page.items) expect((await p.getMember(x.discordId))!.linked).toBe(true);
    const byPoints = (await p.getRobloxLinked({ sort: "points", pageSize: 20 })).items.map((x) => x.points);
    expect(byPoints).toEqual([...byPoints].sort((a, b) => b - a));
  });

  it("candidates: active, unlinked; filters, ticket-first sort, and invitations", async () => {
    const p = mock();
    const page = await p.getRobloxCandidates({ pageSize: 50 });
    expect(page.total).toBeGreaterThan(0);
    for (const c of page.items) expect((await p.getMember(c.discordId))!.linked).toBe(false);
    const withTicket = await p.getRobloxCandidates({ hasTicket: true, pageSize: 50 });
    expect(withTicket.total).toBeGreaterThan(0);
    expect(withTicket.items.every((c) => c.openTicketId)).toBe(true);
    const first = (await p.getRobloxCandidates({ sort: "ticket", pageSize: 50 })).items;
    const firstNoTicket = first.findIndex((c) => !c.openTicketId);
    expect(first.slice(firstNoTicket).every((c) => !c.openTicketId)).toBe(true);
    const min = 1_000;
    expect((await p.getRobloxCandidates({ minPoints: min, pageSize: 50 })).items.every((c) => c.points >= min)).toBe(true);

    const target = page.items[0];
    const { invitedAt } = await p.inviteCandidate(target.discordId, actor);
    expect((await p.getRobloxCandidates({ q: target.discordId })).items[0].invitedAt).toBe(invitedAt);
    const someoneLinked = (await p.getRobloxLinked({ pageSize: 1 })).items[0];
    await expect(p.inviteCandidate(someoneLinked.discordId, actor)).rejects.toMatchObject({ code: "conflict" });
  });

  it("players outside the server: buyers, sorted by spend or last purchase, nudges stick", async () => {
    const p = mock();
    const page = await p.getRobloxOutside({ pageSize: 50 });
    expect(page.total).toBeGreaterThan(10);
    const last = (await p.getRobloxOutside({ sort: "last", pageSize: 50 })).items.map((x) => x.lastPurchaseAt);
    expect(last).toEqual([...last].sort().reverse());
    const { nudgedAt } = await p.nudgeOutside(page.items[0].robloxId, actor);
    expect((await p.getRobloxOutside({ pageSize: 50 })).items[0].nudgedAt).toBe(nudgedAt);
    await expect(p.nudgeOutside("1", actor)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("mock: leaderboards", () => {
  it("All time is ranked, highest first, with badges; other periods wait for the reset", async () => {
    const p = mock();
    const all = await p.getLeaderboard({ kind: "general", period: "all", limit: 50 });
    expect(all.available).toBe(true);
    expect(all.items).toHaveLength(50);
    expect(all.items.map((i) => i.rank)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    const values = all.items.map((i) => i.value);
    expect(values).toEqual([...values].sort((a, b) => b - a));
    const week = await p.getLeaderboard({ kind: "chat", period: "week" });
    expect(week).toMatchObject({ available: false, items: [], since: null });
  });

  it("after the reset every period has data", async () => {
    const p = mock({ leaderboardSince: "2026-10-01T00:00:00Z" });
    const day = await p.getLeaderboard({ kind: "voice", period: "day", guild: "catalog" });
    expect(day.available).toBe(true);
    expect(day.since).toBe("2026-10-01T00:00:00Z");
    expect(day.items.length).toBeGreaterThan(0);
  });
});

describe("mock: giveaway delete", () => {
  it("removes it for good and tells live listeners", async () => {
    const p = mock();
    const events: unknown[] = [];
    p.subscribe((e) => e.type === "giveaway" && events.push(e.data));
    await p.adminGiveaways.delete(99, actor);
    expect(await p.adminGiveaways.get(99)).toBeNull();
    expect(events).toContainEqual(expect.objectContaining({ id: 99, deleted: true }));
    await expect(p.adminGiveaways.delete(99, actor)).rejects.toMatchObject({ code: "not_found" });
  });
});

// ---------------------------------------------------------------------------
// Real provider mapping
// ---------------------------------------------------------------------------

describe("real provider: round 3 endpoints", () => {
  it("calls the documented paths with the actor in mutation bodies", async () => {
    const calls: { url: string; method: string; body: unknown }[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
      calls.push({ url: String(input).replace("http://x", ""), method: init.method ?? "GET", body: init.body ? JSON.parse(String(init.body)) : undefined });
      return new Response(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 25 }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const p = new RealProvider({ baseUrl: "http://x", token: "t", fetchImpl });
    await p.listMembers({ q: "nour", page: 2, pageSize: 25, sort: "joined", guild: "main" });
    await p.getMemberAccess("123", "catalog");
    await p.setMemberRoles("123", { actor, add: ["r1"], remove: ["r2"] }, "catalog");
    await p.getRobloxLinked({ sort: "spent", page: 1 });
    await p.getRobloxCandidates({ sort: "ticket", hasTicket: true, minPoints: 500 });
    await p.inviteCandidate("123", actor, "main");
    await p.getRobloxOutside({ sort: "last" });
    await p.nudgeOutside("456", actor);
    await p.getLeaderboard({ kind: "voice", period: "week", limit: 50, guild: "main" });
    await p.adminGiveaways.delete(7, actor);
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "GET /members?q=nour&page=2&pageSize=25&sort=joined&guild=main",
      "GET /members/123/access?guild=catalog",
      "POST /members/123/roles?guild=catalog",
      "GET /roblox/linked?page=1&sort=spent",
      "GET /roblox/candidates?sort=ticket&hasTicket=1&minPoints=500",
      "POST /roblox/candidates/123/invite?guild=main",
      "GET /roblox/outside?sort=last",
      "POST /roblox/outside/456/nudge",
      "GET /leaderboard?kind=voice&period=week&limit=50&guild=main",
      "POST /admin/giveaways/7/delete",
    ]);
    expect(calls[2].body).toEqual({ actor, add: ["r1"], remove: ["r2"] });
    expect(calls[5].body).toEqual({ actor });
    expect(calls[7].body).toEqual({ actor });
    expect(calls[9].body).toEqual({ actor });
  });

  it("access answers null on 404 and a 501 stays a 501", async () => {
    let status = 404;
    const fetchImpl = (async () => new Response(JSON.stringify({ error: "x", message: "x" }), { status })) as typeof fetch;
    const p = new RealProvider({ baseUrl: "http://x", token: "t", fetchImpl });
    expect(await p.getMemberAccess("1")).toBeNull();
    status = 501;
    await expect(p.setMemberRoles("1", { actor, add: ["a"], remove: [] })).rejects.toMatchObject({ code: "not_implemented" });
    await expect(p.inviteCandidate("1", actor)).rejects.toMatchObject({ code: "not_implemented" });
    await expect(p.nudgeOutside("1", actor)).rejects.toMatchObject({ code: "not_implemented" });
  });
});

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

const ORIGIN = "http://localhost:3000";
const g = globalThis as unknown as { __johoodProvider: unknown };
g.__johoodProvider = mock();

function login(role: Role) {
  const s = createSession({ discordId: `mock-${role}`, name: `Mock ${role}`, avatarUrl: null, roles: [role] });
  return { cookie: `jh_session=${s.token}`, csrf: s.csrf };
}
function req(method: string, path: string, opts: { auth?: { cookie: string; csrf: string }; body?: unknown; csrf?: string | null } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", origin: ORIGIN };
  if (opts.auth) headers.cookie = opts.auth.cookie;
  const csrf = opts.csrf === undefined ? opts.auth?.csrf : opts.csrf;
  if (csrf) headers["x-csrf-token"] = csrf;
  return new NextRequest(new URL(path, ORIGIN), { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
}
const ctx = <P>(params: P) => ({ params: Promise.resolve(params) });

describe("API: members directory and access", () => {
  beforeEach(() => {
    setDbForTests(openDb(":memory:"));
    resetRateLimits();
  });

  it("directory: members.view; points hidden (and not sortable) without members.view_full", async () => {
    expect((await directory(req("GET", "/api/members/directory"), ctx({}))).status).toBe(401);
    expect((await directory(req("GET", "/api/members/directory", { auth: login("dev") }), ctx({}))).status).toBe(403);
    const support = await (await directory(req("GET", "/api/members/directory?sort=points", { auth: login("support") }), ctx({}))).json();
    expect(support.sort).toBe("joined");
    expect(support.items.every((r: { points: unknown }) => r.points === null)).toBe(true);
    const head = await (await directory(req("GET", "/api/members/directory?pageSize=10", { auth: login("head_support") }), ctx({}))).json();
    expect(head.items).toHaveLength(10);
    expect(typeof head.items[0].points).toBe("number");
    expect(head.total).toBeGreaterThan(200);
  });

  it("access panel data: Owner only, with the dashboard's own overrides", async () => {
    expect((await access(req("GET", "/api/members/mock-manager/access?guild=catalog", { auth: login("manager") }), ctx({ discordId: "mock-manager" }))).status).toBe(403);
    const res = await access(req("GET", "/api/members/mock-manager/access?guild=catalog", { auth: login("owner") }), ctx({ discordId: "mock-manager" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.overrides).toEqual({ allow: [], deny: [] });
    expect(body.siteRoles).toEqual(["manager"]);
    expect((await access(req("GET", "/api/members/nobody/access", { auth: login("owner") }), ctx({ discordId: "nobody" }))).status).toBe(404);
  });

  it("role changes: members.roles, CSRF, confirm, only manageable roles, audited", async () => {
    const path = "/api/members/mock-dev/roles?guild=catalog";
    const p = ctx({ discordId: "mock-dev" });
    const denied = await roles(req("POST", path, { auth: login("manager"), body: { add: ["role-vip"], confirm: true } }), p);
    expect(denied.status).toBe(403);
    expect(queryAudit({ action: "members.roles" }).items[0]).toMatchObject({ ok: false });

    const owner = login("owner");
    expect((await roles(req("POST", path, { auth: owner, body: { add: ["role-vip"], confirm: true }, csrf: null }), p)).status).toBe(403);
    expect((await roles(req("POST", path, { auth: owner, body: { add: ["role-vip"] } }), p)).status).toBe(428);
    const above = await roles(req("POST", path, { auth: owner, body: { add: ["role-owner"], confirm: true } }), p);
    expect(above.status).toBe(400);
    expect((await above.json()).roles).toEqual(["role-owner"]);
    expect((await roles(req("POST", path, { auth: owner, body: { add: [], remove: [], confirm: true } }), p)).status).toBe(400);

    const ok = await roles(req("POST", path, { auth: owner, body: { add: ["role-vip"], confirm: true } }), p);
    expect(ok.status).toBe(200);
    expect((await ok.json()).memberRoleIds).toContain("role-vip");
    const entry = queryAudit({ action: "members.roles" }).items[0];
    expect(entry).toMatchObject({ ok: true, outcome: "ok", target: "member:mock-dev" });
    expect(entry.after).toMatchObject({ guild: "catalog", add: ["VIP"], remove: [] });

    // The member's own trail shows it.
    const trail = await (await memberAudit(req("GET", "/api/members/mock-dev/audit", { auth: owner }), ctx({ discordId: "mock-dev" }))).json();
    expect(trail.items.some((e: { action: string }) => e.action === "members.roles")).toBe(true);
    expect((await memberAudit(req("GET", "/api/members/mock-dev/audit", { auth: login("support") }), ctx({ discordId: "mock-dev" }))).status).toBe(403);
  });

  it("a 501 from the backend is logged as an attempt, never as a change", async () => {
    const saved = g.__johoodProvider;
    g.__johoodProvider = mock({ notImplemented: true });
    try {
      const res = await roles(req("POST", "/api/members/mock-dev/roles?guild=catalog", { auth: login("owner"), body: { add: ["role-vip"], confirm: true } }), ctx({ discordId: "mock-dev" }));
      expect(res.status).toBe(501);
      expect(queryAudit({ action: "members.roles" }).items[0]).toMatchObject({ outcome: "not_connected" });
    } finally {
      g.__johoodProvider = saved;
    }
  });
});

describe("API: Roblox", () => {
  beforeEach(() => {
    setDbForTests(openDb(":memory:"));
    resetRateLimits();
  });

  it("lists need roblox.view", async () => {
    for (const [fn, path] of [
      [linked, "/api/roblox/linked"],
      [candidates, "/api/roblox/candidates?hasTicket=1&minPoints=100"],
      [outside, "/api/roblox/outside?sort=last"],
    ] as const) {
      expect((await fn(req("GET", path, { auth: login("support") }), ctx({}))).status).toBe(403);
      const res = await fn(req("GET", path, { auth: login("head_support") }), ctx({}));
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ page: 1, pageSize: 25 });
    }
  });

  it("invite and nudge: CSRF, confirm, audit; rate limited", async () => {
    const owner = login("owner");
    const cand = (await (await candidates(req("GET", "/api/roblox/candidates", { auth: owner }), ctx({}))).json()).items[0];
    const path = `/api/roblox/candidates/${cand.discordId}/invite`;
    expect((await invite(req("POST", path, { auth: owner, body: { confirm: true }, csrf: null }), ctx({ discordId: cand.discordId }))).status).toBe(403);
    expect((await invite(req("POST", path, { auth: owner, body: {} }), ctx({ discordId: cand.discordId }))).status).toBe(428);
    const ok = await invite(req("POST", path, { auth: owner, body: { confirm: true } }), ctx({ discordId: cand.discordId }));
    expect(ok.status).toBe(200);
    expect(queryAudit({ action: "roblox.invite" }).items[0]).toMatchObject({ ok: true, target: `member:${cand.discordId}` });

    const player = (await (await outside(req("GET", "/api/roblox/outside", { auth: owner }), ctx({}))).json()).items[0];
    const n = await nudge(req("POST", `/api/roblox/outside/${player.robloxId}/nudge`, { auth: owner, body: { confirm: true } }), ctx({ robloxId: player.robloxId }));
    expect(n.status).toBe(200);
    expect(queryAudit({ action: "roblox.nudge" }).items[0]).toMatchObject({ ok: true, target: `roblox:${player.robloxId}` });
    expect((await nudge(req("POST", "/api/roblox/outside/abc/nudge", { auth: owner, body: { confirm: true } }), ctx({ robloxId: "abc" }))).status).toBe(400);

    const codes: number[] = [];
    for (let i = 0; i < 30; i++) codes.push((await nudge(req("POST", `/api/roblox/outside/${player.robloxId}/nudge`, { auth: owner, body: { confirm: true } }), ctx({ robloxId: player.robloxId }))).status);
    expect(codes).toContain(429);
  });
});

describe("API: leaderboard and giveaway delete", () => {
  beforeEach(() => {
    setDbForTests(openDb(":memory:"));
    resetRateLimits();
  });

  it("leaderboard: members.view, validated kind and period", async () => {
    expect((await leaderboard(req("GET", "/api/leaderboard", { auth: login("dev") }), ctx({}))).status).toBe(403);
    const ok = await leaderboard(req("GET", "/api/leaderboard?kind=chat&period=all", { auth: login("support") }), ctx({}));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ kind: "chat", period: "all", available: true });
    const week = await (await leaderboard(req("GET", "/api/leaderboard?period=week", { auth: login("support") }), ctx({}))).json();
    expect(week).toMatchObject({ available: false, items: [] });
    expect((await leaderboard(req("GET", "/api/leaderboard?kind=money", { auth: login("support") }), ctx({}))).status).toBe(400);
  });

  it("delete: giveaways.manage, confirm, audited with what was deleted", async () => {
    expect((await deleteGiveaway(req("POST", "/api/giveaways-admin/98/delete", { auth: login("manager"), body: { confirm: true } }), ctx({ id: "98" }))).status).toBe(403);
    const owner = login("owner");
    expect((await deleteGiveaway(req("POST", "/api/giveaways-admin/98/delete", { auth: owner, body: {} }), ctx({ id: "98" }))).status).toBe(428);
    const ok = await deleteGiveaway(req("POST", "/api/giveaways-admin/98/delete", { auth: owner, body: { confirm: true } }), ctx({ id: "98" }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ deleted: true });
    const entry = queryAudit({ action: "giveaways.delete" }).items[0];
    expect(entry).toMatchObject({ ok: true, target: "giveaway:98" });
    expect(entry.before).toMatchObject({ status: "ended" });
    expect((await getGiveaway(req("GET", "/api/giveaways-admin/98", { auth: owner }), ctx({ id: "98" }))).status).toBe(404);
    expect((await deleteGiveaway(req("POST", "/api/giveaways-admin/98/delete", { auth: owner, body: { confirm: true } }), ctx({ id: "98" }))).status).toBe(404);
  });
});
