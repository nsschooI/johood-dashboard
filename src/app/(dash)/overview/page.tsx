import type { Metadata } from "next";
import { OverviewView } from "@/components/overview/overview-view";
import { canSeePage } from "@/lib/permissions";
import { getOverviewData } from "@/lib/server/queries";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../no-access";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const { user } = await requireSession();
  if (!canSeePage(user, "overview")) return <NoAccess />;
  return <OverviewView data={await getOverviewData(user)} />;
}
