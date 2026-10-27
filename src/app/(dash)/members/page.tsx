import type { Metadata } from "next";
import { MembersView } from "@/components/members/members-view";
import { canSeePage } from "@/lib/permissions";
import { getMembersData } from "@/lib/server/queries";
import { requireSession } from "@/lib/server/session";
import { NoAccess } from "../no-access";

export const metadata: Metadata = { title: "Members & Security" };

export default async function MembersPage() {
  const { user } = await requireSession();
  if (!canSeePage(user, "members")) return <NoAccess />;
  return <MembersView data={await getMembersData(user)} />;
}
