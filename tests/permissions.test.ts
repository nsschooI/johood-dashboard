import { describe, expect, it } from "vitest";
import {
  ACTIONS,
  ROLE_PERMISSIONS,
  can,
  canSeePage,
  maxPointAdjust,
  permissionsFor,
  pointAdjustNeedsConfirm,
  type Action,
} from "@/lib/permissions";
import { ROLES, type Role } from "@/lib/types";
import { rolesFromDiscord, ROLE_BINDINGS } from "@config/roles";
import { DASHBOARD_CONFIG } from "@config/dashboard";

const u = (roles: Role[], overrides?: { allow?: Action[]; deny?: Action[] }) => ({
  roles,
  overrides: overrides ? { allow: overrides.allow ?? [], deny: overrides.deny ?? [] } : undefined,
});

/**
 * The full expected matrix, written out by hand. If you change
 * ROLE_PERMISSIONS on purpose, update this table AND docs/permissions.md.
 */
const EXPECTED: Record<Action, Role[]> = {
  "bots.view": ["owner", "manager", "dev"],
  "bots.logs": ["owner", "manager", "dev"],
  "bots.restart": ["owner", "manager", "dev"],
  "bots.stop": ["owner", "manager"],
  "assistants.view": ["owner", "manager", "dev"],
  "assistants.control": ["owner", "manager"],
  "stats.view": ["owner", "manager", "head_support"],
  "activity.view": ["owner", "manager", "dev", "head_support", "support"],
  "tickets.view": ["owner", "manager", "head_support", "support"],
  "tickets.claim": ["owner", "manager", "head_support", "support"],
  "tickets.reply": ["owner", "manager", "head_support", "support"],
  "tickets.close": ["owner", "manager", "head_support"],
  "tickets.transfer": ["owner", "manager", "head_support"],
  "purchases.view": ["owner", "manager", "head_support", "support"],
  "transfers.view": ["owner", "manager", "head_support"],
  "points.view": ["owner", "manager", "head_support"],
  "points.adjust": ["owner", "manager"],
  "points.adjust_limited": ["owner", "head_support"],
  "members.view": ["owner", "manager", "head_support", "support"],
  "members.view_full": ["owner", "manager", "head_support"],
  "staff.view": ["owner", "manager"],
  "protection.view": ["owner", "manager"],
  "protection.manage": ["owner", "manager"],
  "audit.view": ["owner", "manager"],
  "permissions.manage": ["owner"],
};

describe("permission matrix", () => {
  it("covers every action", () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...ACTIONS].sort());
  });

  for (const action of ACTIONS) {
    for (const role of ROLES) {
      const allowed = EXPECTED[action].includes(role);
      it(`${role} ${allowed ? "can" : "cannot"} ${action}`, () => {
        expect(can(u([role]), action)).toBe(allowed);
      });
    }
  }

  it("denies everything to anonymous and role-less users", () => {
    for (const a of ACTIONS) {
      expect(can(null, a)).toBe(false);
      expect(can(undefined, a)).toBe(false);
      expect(can(u([]), a)).toBe(false);
    }
  });

  it("matches the brief: dev cannot touch points or permissions", () => {
    const dev = u(["dev"]);
    for (const a of ACTIONS.filter((x) => x.startsWith("points.") || x === "permissions.manage")) expect(can(dev, a)).toBe(false);
  });

  it("matches the brief: support cannot adjust points or change settings", () => {
    const s = u(["support"]);
    for (const a of ["points.adjust", "points.adjust_limited", "protection.manage", "permissions.manage", "bots.restart"] as Action[]) {
      expect(can(s, a)).toBe(false);
    }
  });

  it("unions permissions across multiple staff roles", () => {
    const both = u(["dev", "support"]);
    expect(can(both, "bots.restart")).toBe(true);
    expect(can(both, "tickets.claim")).toBe(true);
    expect(can(both, "tickets.close")).toBe(false);
  });

  it("ROLE_PERMISSIONS only references known actions", () => {
    for (const r of ROLES) for (const a of ROLE_PERMISSIONS[r]) expect(ACTIONS).toContain(a);
  });
});

describe("overrides", () => {
  it("allow grants an extra action", () => {
    expect(can(u(["support"], { allow: ["tickets.close"] }), "tickets.close")).toBe(true);
  });

  it("deny wins over role grants", () => {
    expect(can(u(["manager"], { deny: ["bots.stop"] }), "bots.stop")).toBe(false);
  });

  it("cannot grant permissions.manage (no escalation)", () => {
    expect(can(u(["manager"], { allow: ["permissions.manage"] }), "permissions.manage")).toBe(false);
  });

  it("an owner cannot be locked out of permission management", () => {
    expect(can(u(["owner"], { deny: ["permissions.manage"] }), "permissions.manage")).toBe(true);
  });

  it("ignores unknown action strings", () => {
    const set = permissionsFor({ roles: [], overrides: { allow: ["nope" as Action], deny: [] } });
    expect(set.size).toBe(0);
  });
});

describe("point adjustment limits", () => {
  it("managers and owners are unlimited", () => {
    expect(maxPointAdjust(u(["manager"]))).toBe(Infinity);
    expect(maxPointAdjust(u(["owner"]))).toBe(Infinity);
  });
  it("head of support is capped", () => {
    expect(maxPointAdjust(u(["head_support"]))).toBe(DASHBOARD_CONFIG.limitedAdjustMax);
  });
  it("others cannot adjust", () => {
    for (const r of ["dev", "support"] as Role[]) expect(maxPointAdjust(u([r]))).toBe(0);
  });
  it("needs confirm above the threshold", () => {
    const t = DASHBOARD_CONFIG.pointsConfirmThreshold;
    expect(pointAdjustNeedsConfirm(t)).toBe(false);
    expect(pointAdjustNeedsConfirm(t + 1)).toBe(true);
    expect(pointAdjustNeedsConfirm(-(t + 1))).toBe(true);
  });
});

describe("page access", () => {
  it("dev sees only the overview", () => {
    expect(canSeePage(u(["dev"]), "overview")).toBe(true);
    expect(canSeePage(u(["dev"]), "points")).toBe(false);
    expect(canSeePage(u(["dev"]), "members")).toBe(false);
  });
  it("support sees all three pages (scoped content)", () => {
    for (const p of ["overview", "points", "members"] as const) expect(canSeePage(u(["support"]), p)).toBe(true);
  });
});

describe("config/roles", () => {
  it("maps Discord role IDs, highest first, deduplicated", () => {
    const ids = ROLE_BINDINGS.filter((b) => b.role === "support" || b.role === "owner").map((b) => b.discordRoleId);
    expect(rolesFromDiscord([...ids, "unrelated"])).toEqual(["owner", "support"]);
  });
  it("returns nothing for non-staff", () => {
    expect(rolesFromDiscord(["123", "456"])).toEqual([]);
  });
  it("contains only placeholders, never real IDs", () => {
    for (const b of ROLE_BINDINGS) expect(b.discordRoleId).toMatch(/^REPLACE_ME_/);
  });
});
