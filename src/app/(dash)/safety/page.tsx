import type { Metadata } from "next";
import { PageTransition } from "@/components/shell/page-transition";
import { SafetyView } from "@/components/safety/safety-view";
import { canSeePage } from "@/lib/permissions";
import { getProvider } from "@/lib/provider";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../no-access";

export const metadata: Metadata = { title: "Safety" };

export default async function SafetyPage() {
  const { user } = await requireSession();
  if (!canSeePage(user, "safety")) return <NoAccess />;
  return (
    <PageTransition>
      <SafetyView protection={await getProvider().getProtection()} />
    </PageTransition>
  );
}
