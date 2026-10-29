import type { Metadata } from "next";
import { ActivityView } from "@/components/activity/activity-view";
import { PageTransition } from "@/components/shell/page-transition";
import { canSeePage } from "@/lib/permissions";
import { getActivityData } from "@/lib/server/queries";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../no-access";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  const { user } = await requireSession();
  if (!canSeePage(user, "activity")) return <NoAccess />;
  return (
    <PageTransition>
      <ActivityView data={await getActivityData(user)} />
    </PageTransition>
  );
}
