import type { Metadata } from "next";
import { MembersView } from "@/components/members/members-view";
import { PageTransition } from "@/components/shell/page-transition";
import { canSeePage } from "@/lib/permissions";
import { resolveGuild } from "@/lib/server/guild";
import { getMembersData } from "@/lib/server/queries";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../no-access";

export const metadata: Metadata = { title: "Members & Security" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ guild?: string }> }) {
  const { user } = await requireSession();
  if (!canSeePage(user, "members")) return <NoAccess />;
  const guild = await resolveGuild((await searchParams).guild);
  return (
    <PageTransition>
      <MembersView key={guild} data={await getMembersData(user, guild)} />
    </PageTransition>
  );
}
