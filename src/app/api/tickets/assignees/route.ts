import { guard } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Staff who can take over a ticket (for the hand-over picker). */
export const GET = guard({ permission: "tickets.transfer" }, async () => {
  const staff = await getProvider().getStaff();
  return staff.filter((s) => can({ roles: s.roles }, "tickets.view")).map((s) => ({ discordId: s.discordId, name: s.name, avatarUrl: s.avatarUrl }));
});
