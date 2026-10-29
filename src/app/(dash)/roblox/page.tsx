import type { Metadata } from "next";
import { RobloxView } from "@/components/roblox/roblox-view";
import { PageTransition } from "@/components/shell/page-transition";
import { canSeePage } from "@/lib/permissions";
import { resolveGuild } from "@/lib/server/guild";
import { getRobloxData } from "@/lib/server/queries";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../no-access";

export const metadata: Metadata = { title: "Roblox" };

export default async function RobloxPage({ searchParams }: { searchParams: Promise<{ guild?: string }> }) {
  const { user } = await requireSession();
  if (!canSeePage(user, "roblox")) return <NoAccess />;
  const guild = await resolveGuild((await searchParams).guild);
  return (
    <PageTransition>
      <RobloxView key={guild} data={await getRobloxData(user, guild)} />
    </PageTransition>
  );
}
