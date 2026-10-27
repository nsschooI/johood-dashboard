import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ACTIONS, ROLE_PERMISSIONS } from "@/lib/permissions";
import { ROLES } from "@/lib/types";

/** docs/permissions.md must match the code, so the docs never lie. */
describe("docs/permissions.md", () => {
  const md = fs.readFileSync(path.resolve(import.meta.dirname, "../docs/permissions.md"), "utf8");
  const rows = new Map<string, string[]>();
  for (const line of md.split("\n")) {
    const m = line.match(/^\| `([a-z_.]+)` \| ((?:[✓—] \| ){4}[✓—]) \|$/);
    if (m) rows.set(m[1], m[2].split(" | "));
  }

  it("lists every action exactly once", () => {
    expect([...rows.keys()].sort()).toEqual([...ACTIONS].sort());
  });

  for (const action of ACTIONS) {
    it(`row for ${action} matches ROLE_PERMISSIONS`, () => {
      const expected = ROLES.map((r) => (ROLE_PERMISSIONS[r].includes(action) ? "✓" : "—"));
      expect(rows.get(action)).toEqual(expected);
    });
  }
});

import { createTranslator, dictionaries } from "@/lib/i18n";

describe("i18n", () => {
  it("has a plain-language description of every action in both languages", () => {
    for (const locale of ["en", "ar"] as const) {
      const t = createTranslator(locale);
      for (const a of ACTIONS) {
        const text = t(`access.action.${a}` as never);
        expect(text, `${locale} ${a}`).not.toBe(`access.action.${a}`);
      }
    }
  });

  it("en and ar have the same keys", () => {
    const keys = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === "object" && v ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    expect(keys(dictionaries.ar).sort()).toEqual(keys(dictionaries.en).sort());
  });
});
