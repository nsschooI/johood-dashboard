import { beforeEach, describe, expect, it } from "vitest";
import { openDb, setDbForTests } from "@/lib/server/db";
import {
  createSession,
  deleteSession,
  deleteSessionsFor,
  getOverrides,
  getPrefs,
  queryAudit,
  resolveSession,
  setOverrides,
  setPrefs,
  writeAudit,
} from "@/lib/server/store";
import { rateLimit, resetRateLimits } from "@/lib/server/rate-limit";
import { can } from "@/lib/permissions";

const user = { discordId: "mock-support", name: "Mock Support", avatarUrl: null, roles: ["support" as const] };
let db: ReturnType<typeof openDb>;

beforeEach(() => {
  db = openDb(":memory:");
  setDbForTests(db);
  resetRateLimits();
});

describe("sessions", () => {
  it("round-trips and stores only a hash of the token", () => {
    const { token, csrf } = createSession(user);
    const s = resolveSession(token)!;
    expect(s.user.discordId).toBe(user.discordId);
    expect(s.user.roles).toEqual(["support"]);
    expect(s.csrf).toBe(csrf);
    const raw = db.prepare("SELECT token_hash FROM sessions").get() as { token_hash: string };
    expect(raw.token_hash).not.toBe(token);
  });

  it("rejects unknown, empty and expired tokens", () => {
    const now = Date.now();
    const { token } = createSession(user, {}, now - 13 * 3600_000);
    expect(resolveSession(token)).toBeNull();
    expect(resolveSession("nope")).toBeNull();
    expect(resolveSession("")).toBeNull();
    expect(resolveSession(undefined)).toBeNull();
  });

  it("logs out one session or all of a member's sessions", () => {
    const a = createSession(user);
    const b = createSession(user);
    deleteSession(a.token);
    expect(resolveSession(a.token)).toBeNull();
    expect(resolveSession(b.token)).not.toBeNull();
    expect(deleteSessionsFor(user.discordId)).toBe(1);
    expect(resolveSession(b.token)).toBeNull();
  });

  it("applies permission overrides live, without re-login", () => {
    const { token } = createSession(user);
    expect(can(resolveSession(token)!.user, "tickets.close")).toBe(false);
    setOverrides(user.discordId, { allow: ["tickets.close"], deny: ["tickets.reply"] }, "mock-owner");
    const s = resolveSession(token)!;
    expect(can(s.user, "tickets.close")).toBe(true);
    expect(can(s.user, "tickets.reply")).toBe(false);
  });
});

describe("permission overrides", () => {
  it("replaces the set and returns the previous one", () => {
    setOverrides("m1", { allow: ["bots.view"], deny: [] }, "owner");
    const before = setOverrides("m1", { allow: [], deny: ["bots.view"] }, "owner");
    expect(before).toEqual({ allow: ["bots.view"], deny: [] });
    expect(getOverrides("m1")).toEqual({ allow: [], deny: ["bots.view"] });
  });
  it("deny wins when an action is listed twice", () => {
    setOverrides("m1", { allow: ["bots.view"], deny: ["bots.view"] }, "owner");
    expect(getOverrides("m1")).toEqual({ allow: [], deny: ["bots.view"] });
  });
});

describe("audit log", () => {
  it("writes who/what/when/reason/before/after and filters", () => {
    writeAudit({ actor: user, action: "points.adjust", target: "member:1", reason: "Refund for bug", before: { balance: 10 }, after: { balance: 60 } });
    writeAudit({ actor: { ...user, discordId: "x", name: "Other" }, action: "bots.restart", target: "bot:ops" });
    writeAudit({ actor: user, action: "bots.stop", target: "bot:ops", ok: false, reason: "forbidden" });

    const all = queryAudit();
    expect(all.items).toHaveLength(3);
    expect(all.items[0].action).toBe("bots.stop"); // newest first
    expect(all.items[0].ok).toBe(false);

    const adj = queryAudit({ action: "points" }).items[0];
    expect(adj.reason).toBe("Refund for bug");
    expect(adj.before).toEqual({ balance: 10 });
    expect(adj.after).toEqual({ balance: 60 });
    expect(adj.actorRoles).toEqual(["support"]);

    expect(queryAudit({ actorId: "x" }).items).toHaveLength(1);
    expect(queryAudit({ q: "refund" }).items).toHaveLength(1);
    expect(queryAudit({ q: "%" }).items).toHaveLength(0); // LIKE wildcards are escaped
  });

  it("paginates by id", () => {
    for (let i = 0; i < 5; i++) writeAudit({ actor: user, action: "tickets.claim", target: `t${i}` });
    const p1 = queryAudit({ limit: 2 });
    const p2 = queryAudit({ limit: 2, beforeId: p1.nextCursor! });
    expect(p1.items.map((x) => x.target)).toEqual(["t4", "t3"]);
    expect(p2.items.map((x) => x.target)).toEqual(["t2", "t1"]);
  });

  it("is append-only", () => {
    writeAudit({ actor: user, action: "x" });
    expect(() => db.prepare("UPDATE audit_log SET action = 'y'").run()).toThrow(/append-only/);
    expect(() => db.prepare("DELETE FROM audit_log").run()).toThrow(/append-only/);
  });
});

describe("prefs", () => {
  it("defaults to null and merges patches", () => {
    expect(getPrefs("a")).toEqual({ locale: null, muted: null });
    setPrefs("a", { locale: "ar" });
    setPrefs("a", { muted: false });
    expect(getPrefs("a")).toEqual({ locale: "ar", muted: false });
  });
});

describe("rate limiter", () => {
  it("allows up to the limit within the window", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, t + i).ok).toBe(true);
    const blocked = rateLimit("k", 3, 1000, t + 10);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(990);
    expect(rateLimit("k", 3, 1000, t + 1001).ok).toBe(true);
  });
  it("keys are independent", () => {
    expect(rateLimit("a", 1, 1000, 0).ok).toBe(true);
    expect(rateLimit("b", 1, 1000, 0).ok).toBe(true);
    expect(rateLimit("a", 1, 1000, 1).ok).toBe(false);
  });
});
