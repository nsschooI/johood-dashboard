import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GiveawayDetailView } from "@/components/giveaways-admin/detail-view";
import { PageTransition } from "@/components/shell/page-transition";
import { canSeePage } from "@/lib/permissions";
import { getProvider } from "@/lib/provider";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../../no-access";

export const metadata: Metadata = { title: "Giveaway" };

export default async function GiveawayAdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireSession();
  if (!canSeePage(user, "giveaways")) return <NoAccess />;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const api = getProvider().adminGiveaways;
  const g = await api.get(id);
  if (!g) notFound();
  const people = await api.participants(id);
  return (
    <PageTransition>
      <GiveawayDetailView key={id} initial={g} people={people} />
    </PageTransition>
  );
}
