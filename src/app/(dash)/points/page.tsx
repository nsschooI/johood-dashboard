import type { Metadata } from "next";
import { PointsView } from "@/components/points/points-view";
import { canSeePage } from "@/lib/permissions";
import { getPointsData } from "@/lib/server/queries";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../no-access";

export const metadata: Metadata = { title: "Points & Purchases" };

export default async function PointsPage() {
  const { user } = await requireSession();
  if (!canSeePage(user, "points")) return <NoAccess />;
  return <PointsView data={await getPointsData(user)} />;
}
