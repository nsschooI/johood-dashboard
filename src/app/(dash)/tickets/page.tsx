import type { Metadata } from "next";
import { PageTransition } from "@/components/shell/page-transition";
import { TicketsView } from "@/components/tickets/tickets-view";
import { canSeePage } from "@/lib/permissions";
import { getProvider } from "@/lib/provider";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../no-access";

export const metadata: Metadata = { title: "Tickets" };

/** Tickets live in JoHood Catalog, whichever server is selected. */
export default async function TicketsPage() {
  const { user } = await requireSession();
  if (!canSeePage(user, "tickets")) return <NoAccess />;
  const initial = await getProvider().getTickets({ status: "active", limit: 50, guild: "catalog" });
  return (
    <PageTransition>
      <TicketsView initial={initial} />
    </PageTransition>
  );
}
