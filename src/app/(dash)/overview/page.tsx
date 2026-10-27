import type { Metadata } from "next";
import { OverviewView } from "@/components/overview/overview-view";
import { PageTransition } from "@/components/shell/page-transition";
import { canSeePage } from "@/lib/permissions";
import { resolveGuild } from "@/lib/server/guild";
import { getOverviewData } from "@/lib/server/queries";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../no-access";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ guild?: string }> }) {
  const { user } = await requireSession();
  if (!canSeePage(user, "overview")) return <NoAccess />;
  const guild = await resolveGuild((await searchParams).guild);
  return (
    <PageTransition>
      <OverviewView key={guild} data={await getOverviewData(user, guild)} />
    </PageTransition>
  );
}
