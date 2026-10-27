import { afterEach, describe, expect, it } from "vitest";
import { MockProvider, paginate } from "@/lib/provider/mock";
import { ProviderError } from "@/lib/provider/errors";
import { createRng } from "@/lib/rng";
import type { LiveEvent } from "@/lib/types";
import { BOT_NAMES } from "@/lib/types";

const NOW = Date.parse("2026-10-20T15:00:00Z");
const made: MockProvider[] = [];
const make = (seed = 1) => {
  const p = new MockProvider({ seed, now: NOW, autoTick: false, liveRng: createRng(seed + 100) });
  made.push(p);
  return p;
};
afterEach(() => made.splice(0).forEach((p) => p.stop()));

const actor = { discordId: "mock-manager", name: "Mock Manager", avatarUrl: null };

describe("MockProvider history", () => {
  it("is deterministic for a seed", async () => {
    const a = await make(7).getPurchases({ limit: 20 });
    const b = await make(7).getPurchases({ limit: 20 });
    expect(a.items.map((p) => [p.robloxName, p.robux, p.at])).toEqual(b.items.map((p) => [p.robloxName, p.robux, p.at]));
  });

  it("has every bot and three assistants", async () => {
    const p = make();
    expect((await p.getBots()).map((b) => b.name)).toEqual([...BOT_NAMES]);
    expect(await p.getAssistants()).toHaveLength(3);
  });

  it("computes points from robux and cashback rate", async () => {
    const { items } = await make().getPurchases({ limit: 200 });
    expect(items.length).toBe(200);
    for (const p of items) {
      expect(p.points).toBe(Math.round(p.robux * p.cashbackRate));
      expect(p.cashbackRate).toBeGreaterThan(0);
      expect(p.cashbackRate).toBeLessThanOrEqual(0.2);
    }
  });

  it("returns purchases newest first and paginates by cursor", async () => {
    const p = make();
    const first = await p.getPurchases({ limit: 10 });
    const second = await p.getPurchases({ limit: 10, cursor: first.nextCursor! });
    const all = [...first.items, ...second.items];
    for (let i = 1; i < all.length; i++) expect(all[i - 1].at >= all[i].at).toBe(true);
    expect(new Set(all.map((x) => x.id)).size).toBe(20);
  });

  it("keeps ledgers consistent: balanceAfter chains and never goes negative", async () => {
    const p = make();
    const members = await p.searchMembers("", 15);
    for (const m of members) {
      const { items } = await p.getLedger(m.discordId, { limit: 200 });
      const chrono = [...items].reverse();
      for (let i = 1; i < chrono.length; i++) {
        expect(chrono[i].balanceAfter).toBe(chrono[i - 1].balanceAfter + chrono[i].delta);
      }
      for (const e of items) expect(e.balanceAfter).toBeGreaterThanOrEqual(0);
      const profile = await p.getMember(m.discordId);
      if (items.length) expect(profile!.points).toBe(items[0].balanceAfter);
    }
  });

  it("builds a summary with 14 daily and 8 weekly buckets", async () => {
    const s = await make().getPointsSummary();
    expect(s.daily.length).toBeGreaterThanOrEqual(14);
    expect(s.weekly.length).toBeGreaterThanOrEqual(8);
    expect(s.topBuyers.length).toBeGreaterThan(0);
    for (let i = 1; i < s.topBuyers.length; i++) expect(s.topBuyers[i - 1].robux).toBeGreaterThanOrEqual(s.topBuyers[i].robux);
    expect(s.outstandingPoints).toBeGreaterThan(0);
  });

  it("links some conversion tickets to transfers", async () => {
    const p = make();
    const { items } = await p.getTransfers({ limit: 200 });
    const linked = items.filter((t) => t.ticketId);
    for (const t of linked) {
      const tk = await p.getTicket(t.ticketId!);
      expect(tk?.transferId).toBe(t.id);
      expect(tk?.category).toBe("conversion");
    }
  });
});

