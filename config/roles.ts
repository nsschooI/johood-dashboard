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
  { discordRoleId: "REPLACE_ME_OWNER_ROLE_ID", label: "Owner", role: "owner" },
  { discordRoleId: "REPLACE_ME_FOUNDER_ROLE_ID", label: "Founder", role: "owner" },
  { discordRoleId: "REPLACE_ME_HEAD_MANAGERS_ROLE_ID", label: "Head Managers", role: "manager" },
  { discordRoleId: "REPLACE_ME_MANAGER_ROLE_ID", label: "Manager", role: "manager" },
  { discordRoleId: "REPLACE_ME_DEV_ROLE_ID", label: "Dev", role: "dev" },
  { discordRoleId: "REPLACE_ME_HEAD_OF_SUPPORT_ROLE_ID", label: "Head of Support", role: "head_support" },
  { discordRoleId: "REPLACE_ME_SUPPORT_STAFF_ROLE_ID", label: "Support Staff", role: "support" },
];

/** Map a member's Discord role IDs to dashboard roles (deduplicated, highest first). */
export function rolesFromDiscord(discordRoleIds: readonly string[]): Role[] {
  const ids = new Set(discordRoleIds);
  const order: Role[] = ["owner", "manager", "dev", "head_support", "support"];
  const matched = new Set(ROLE_BINDINGS.filter((b) => ids.has(b.discordRoleId)).map((b) => b.role));
  return order.filter((r) => matched.has(r));
}
