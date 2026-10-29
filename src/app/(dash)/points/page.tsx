import type { Metadata } from "next";
import { PointsView } from "@/components/points/points-view";
import { PageTransition } from "@/components/shell/page-transition";
import { canSeePage } from "@/lib/permissions";
import { getPointsData } from "@/lib/server/queries";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../no-access";

export const metadata: Metadata = { title: "Points" };

export default async function PointsPage() {
  const { user } = await requireSession();
  if (!canSeePage(user, "points")) return <NoAccess />;
  return (
    <PageTransition>
      <PointsView data={await getPointsData(user)} />
    </PageTransition>
  );
}
