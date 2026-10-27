import { describe, expect, it } from "vitest";
import { canReceive, redactProfile } from "@/lib/visibility";
import type { ActivityItem, LiveEvent, MemberProfile, Role } from "@/lib/types";

const u = (role: Role) => ({ roles: [role] });
const activity = (kind: ActivityItem["kind"]): LiveEvent => ({
  type: "activity",
  data: { id: "a", at: "", kind, variant: "x", tone: "neutral", params: {} },
});

describe("live stream filtering", () => {
  it("support never receives bot logs, transfers or protection changes", () => {
    const s = u("support");
    expect(canReceive(s, { type: "log", data: {} } as LiveEvent)).toBe(false);
    expect(canReceive(s, { type: "transfer", data: {} } as LiveEvent)).toBe(false);
    expect(canReceive(s, { type: "protection", data: {} } as LiveEvent)).toBe(false);
    expect(canReceive(s, { type: "purchase", data: {} } as LiveEvent)).toBe(true);
    expect(canReceive(s, { type: "ticket", data: {} } as LiveEvent)).toBe(true);
  });

  it("dev receives bot events and logs but no economy events", () => {
    const d = u("dev");
    expect(canReceive(d, { type: "log", data: {} } as LiveEvent)).toBe(true);
    expect(canReceive(d, { type: "bot", data: {} } as LiveEvent)).toBe(true);
    expect(canReceive(d, { type: "purchase", data: {} } as LiveEvent)).toBe(false);
    expect(canReceive(d, { type: "ledger", data: {} } as LiveEvent)).toBe(false);
  });

  it("filters activity lines by the permission behind each kind", () => {
    expect(canReceive(u("dev"), activity("bot"))).toBe(true);
    expect(canReceive(u("dev"), activity("purchase"))).toBe(false);
    expect(canReceive(u("support"), activity("points_adjust"))).toBe(false);
    expect(canReceive(u("head_support"), activity("points_adjust"))).toBe(true);
    expect(canReceive(u("head_support"), activity("protection"))).toBe(false);
    expect(canReceive(u("manager"), activity("protection"))).toBe(true);
  });
});

describe("redactProfile", () => {
  const profile = {
    discordId: "1", username: "u", displayName: "U", avatarUrl: null, rank: "gold", robloxName: "R",
    joinedAt: "", roles: [], roblox: null, points: 10, lifetimePoints: 20, totalRobux: 30, purchases: [], tickets: [],
  } as MemberProfile;

  it("removes economy fields for basic viewers", () => {
    const r = redactProfile(u("support"), profile);
    expect([r.points, r.lifetimePoints, r.totalRobux, r.purchases]).toEqual([null, null, null, null]);
  });
  it("keeps them for members.view_full", () => {
    expect(redactProfile(u("head_support"), profile).points).toBe(10);
  });
});
