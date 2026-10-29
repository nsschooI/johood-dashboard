import type { Metadata } from "next";
import { LeaderboardsView } from "@/components/leaderboards/leaderboards-view";
import { PageTransition } from "@/components/shell/page-transition";
import { canSeePage } from "@/lib/permissions";
import { resolveGuild } from "@/lib/server/guild";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../no-access";

export const metadata: Metadata = { title: "Leaderboards" };

/** The board loads in the browser (and refreshes every minute). */
export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<{ guild?: string }> }) {
  const { user } = await requireSession();
  if (!canSeePage(user, "leaderboards")) return <NoAccess />;
  const guild = await resolveGuild((await searchParams).guild);
  return (
    <PageTransition>
      <LeaderboardsView key={guild} />
    </PageTransition>
  );
}