describe("MockProvider mutations", () => {
  it("adjusts points, writes a ledger entry and emits events", async () => {
    const p = make();
    const events: LiveEvent[] = [];
    p.subscribe((e) => events.push(e));
    const [m] = await p.searchMembers("", 1);
    const before = (await p.getMember(m.discordId))!.points!;
    const entry = await p.adjustPoints({ discordId: m.discordId, delta: 250, reason: "Compensation for outage", actor });
    expect(entry.balanceAfter).toBe(before + 250);
    expect(entry.reason).toBe("Compensation for outage");
    expect(entry.actor).toEqual(actor);
    expect((await p.getMember(m.discordId))!.points).toBe(before + 250);
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(["ledger", "activity"]));
  });

  it("refuses to make a balance negative", async () => {
    const p = make();
    const [m] = await p.searchMembers("", 1);
    const bal = (await p.getMember(m.discordId))!.points!;
    await expect(p.adjustPoints({ discordId: m.discordId, delta: -(bal + 1), reason: "too much", actor })).rejects.toMatchObject({ code: "conflict" });
  });

  it("rejects unknown members and zero deltas", async () => {
    const p = make();
    await expect(p.adjustPoints({ discordId: "nope", delta: 5, reason: "x", actor })).rejects.toBeInstanceOf(ProviderError);
    const [m] = await p.searchMembers("", 1);
    await expect(p.adjustPoints({ discordId: m.discordId, delta: 0, reason: "x", actor })).rejects.toMatchObject({ code: "invalid" });
  });

  it("restarts a bot through the restarting state", async () => {
    const p = make();
    await p.botAction("ops", "restart");
    expect((await p.getBots()).find((b) => b.name === "ops")!.state).toBe("restarting");
    p.tick(Date.now() + 3000);
    const ops = (await p.getBots()).find((b) => b.name === "ops")!;
    expect(ops.state).toBe("online");
    expect(ops.startedAt).not.toBeNull();
  });

  it("stops and starts a bot; stopping an assistant takes it offline", async () => {
    const p = make();
    await p.botAction("assistant-2", "stop");
    expect((await p.getAssistants()).find((a) => a.bot === "assistant-2")!.state).toBe("offline");
    await expect(p.botAction("assistant-2", "stop")).rejects.toMatchObject({ code: "conflict" });
    await p.botAction("assistant-2", "start");
    p.tick(Date.now() + 3000);
    expect((await p.getBots()).find((b) => b.name === "assistant-2")!.state).toBe("online");
    expect((await p.getAssistants()).find((a) => a.bot === "assistant-2")!.state).toBe("free");
  });

  it("runs the ticket lifecycle", async () => {
    const p = make();
    const { items } = await p.getTickets({ status: "open", limit: 1 });
    const id = items[0].id;
    await p.ticketAction(id, { type: "claim", actor });
    await expect(p.ticketAction(id, { type: "claim", actor })).rejects.toMatchObject({ code: "conflict" });
    const replied = await p.ticketAction(id, { type: "reply", actor, body: "On it" });
    expect(replied.messages.at(-1)!.body).toBe("On it");
    const closed = await p.ticketAction(id, { type: "close", actor });
    expect(closed.status).toBe("closed");
  });

  it("patches protection settings", async () => {
    const p = make();
    const next = await p.setProtection({ lockdown: true, blockedWords: [{ id: "bw-mentions", enabled: true }] });
    expect(next.lockdown).toBe(true);
    expect(next.blockedWords.find((b) => b.id === "bw-mentions")!.enabled).toBe(true);
  });
});

describe("MockProvider live ticks", () => {
  it("emits purchases and moves transfers forward", async () => {
    const p = make(3);
    const events: LiveEvent[] = [];
    p.subscribe((e) => events.push(e));
    let t = Date.now();
    for (let i = 0; i < 400; i++) p.tick((t += 1000));
    const types = new Set(events.map((e) => e.type));
    for (const x of ["purchase", "bot", "stats", "activity", "log"]) expect(types.has(x as LiveEvent["type"])).toBe(true);
    const transfers = events.filter((e) => e.type === "transfer");
    if (transfers.length) {
      const statuses = new Set(transfers.map((e) => (e.type === "transfer" ? e.data.status : "")));
      expect(statuses.has("pending")).toBe(true);
    }
  });

  it("unsubscribe stops delivery", () => {
    const p = make();
    let n = 0;
    const off = p.subscribe(() => n++);
    off();
    for (let i = 0; i < 50; i++) p.tick(Date.now() + i * 1000);
    expect(n).toBe(0);
  });
});

describe("paginate", () => {
  const list = Array.from({ length: 7 }, (_, i) => ({ id: `x${i}` }));
  it("walks newest first", () => {
    const a = paginate(list, { limit: 3 });
    expect(a.items.map((x) => x.id)).toEqual(["x6", "x5", "x4"]);
    const b = paginate(list, { limit: 3, cursor: a.nextCursor! });
    expect(b.items.map((x) => x.id)).toEqual(["x3", "x2", "x1"]);
    const c = paginate(list, { limit: 3, cursor: b.nextCursor! });
    expect(c.items.map((x) => x.id)).toEqual(["x0"]);
    expect(c.nextCursor).toBeNull();
  });
  it("returns nothing for an unknown cursor", () => {
    expect(paginate(list, { cursor: "zzz" }).items).toEqual([]);
  });
});
