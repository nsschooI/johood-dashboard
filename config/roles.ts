/**
 * Discord role → dashboard role mapping.
 *
 * Replace every `REPLACE_ME_*` placeholder with the real role ID from the
 * JoHood Discord server (Server Settings → Roles → right-click → Copy Role ID,
 * with Developer Mode on). Role IDs are not secret, but keep real member IDs
 * out of the repo.
 *
 * A member can hold several staff roles; their dashboard permissions are the
 * union of every matched role (see src/lib/permissions.ts). A member with no
 * matching role cannot sign in.
 */
import type { Role } from "@/lib/types";

export interface RoleBinding {
  /** Discord role ID (snowflake). */
  discordRoleId: string;
  /** Name of the role in Discord, for docs and the staff list. */
  label: string;
  /** Dashboard role it grants. */
  role: Role;
}

export const ROLE_BINDINGS: readonly RoleBinding[] = [
  { discordRoleId: "1564290421037727925", label: "Owner", role: "owner" },
  { discordRoleId: "1564290423625621654", label: "Founder", role: "owner" },
  { discordRoleId: "1564290426243129526", label: "Head Managers", role: "manager" },
  { discordRoleId: "1564290428927213619", label: "Manager", role: "manager" },
  { discordRoleId: "1564290435516465152", label: "Dev", role: "dev" },
  { discordRoleId: "1564303659821432944", label: "Head of Support", role: "head_support" },
  { discordRoleId: "1564290459365416960", label: "Support Staff", role: "support" },
];

/** Map a member's Discord role IDs to dashboard roles (deduplicated, highest first). */
export function rolesFromDiscord(discordRoleIds: readonly string[]): Role[] {
  const ids = new Set(discordRoleIds);
  const order: Role[] = ["owner", "manager", "dev", "head_support", "support"];
  const matched = new Set(ROLE_BINDINGS.filter((b) => ids.has(b.discordRoleId)).map((b) => b.role));
  return order.filter((r) => matched.has(r));
}
