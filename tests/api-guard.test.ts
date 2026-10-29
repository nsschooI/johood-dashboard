/**
 * Server-side enforcement: call real route handlers with real requests and
 * check that permissions, CSRF, confirm steps, limits and auditing hold no
 * matter what the UI does.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { openDb, setDbForTests } from "@/lib/server/db";
import { createSession, queryAudit } from "@/lib/server/store";
import { resetRateLimits } from "@/lib/server/rate-limit";
import { MockProvider } from "@/lib/provider/mock";
import type { Role } from "@/lib/types";
import { POST as adjust } from "@/app/api/points/adjust/route";
import { POST as botAction } from "@/app/api/bots/[name]/[action]/route";
import { PUT as setPermissions } from "@/app/api/permissions/[discordId]/route";
import { PATCH as patchProtection } from "@/app/api/protection/route";
import { GET as getMember } from "@/app/api/members/[discordId]/route";
import { GET as getBots } from "@/app/api/bots/route";

const ORIGIN = "http://localhost:3000";
const provider = new MockProvider({ seed: 5, autoTick: false });
(globalThis as unknown as { __johoodProvider: unknown }).__johoodProvider = provider;

let memberId = "";

beforeEach(async () => {
  setDbForTests(openDb(":memory:"));
  resetRateLimits();
  memberId = (await provider.searchMembers("", 1))[0].discordId;
});

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

describe("guard basics", () => {
  it("401 without a session", async () => {
    const res = await getBots(req("GET", "/api/bots"), ctx({}));
    expect(res.status).toBe(401);
  });

  it("403 when the role lacks the permission (support → bots)", async () => {
    const res = await getBots(req("GET", "/api/bots", { auth: login("support") }), ctx({}));
    expect(res.status).toBe(403);
  });

  it("rejects mutations without the CSRF token or from another origin", async () => {
    const auth = login("manager");
    const body = { discordId: memberId, delta: 10, reason: "Testing csrf" };
    expect((await adjust(req("POST", "/api/points/adjust", { auth, body, csrf: null }), ctx({}))).status).toBe(403);
    expect((await adjust(req("POST", "/api/points/adjust", { auth, body, csrf: "wrong" }), ctx({}))).status).toBe(403);
    expect((await adjust(req("POST", "/api/points/adjust", { auth, body, origin: "https://evil.example" }), ctx({}))).status).toBe(403);
  });
});

describe("POST /api/points/adjust", () => {
  it("dev and support are refused, and the attempt is audited", async () => {
    for (const role of ["dev", "support"] as Role[]) {
      const res = await adjust(req("POST", "/api/points/adjust", { auth: login(role), body: { discordId: memberId, delta: 10, reason: "should fail" } }), ctx({}));
      expect(res.status).toBe(403);
    }
    const denied = queryAudit({ action: "points.adjust" }).items;
    expect(denied).toHaveLength(2);
    expect(denied.every((e) => !e.ok)).toBe(true);
  });

  it("requires a written reason", async () => {
    const res = await adjust(req("POST", "/api/points/adjust", { auth: login("manager"), body: { discordId: memberId, delta: 10, reason: "  " } }), ctx({}));
    expect(res.status).toBe(400);
  });

  it("caps head of support at the limited amount", async () => {
    const res = await adjust(req("POST", "/api/points/adjust", { auth: login("head_support"), body: { discordId: memberId, delta: 501, reason: "Too generous" } }), ctx({}));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("over_limit");
    const ok = await adjust(req("POST", "/api/points/adjust", { auth: login("head_support"), body: { discordId: memberId, delta: 500, reason: "Within limit" } }), ctx({}));
    expect(ok.status).toBe(200);
  });

  it("needs a confirm step above the threshold, then audits before/after", async () => {
    const auth = login("manager");
    const body = { discordId: memberId, delta: 1500, reason: "Big event prize" };
    const first = await adjust(req("POST", "/api/points/adjust", { auth, body }), ctx({}));
    expect(first.status).toBe(428);
    const second = await adjust(req("POST", "/api/points/adjust", { auth, body: { ...body, confirm: true } }), ctx({}));
    expect(second.status).toBe(200);
    const entry = queryAudit({ action: "points.adjust" }).items[0];
    expect(entry.ok).toBe(true);
    expect(entry.reason).toBe("Big event prize");
    expect(entry.actorId).toBe("mock-manager");
    const before = (entry.before as { balance: number }).balance;
    expect((entry.after as { balance: number }).balance).toBe(before + 1500);
  });
});

describe("bot control", () => {
  it("dev can restart but not stop", async () => {
    const auth = login("dev");
    const restart = await botAction(req("POST", "/api/bots/ops/restart", { auth, body: {} }), ctx({ name: "ops", action: "restart" }));
    expect(restart.status).toBe(200);
    const stop = await botAction(req("POST", "/api/bots/welcome/stop", { auth, body: { confirm: true } }), ctx({ name: "welcome", action: "stop" }));
    expect(stop.status).toBe(403);
  });

  it("stopping needs confirm", async () => {
    const auth = login("manager");
    const res = await botAction(req("POST", "/api/bots/network/stop", { auth, body: {} }), ctx({ name: "network", action: "stop" }));
    expect(res.status).toBe(428);
    const ok = await botAction(req("POST", "/api/bots/network/stop", { auth, body: { confirm: true } }), ctx({ name: "network", action: "stop" }));
    expect(ok.status).toBe(200);
    expect(queryAudit({ action: "bots.stop" }).items[0].after).toEqual({ state: "stopped" });
  });

  it("rejects unknown bots", async () => {
    const res = await botAction(req("POST", "/api/bots/nope/restart", { auth: login("owner"), body: {} }), ctx({ name: "nope", action: "restart" }));
    expect(res.status).toBe(400);
  });

  it("rate-limits control actions", async () => {
    const auth = login("owner");
    let last = 0;
    for (let i = 0; i < 12; i++) {
      const res = await botAction(req("POST", "/api/bots/system/restart", { auth, body: {} }), ctx({ name: "system", action: "restart" }));
      last = res.status;
      provider.tick(Date.now() + 5000);
    }
    expect(last).toBe(429);
  });
});

describe("permissions management", () => {
  const staffId = "900000000000000904";

  it("only an owner can change overrides, and it needs confirm", async () => {
    const body = { allow: ["tickets.close"], deny: [], confirm: true };
    expect((await setPermissions(req("PUT", `/api/permissions/${staffId}`, { auth: login("manager"), body }), ctx({ discordId: staffId }))).status).toBe(403);
    expect((await setPermissions(req("PUT", `/api/permissions/${staffId}`, { auth: login("owner"), body: { ...body, confirm: undefined } }), ctx({ discordId: staffId }))).status).toBe(428);
    expect((await setPermissions(req("PUT", `/api/permissions/${staffId}`, { auth: login("owner"), body }), ctx({ discordId: staffId }))).status).toBe(200);
  });

  it("refuses to grant permissions.manage", async () => {
    const res = await setPermissions(req("PUT", `/api/permissions/${staffId}`, { auth: login("owner"), body: { allow: ["permissions.manage"], deny: [], confirm: true } }), ctx({ discordId: staffId }));
    expect(res.status).toBe(400);
  });
});

describe("protection", () => {
  it("head of support cannot change protection; lockdown needs confirm", async () => {
    expect((await patchProtection(req("PATCH", "/api/protection", { auth: login("head_support"), body: { antiLinks: false } }), ctx({}))).status).toBe(403);
    expect((await patchProtection(req("PATCH", "/api/protection", { auth: login("manager"), body: { lockdown: true } }), ctx({}))).status).toBe(428);
    expect((await patchProtection(req("PATCH", "/api/protection", { auth: login("manager"), body: { lockdown: true, confirm: true } }), ctx({}))).status).toBe(200);
    expect((await patchProtection(req("PATCH", "/api/protection", { auth: login("manager"), body: { unknown: 1 } }), ctx({}))).status).toBe(400);
  });
});

describe("member profile redaction", () => {
  it("support gets a basic profile without economy data", async () => {
    const res = await getMember(req("GET", `/api/members/${memberId}`, { auth: login("support") }), ctx({ discordId: memberId }));
    const p = await res.json();
    expect(p.displayName).toBeTruthy();
    expect(p.points).toBeNull();
    expect(p.lifetimePoints).toBeNull();
  });

  it("profiles never carry Roblox purchase data (that lives on the Roblox page)", async () => {
    const res = await getMember(req("GET", `/api/members/${memberId}`, { auth: login("owner") }), ctx({ discordId: memberId }));
    const p = await res.json();
    expect(p).not.toHaveProperty("purchases");
    expect(p).not.toHaveProperty("totalRobux");
    expect(typeof p.linked).toBe("boolean");
  });

  it("head of support gets the full profile", async () => {
    const res = await getMember(req("GET", `/api/members/${memberId}`, { auth: login("head_support") }), ctx({ discordId: memberId }));
    const p = await res.json();
    expect(typeof p.points).toBe("number");
  });
});

describe("backend answers 501 (action not built yet)", () => {
  it("returns a friendly 501 and audits an attempt, not a change", async () => {
    const original = provider.botAction.bind(provider);
    const { ProviderError } = await import("@/lib/provider/errors");
    provider.botAction = async () => {
      throw new ProviderError("not_implemented", "not implemented");
    };
    try {
      const res = await botAction(req("POST", "/api/bots/ops/restart", { auth: login("manager"), body: {} }), ctx({ name: "ops", action: "restart" }));
      expect(res.status).toBe(501);
      expect((await res.json()).error).toBe("not_implemented");
      const [entry] = queryAudit({ action: "bots.restart" }).items;
      expect(entry.outcome).toBe("not_connected");
      expect(entry.ok).toBe(false);
      expect(entry.target).toBe("bot:ops");
      expect(queryAudit({ outcome: "ok", action: "bots.restart" }).items).toHaveLength(0);
    } finally {
      provider.botAction = original;
    }
  });

  it("does the same for point adjustments, keeping the reason", async () => {
    const original = provider.adjustPoints.bind(provider);
    const { ProviderError } = await import("@/lib/provider/errors");
    provider.adjustPoints = async () => {
      throw new ProviderError("not_implemented", "nope");
    };
    try {
      const res = await adjust(req("POST", "/api/points/adjust", { auth: login("manager"), body: { discordId: memberId, delta: 20, reason: "Event reward" } }), ctx({}));
      expect(res.status).toBe(501);
      const [entry] = queryAudit({ action: "points.adjust" }).items;
      expect(entry.outcome).toBe("not_connected");
      expect(entry.reason).toBe("Event reward");
    } finally {
      provider.adjustPoints = original;
    }
  });
});

describe("provider errors across bundles", () => {
  it("recognises a ProviderError from another module copy (no instanceof)", async () => {
    const { errorResponse } = await import("@/lib/server/api");
    const foreign = Object.assign(new Error("nope"), { name: "ProviderError", code: "not_implemented", status: 501 });
    const res = errorResponse(foreign);
    expect(res.status).toBe(501);
    expect((await res.json()).error).toBe("not_implemented");
  });
});
