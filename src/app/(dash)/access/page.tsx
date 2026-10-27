import type { Metadata } from "next";
import { AccessView } from "@/components/access/access-view";
import { PageTransition } from "@/components/shell/page-transition";
import { getAccessData } from "@/lib/server/queries";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Access" };

/** Everyone signed in can see who can do what; overrides need permissions.manage. */
export default async function AccessPage() {
  const { user } = await requireSession();
  return (
    <PageTransition>
      <AccessView data={await getAccessData(user)} />
    </PageTransition>
  );
}
