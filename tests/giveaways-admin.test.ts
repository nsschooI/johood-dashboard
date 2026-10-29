/**
 * Giveaways admin: form validation, the mock backend, the real endpoint
 * mapping, and the API routes (permissions, CSRF, confirm, rate limit,
 * audit — never with image data).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GIVEAWAY_LIMITS, base64Bytes, funnel, toCsv, validateGiveaway, type GiveawayDraft } from "@/lib/giveaways/admin";
import { MockAdminGiveaways } from "@/lib/giveaways/admin-mock";
import { MockProvider } from "@/lib/provider/mock";
import { RealAdminGiveaways } from "@/lib/provider/real";
import { openDb, setDbForTests } from "@/lib/server/db";
import { createSession, queryAudit } from "@/lib/server/store";
import { resetRateLimits } from "@/lib/server/rate-limit";
import { canReceive } from "@/lib/visibility";
import type { Role } from "@/lib/types";
import { GET as list, POST as create } from "@/app/api/giveaways-admin/route";
import { POST as end } from "@/app/api/giveaways-admin/[id]/end/route";
import { POST as reroll } from "@/app/api/giveaways-admin/[id]/reroll/route";
import { GET as participants } from "@/app/api/giveaways-admin/[id]/participants/route";
import { GET as banner } from "@/app/api/giveaways-admin/banner/[id]/route";
import { GET as channels } from "@/app/api/giveaways-admin/channels/route";

const actor = { discordId: "900000000000000001", name: "Owner", avatarUrl: null };

describe("form validation", () => {
  const ok: GiveawayDraft = { prize: "10,000 Robux", minutes: 1440, winners: 3, channelId: "c1", image: null };
  it("accepts a complete draft", () => {
    expect(validateGiveaway(ok)).toEqual({});
  });
  it("prize: required, 1 to 120 characters (Arabic counted by character)", () => {
    expect(validateGiveaway({ ...ok, prize: "   " }).prize).toBe("required");
    expect(validateGiveaway({ ...ok, prize: "x".repeat(121) }).prize).toBe("tooLong");
    expect(validateGiveaway({ ...ok, prize: "ج".repeat(120) }).prize).toBeUndefined();
  });
  it("duration: whole minutes from 1 to 90 days", () => {
    expect(validateGiveaway({ ...ok, minutes: 0 }).minutes).toBe("tooShort");
    expect(validateGiveaway({ ...ok, minutes: 1 }).minutes).toBeUndefined();
    expect(validateGiveaway({ ...ok, minutes: GIVEAWAY_LIMITS.minutesMax }).minutes).toBeUndefined();
    expect(validateGiveaway({ ...ok, minutes: GIVEAWAY_LIMITS.minutesMax + 1 }).minutes).toBe("tooLong");
    expect(validateGiveaway({ ...ok, minutes: 1.5 }).minutes).toBe("wholeNumber");
    expect(validateGiveaway({ ...ok, minutes: Number.NaN }).minutes).toBe("wholeNumber");
  });
  it("winners: 1 to 50", () => {
    expect(validateGiveaway({ ...ok, winners: 0 }).winners).toBe("tooShort");
    expect(validateGiveaway({ ...ok, winners: 50 }).winners).toBeUndefined();
    expect(validateGiveaway({ ...ok, winners: 51 }).winners).toBe("tooMany");
  });
  it("channel is required", () => {
    expect(validateGiveaway({ ...ok, channelId: "" }).channelId).toBe("required");
  });
  it("image: png/jpg/webp/gif up to 5 MB", () => {
    expect(validateGiveaway({ ...ok, image: { type: "image/png", bytes: 5 * 1024 * 1024 } }).image).toBeUndefined();
    expect(validateGiveaway({ ...ok, image: { type: "image/gif", bytes: 10 } }).image).toBeUndefined();
    expect(validateGiveaway({ ...ok, image: { type: "image/png", bytes: 5 * 1024 * 1024 + 1 } }).image).toBe("imageSize");
    expect(validateGiveaway({ ...ok, image: { type: "image/svg+xml", bytes: 10 } }).image).toBe("imageType");
  });
  it("counts decoded base64 bytes", () => {
    expect(base64Bytes(Buffer.from("hello world").toString("base64"))).toBe(11);
    expect(base64Bytes(Buffer.alloc(3000).toString("base64"))).toBe(3000);
  });
});

describe("CSV and funnel", () => {
  it("quotes cells, adds a BOM for Excel, and neutralises formulas", () => {
    const csv = toCsv([["Name", "ID"], ['Ri"m', "=HYPERLINK(1)"], ["سارة", 5]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Ri""m"');
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
    expect(csv).toContain('"سارة","5"');
  });
  it("funnel percentages are safe for zero and never exceed attempts", () => {
    expect(funnel({ attempts: 0, blocked: 0, entries: 0 })).toMatchObject({ attempts: 0, joinedPct: 0, blockedPct: 0 });
    const f = funnel({ attempts: 10, blocked: 3, entries: 9 });
    expect(f.attempts).toBe(12);
    expect(f.joinedPct + f.blockedPct).toBeCloseTo(1);
  });
});

describe("mock backend", () => {
  let now = Date.parse("2026-10-28T12:00:00Z");
  const make = () => new MockAdminGiveaways({ now: () => now, seed: 3 });
  beforeEach(() => {
    now = Date.parse("2026-10-28T12:00:00Z");
  });

  it("lists newest first with entries, blocked members and attempts", async () => {
    const m = make();
    const all = await m.list();
    expect(all.map((g) => g.id)).toEqual([...all.map((g) => g.id)].sort((a, b) => b - a));
    const nitro = all.find((g) => g.id === 101)!;
    expect(nitro.status).toBe("active");
    expect(nitro.entries).toBeGreaterThan(0);
    expect(nitro.attempts).toBeGreaterThanOrEqual(nitro.entries + nitro.blocked);
    expect(nitro.bannerUrl).toBeNull();
  });

  it("participants and blocked members match the counts; blocked list the missing requirement", async () => {
    const m = make();
    const g = (await m.get(101))!;
    const p = await m.participants(101);
    expect(p.entries).toHaveLength(g.entries);
    expect(p.blocked).toHaveLength(g.blocked);
    for (const b of p.blocked) {
      expect(b.missing.length).toBeGreaterThan(0);
      for (const x of b.missing) expect(x.type === "authorize" || (x.type === "server" && x.key === "catalog")).toBe(true);
      expect(b.firstAt <= b.lastAt).toBe(true);
    }
  });

  it("creates a giveaway that ends after the chosen minutes, with the chosen requirements", async () => {
    const m = make();
    const { id } = await m.create({ actor, prize: "Gift card", minutes: 90, winners: 2, channelId: "mock-ch-main-giveaways", servers: ["main", "catalog", "main"], authorize: false });
    const g = (await m.get(id))!;
    expect(g.status).toBe("active");
    expect(Date.parse(g.endsAt) - now).toBe(90 * 60_000);
    expect(g.requirements.servers.map((s) => s.key)).toEqual(["main", "catalog"]);
    expect(g.requirements.authorize).toBe(false);
    expect(g.hostId).toBe(actor.discordId);
    expect(g.channelName).toBe("giveaways");
  });

  it("validates like the real API (400)", async () => {
    const m = make();
    const base = { actor, prize: "x", minutes: 60, winners: 1, channelId: "mock-ch-main-giveaways", servers: [] as ("main" | "catalog")[], authorize: true };
    await expect(m.create({ ...base, prize: "" })).rejects.toMatchObject({ code: "invalid" });
    await expect(m.create({ ...base, minutes: 129_601 })).rejects.toMatchObject({ code: "invalid" });
    await expect(m.create({ ...base, winners: 51 })).rejects.toMatchObject({ code: "invalid" });
    await expect(m.create({ ...base, channelId: "nope" })).rejects.toMatchObject({ code: "invalid" });
    await expect(m.create({ ...base, imageBase64: Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64"), imageType: "image/png" })).rejects.toMatchObject({ code: "invalid" });
  });

  it("keeps an uploaded banner, and serves a placeholder otherwise", async () => {
    const m = make();
    const png = Buffer.from([137, 80, 78, 71]).toString("base64");
    const { id } = await m.create({ actor, prize: "With picture", minutes: 60, winners: 1, channelId: "mock-ch-cat-giveaways", servers: [], authorize: true, imageBase64: png, imageType: "image/png" });
    expect(await m.banner(id)).toEqual({ contentType: "image/png", base64: png });
    expect((await m.banner(101)).contentType).toBe("image/svg+xml");
  });

  it("ends a running giveaway and draws winners from the entrants (409 when not running)", async () => {
    const m = make();
    const entrants = new Set((await m.participants(101)).entries.map((p) => p.userId));
    const { winners } = await m.end(101, actor);
    expect(winners).toHaveLength(3);
    for (const w of winners) expect(entrants.has(w.id)).toBe(true);
    expect((await m.get(101))!.status).toBe("ended");
    await expect(m.end(101, actor)).rejects.toMatchObject({ code: "conflict" });
  });

  it("rerolls only ended giveaways, picking new winners when possible", async () => {
    const m = make();
    await expect(m.reroll(101, actor)).rejects.toMatchObject({ code: "conflict" });
    const before = (await m.get(99))!.winners.map((w) => w.id);
    const { winners } = await m.reroll(99, actor);
    expect(winners).toHaveLength(before.length);
    expect(winners.some((w) => !before.includes(w.id))).toBe(true);
    await expect(m.reroll(12345, actor)).rejects.toMatchObject({ code: "not_found" });
  });

  it("ends giveaways on time; with no entries it fails", async () => {
    const m = make();
    const { id } = await m.create({ actor, prize: "Short", minutes: 1, winners: 1, channelId: "mock-ch-main-events", servers: [], authorize: false });
    now += 2 * 60_000;
    const g = (await m.get(id))!;
    expect(g.status).toBe("failed");
    expect(g.winners).toEqual([]);
  });

  it("reports changes for the live stream", async () => {
    const seen: number[] = [];
    const m = new MockAdminGiveaways({ now: () => now, onChange: (g) => seen.push(g.id) });
    await m.end(102, actor);
    expect(seen).toContain(102);
  });

  it("giveaway events only reach staff who may view giveaways", () => {
    const e = { type: "giveaway" as const, data: {} as never };
    expect(canReceive({ roles: ["owner"] }, e)).toBe(true);
    expect(canReceive({ roles: ["manager"] }, e)).toBe(true);
    expect(canReceive({ roles: ["support"] }, e)).toBe(false);
  });
});

describe("real provider mapping", () => {
  it("calls the documented /admin endpoints with the actor", async () => {
    const calls: { method: string; path: string; body?: unknown }[] = [];
    const r = new RealAdminGiveaways(async (method, path, o) => {
      calls.push({ method, path, body: o?.body });
      return (path.endsWith("/end") || path.endsWith("/reroll") ? { winners: [] } : path === "/admin/giveaways" && method === "POST" ? { id: 7 } : []) as never;
    });
    await r.list();
    await r.participants(5);
    await r.channels();
    await r.banner(5);
    await r.create({ actor, prize: "P", minutes: 60, winners: 1, channelId: "c", servers: ["catalog"], authorize: true });
    await r.end(5, actor);
    await r.reroll(5, actor);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "GET /admin/giveaways",
      "GET /admin/giveaways/5/participants",
      "GET /admin/giveaway-channels",
      "GET /admin/giveaways/5/banner",
      "POST /admin/giveaways",
      "POST /admin/giveaways/5/end",
      "POST /admin/giveaways/5/reroll",
    ]);
    expect(calls[4].body).toMatchObject({ actor, prize: "P", servers: ["catalog"] });
    expect(calls[5].body).toEqual({ actor });
  });

  it("get() turns a 404 into null", async () => {
    const r = new RealAdminGiveaways(async () => {
      const { ProviderError } = await import("@/lib/provider/errors");
      throw new ProviderError("not_found", "nope");
    });
    expect(await r.get(1)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

const ORIGIN = "http://localhost:3000";
const provider = new MockProvider({ seed: 5, autoTick: false });
(globalThis as unknown as { __johoodProvider: unknown }).__johoodProvider = provider;

function login(role: Role) {
  const s = createSession({ discordId: `mock-${role}`, name: `Mock ${role}`, avatarUrl: null, roles: [role] });
  return { cookie: `jh_session=${s.token}`, csrf: s.csrf };
}

function req(method: string, path: string, opts: { auth?: { cookie: string; csrf: string }; body?: unknown; csrf?: string | null; origin?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", origin: opts.origin ?? ORIGIN };
  if (opts.auth) headers.cookie = opts.auth.cookie;
  const csrf = opts.csrf === undefined ? opts.auth?.csrf : opts.csrf;
  if (csrf) headers["x-csrf-token"] = csrf;
  return new NextRequest(new URL(path, ORIGIN), { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
}
const ctx = <P>(params: P) => ({ params: Promise.resolve(params) });
const body = { prize: "Route test prize", minutes: 120, winners: 2, channelId: "mock-ch-main-giveaways", servers: ["catalog"], authorize: true, confirm: true };

describe("API: /api/giveaways-admin", () => {
  beforeEach(() => {
    setDbForTests(openDb(":memory:"));
    resetRateLimits();
  });

  it("reading needs giveaways.view (owner, manager) — not support or dev", async () => {
    expect((await list(req("GET", "/api/giveaways-admin"), ctx({}))).status).toBe(401);
    expect((await list(req("GET", "/api/giveaways-admin", { auth: login("support") }), ctx({}))).status).toBe(403);
    expect((await list(req("GET", "/api/giveaways-admin", { auth: login("dev") }), ctx({}))).status).toBe(403);
    expect((await list(req("GET", "/api/giveaways-admin", { auth: login("manager") }), ctx({}))).status).toBe(200);
    expect((await channels(req("GET", "/api/giveaways-admin/channels", { auth: login("manager") }), ctx({}))).status).toBe(200);
    const p = await participants(req("GET", "/api/giveaways-admin/101/participants", { auth: login("owner") }), ctx({ id: "101" }));
    expect(p.status).toBe(200);
    expect(await p.json()).toHaveProperty("blocked");
  });

  it("only giveaways.manage may create; refusals are audited", async () => {
    const res = await create(req("POST", "/api/giveaways-admin", { auth: login("manager"), body }), ctx({}));
    expect(res.status).toBe(403);
    const denied = queryAudit({ action: "giveaways.manage" }).items;
    expect(denied).toHaveLength(1);
    expect(denied[0].ok).toBe(false);
  });

  it("rejects missing CSRF, another origin, and asks for confirmation", async () => {
    const auth = login("owner");
    expect((await create(req("POST", "/api/giveaways-admin", { auth, body, csrf: null }), ctx({}))).status).toBe(403);
    expect((await create(req("POST", "/api/giveaways-admin", { auth, body, origin: "https://evil.example" }), ctx({}))).status).toBe(403);
    expect((await create(req("POST", "/api/giveaways-admin", { auth, body: { ...body, confirm: false } }), ctx({}))).status).toBe(428);
  });

  it("validates the form server-side (400 with the problem fields)", async () => {
    const auth = login("owner");
    const bad = await create(req("POST", "/api/giveaways-admin", { auth, body: { ...body, prize: "x".repeat(121) } }), ctx({}));
    expect(bad.status).toBe(400);
    expect((await bad.json()).problems).toEqual({ prize: "tooLong" });
    const big = Buffer.alloc(5 * 1024 * 1024 + 10).toString("base64");
    const tooBig = await create(req("POST", "/api/giveaways-admin", { auth, body: { ...body, imageBase64: big, imageType: "image/png" } }), ctx({}));
    expect(tooBig.status).toBe(400);
    expect((await tooBig.json()).problems).toEqual({ image: "imageSize" });
    const wrongType = await create(req("POST", "/api/giveaways-admin", { auth, body: { ...body, imageBase64: "AAAA", imageType: "image/svg+xml" } }), ctx({}));
    expect(wrongType.status).toBe(400);
  });

  it("creates, audits without the image data, and the banner route serves the picture", async () => {
    const auth = login("owner");
    const png = Buffer.from("not-really-a-png").toString("base64");
    const res = await create(req("POST", "/api/giveaways-admin", { auth, body: { ...body, imageBase64: png, imageType: "image/png" } }), ctx({}));
    expect(res.status).toBe(200);
    const { id } = await res.json();
    const entry = queryAudit({ action: "giveaways.create" }).items[0];
    expect(entry.ok).toBe(true);
    expect(entry.target).toBe(`giveaway:${id}`);
    expect(JSON.stringify(entry)).not.toContain(png);
    expect(entry.after).toMatchObject({ prize: body.prize, image: { type: "image/png", bytes: 16 } });

    const img = await banner(req("GET", `/api/giveaways-admin/banner/${id}`, { auth }), ctx({ id: String(id) }));
    expect(img.status).toBe(200);
    expect(img.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await img.arrayBuffer()).toString()).toBe("not-really-a-png");
    expect((await banner(req("GET", `/api/giveaways-admin/banner/${id}`, { auth: login("support") }), ctx({ id: String(id) }))).status).toBe(403);
  });

  it("end and reroll: confirm required, 409 on the wrong state, audited", async () => {
    const auth = login("owner");
    const { id } = await (await create(req("POST", "/api/giveaways-admin", { auth, body }), ctx({}))).json();
    expect((await end(req("POST", `/api/giveaways-admin/${id}/end`, { auth, body: {} }), ctx({ id: String(id) }))).status).toBe(428);
    expect((await reroll(req("POST", `/api/giveaways-admin/${id}/reroll`, { auth, body: { confirm: true } }), ctx({ id: String(id) }))).status).toBe(409);
    expect((await end(req("POST", "/api/giveaways-admin/99/end", { auth: login("manager"), body: { confirm: true } }), ctx({ id: "99" }))).status).toBe(403);

    const ended = await end(req("POST", `/api/giveaways-admin/101/end`, { auth, body: { confirm: true } }), ctx({ id: "101" }));
    expect(ended.status).toBe(200);
    expect((await ended.json()).winners.length).toBeGreaterThan(0);
    const rolled = await reroll(req("POST", `/api/giveaways-admin/101/reroll`, { auth, body: { confirm: true } }), ctx({ id: "101" }));
    expect(rolled.status).toBe(200);
    expect(queryAudit({ action: "giveaways.end" }).items[0]).toMatchObject({ ok: true, target: "giveaway:101" });
    expect(queryAudit({ action: "giveaways.reroll" }).items[0]).toMatchObject({ ok: true, target: "giveaway:101" });
  });

  it("rate limits starting/ending giveaways (10 per minute)", async () => {
    const auth = login("owner");
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await create(req("POST", "/api/giveaways-admin", { auth, body: { ...body, prize: `Prize ${i}` } }), ctx({}))).status);
    expect(codes.slice(0, 10).every((c) => c === 200)).toBe(true);
    expect(codes[10]).toBe(429);
  });

  it("a 501 from the backend is logged as an attempt, never as a change", async () => {
    const spy = vi.spyOn(provider.adminGiveaways, "create").mockRejectedValueOnce(Object.assign(new Error("nope"), { name: "ProviderError", code: "not_implemented", status: 501 }));
    const res = await create(req("POST", "/api/giveaways-admin", { auth: login("owner"), body }), ctx({}));
    expect(res.status).toBe(501);
    expect(queryAudit({ action: "giveaways.create" }).items[0]).toMatchObject({ outcome: "not_connected" });
    spy.mockRestore();
  });
});
