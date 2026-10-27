import { guard } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { can } from "@/lib/permissions";
import { getAllOverrides } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** Staff list; overrides are included only for users who can manage them. */
export const GET = guard({ permission: "staff.view" }, async ({ user, guild }) => {
  const staff = await getProvider().getStaff(guild);
  const overrides = can(user, "permissions.manage") ? getAllOverrides() : null;
  return staff.map((s) => ({ ...s, overrides: overrides ? (overrides[s.discordId] ?? { allow: [], deny: [] }) : null }));
});
