import type { Metadata } from "next";
import { BotsView } from "@/components/bots/bots-view";
import { PageTransition } from "@/components/shell/page-transition";
import { can, canSeePage } from "@/lib/permissions";
import { getProvider } from "@/lib/provider";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../no-access";

export const metadata: Metadata = { title: "Bots" };

export default async function BotsPage() {
  const { user } = await requireSession();
  if (!canSeePage(user, "bots")) return <NoAccess />;
  const p = getProvider();
  const [bots, assistants] = await Promise.all([can(user, "bots.view") ? p.getBots() : null, can(user, "assistants.view") ? p.getAssistants() : null]);
  return (
    <PageTransition>
      <BotsView bots={bots} assistants={assistants} />
    </PageTransition>
  );
}
