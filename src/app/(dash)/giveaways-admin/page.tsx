import type { Metadata } from "next";
import { GiveawaysAdminView } from "@/components/giveaways-admin/list-view";
import { PageTransition } from "@/components/shell/page-transition";
import { canSeePage } from "@/lib/permissions";
import { getProvider } from "@/lib/provider";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../no-access";

export const metadata: Metadata = { title: "Giveaways" };

export default async function GiveawaysAdminPage() {
  const { user } = await requireSession();
  if (!canSeePage(user, "giveaways")) return <NoAccess />;
  return (
    <PageTransition>
      <GiveawaysAdminView initial={await getProvider().adminGiveaways.list()} />
    </PageTransition>
  );
}
