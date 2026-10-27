import { describe, expect, it } from "vitest";
import { ATTENTION_RULES, computeAttention, pageBadges, targetSeverities } from "@/lib/attention";
import { denialReason, rolesGranting } from "@/lib/permissions";
import type { Assistant, BotStatus, ProtectionSettings, TicketSummary, Transfer } from "@/lib/types";

const NOW = Date.parse("2026-10-27T18:00:00Z");
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();

const bot = (name: BotStatus["name"], patch: Partial<BotStatus> = {}): BotStatus => ({
  name, displayName: name, kind: "core", state: "online", startedAt: ago(100), restarts24h: 0, memoryMb: 100, memoryLimitMb: 512,
  cpuPct: 1, pingMs: 40, version: "1", lastError: null, ...patch,
});
const ticket = (id: string, patch: Partial<TicketSummary> = {}): TicketSummary => ({
  id, number: 1, subject: "s", category: "support", status: "open", openedAt: ago(5),
  openedBy: { discordId: "1", name: "A" }, claimedBy: null, lastMessageAt: ago(5), ...patch,
});
const transfer = (id: string, status: Transfer["status"], at = ago(5)): Transfer => ({ id, at, robloxName: "R", robux: 10, points: 12, status });

describe("computeAttention", () => {
  it("is empty when everything is healthy", () => {
    expect(computeAttention({ now: NOW, bots: [bot("ops")], tickets: [ticket("t1")], transfers: [transfer("x", "completed")] })).toEqual([]);
  });

  it("flags offline (critical), degraded and stopped bots and restart spikes", () => {
    const items = computeAttention({
      now: NOW,
      bots: [bot("ops", { state: "offline" }), bot("tickets", { state: "degraded", lastError: { at: ago(2), message: "boom" } }), bot("welcome", { state: "stopped" }), bot("system", { restarts24h: ATTENTION_RULES.restartSpike })],
    });
    expect(items.map((i) => [i.key, i.severity, i.target])).toEqual([
      ["botOffline", "critical", "bot:ops"],
      ["botStopped", "warning", "bot:welcome"],
      ["botRestarts", "warning", "bot:system"],
      ["botDegraded", "warning", "bot:tickets"],
    ]);
  });

  it("flags an offline assistant unless its bot is already flagged", () => {
    const assistant = (bot: Assistant["bot"]): Assistant => ({ bot, displayName: bot, state: "offline", room: null, calledBy: null, since: null });
    const items = computeAttention({ now: NOW, bots: [bot("assistant-1", { state: "stopped", kind: "assistant" })], assistants: [assistant("assistant-1"), assistant("assistant-2")] });
    expect(items.filter((i) => i.key === "assistantOffline").map((i) => i.target)).toEqual(["bot:assistant-2"]);
  });

  it("aggregates unclaimed tickets past the threshold, critical when old", () => {
    const young = computeAttention({ now: NOW, tickets: [ticket("a", { openedAt: ago(5) })] });
    expect(young).toEqual([]);
    const items = computeAttention({ now: NOW, tickets: [ticket("a", { openedAt: ago(20) }), ticket("b", { openedAt: ago(70) }), ticket("c", { status: "claimed", openedAt: ago(90) })] });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ key: "ticketsUnclaimed", severity: "critical", params: { n: 2, minutes: 70 }, related: ["ticket:a", "ticket:b"] });
  });

  it("flags failed and stuck transfers", () => {
    const items = computeAttention({ now: NOW, transfers: [transfer("f", "failed"), transfer("p", "pending", ago(45)), transfer("q", "processing", ago(3))] });
    expect(items.map((i) => i.key)).toEqual(["transfersFailed", "transfersStuck"]);
    expect(items[0].related).toEqual(["transfer:f"]);
    expect(items[1].related).toEqual(["transfer:p"]);
  });

  it("flags lockdown and raid mode as critical", () => {
    const protection = { lockdown: true, raidMode: true, updatedAt: ago(1) } as ProtectionSettings;
    const items = computeAttention({ now: NOW, protection });
    expect(items.map((i) => [i.key, i.severity])).toEqual([
      ["lockdownOn", "critical"],
      ["raidOn", "critical"],
    ]);
  });

  it("only shows items the user may see", () => {
    const input = { now: NOW, bots: [bot("ops", { state: "offline" })], transfers: [transfer("f", "failed")], protection: { lockdown: true, raidMode: false, updatedAt: ago(1) } as ProtectionSettings };
    expect(computeAttention(input, { roles: ["dev"] }).map((i) => i.key)).toEqual(["botOffline"]);
    expect(computeAttention(input, { roles: ["support"] })).toEqual([]);
    expect(computeAttention(input, { roles: ["head_support"] }).map((i) => i.key)).toEqual(["transfersFailed"]);
    expect(computeAttention(input, { roles: ["manager"] })).toHaveLength(3);
  });

  it("summarises per page and per target", () => {
    const items = computeAttention({ now: NOW, bots: [bot("ops", { state: "offline" }), bot("tickets", { state: "degraded" })], transfers: [transfer("f", "failed")] });
    expect(pageBadges(items)).toEqual({ overview: { count: 2, severity: "critical" }, points: { count: 1, severity: "warning" } });
    const t = targetSeverities(items);
    expect(t.get("bot:ops")).toBe("critical");
    expect(t.get("transfer:f")).toBe("warning");
  });
});

describe("why can't I?", () => {
  it("names the lowest role that grants the action", () => {
    expect(rolesGranting("bots.stop")).toEqual(["manager", "owner"]);
    expect(denialReason({ roles: ["dev"] }, "bots.stop")).toEqual({ kind: "role", roles: ["manager"] });
    expect(denialReason({ roles: ["support"] }, "tickets.close")).toEqual({ kind: "role", roles: ["head_support"] });
  });
  it("explains overrides and owner-only actions", () => {
    expect(denialReason({ roles: ["manager"], overrides: { allow: [], deny: ["bots.stop"] } }, "bots.stop")).toEqual({ kind: "override" });
    expect(denialReason({ roles: ["manager"] }, "permissions.manage")).toEqual({ kind: "owner_only" });
    expect(denialReason({ roles: ["owner"] }, "permissions.manage")).toBeNull();
  });
});
