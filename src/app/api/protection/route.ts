import { z } from "zod";
import { guard, readJson, requireConfirm } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

export const GET = guard({ permission: "protection.view" }, () => getProvider().getProtection());

const Patch = z
  .object({
    lockdown: z.boolean().optional(),
    raidMode: z.boolean().optional(),
    raidJoinThreshold: z.number().int().min(2).max(200).optional(),
    minAccountAgeDays: z.number().int().min(0).max(365).optional(),
    antiLinks: z.boolean().optional(),
    blockedWords: z.array(z.object({ id: z.string().max(64), enabled: z.boolean() })).max(50).optional(),
    confirm: z.boolean().optional(),
  })
  .strict();

/** PATCH /api/protection — lockdown & raid mode changes need confirm. */
export const PATCH = guard({ permission: "protection.manage", mutation: true, rateLimit: "settings" }, async ({ req, audit, intent }) => {
  const { confirm, ...patch } = await readJson(req, Patch);
  if (patch.lockdown !== undefined || patch.raidMode !== undefined) requireConfirm(confirm, "a lockdown / raid mode change");
  const p = getProvider();
  const before = await p.getProtection();
  intent({ action: "protection.manage", target: "protection", after: patch });
  const after = await p.setProtection(patch);
  const pickChanged = (s: typeof before) => {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(patch) as (keyof typeof patch)[]) {
      out[k] = k === "blockedWords" ? s.blockedWords.filter((b) => patch.blockedWords!.some((x) => x.id === b.id)).map((b) => ({ id: b.id, enabled: b.enabled })) : s[k];
    }
    return out;
  };
  audit({ action: "protection.manage", target: "protection", before: pickChanged(before), after: pickChanged(after) });
  return after;
});
