import "server-only";
/**
 * Read-side data access used by pages (initial render) and API routes.
 * Each function only fetches what the user is allowed to see.
 */
import { can, canAny, type SessionUser } from "../permissions";
import { getProvider } from "../provider";
import { canSeeActivity, redactProfile } from "../visibility";

export async function getOverviewData(user: SessionUser) {
  const p = getProvider();
  const [bots, assistants, stats, activity, tickets] = await Promise.all([
    can(user, "bots.view") ? p.getBots() : null,
    can(user, "assistants.view") ? p.getAssistants() : null,
    can(user, "stats.view") ? p.getServerStats() : null,
    can(user, "activity.view") ? p.getActivity(80) : null,
    can(user, "tickets.view") ? p.getTickets({ status: "active", limit: 25 }) : null,
  ]);
  return {
    bots,
    assistants,
    stats,
    activity: activity ? activity.filter((a) => canSeeActivity(user, a)).slice(0, 40) : null,
    tickets: tickets?.items ?? null,
  };
}

export async function getPointsData(user: SessionUser) {
  const p = getProvider();
  const [purchases, transfers, redemptions, summary] = await Promise.all([
    can(user, "purchases.view") ? p.getPurchases({ limit: 30 }) : null,
    can(user, "transfers.view") ? p.getTransfers({ limit: 25 }) : null,
    can(user, "points.view") ? p.getRedemptions({ limit: 15 }) : null,
    can(user, "points.view") ? p.getPointsSummary() : null,
  ]);
  return { purchases, transfers, redemptions, summary };
}

export async function getMembersData(user: SessionUser) {
  const p = getProvider();
  const [members, ranks, roles, staff, protection] = await Promise.all([
    can(user, "members.view") ? p.searchMembers("", 12) : null,
    can(user, "members.view") ? p.getRanks() : null,
    can(user, "members.view") ? p.getRoles() : null,
    can(user, "staff.view") ? p.getStaff() : null,
    canAny(user, ["protection.view"]) ? p.getProtection() : null,
  ]);
  return { members, ranks, roles, staff, protection };
}

export async function getMemberFor(user: SessionUser, discordId: string) {
  const profile = await getProvider().getMember(discordId);
  return profile ? redactProfile(user, profile) : null;
}
