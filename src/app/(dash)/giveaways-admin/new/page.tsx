import type { Metadata } from "next";
import { CreateGiveawayView } from "@/components/giveaways-admin/create-view";
import { PageTransition } from "@/components/shell/page-transition";
import { can } from "@/lib/permissions";
import { getProvider } from "@/lib/provider";
import { requireSession } from "@/lib/server/session";
import type { ChannelOption } from "@/lib/giveaways/admin";
import { NoAccess } from "../../no-access";

export const metadata: Metadata = { title: "Start a giveaway" };

async function load(): Promise<{ channels: ChannelOption[]; now: number }> {
  const channels = await getProvider().adminGiveaways.channels();
  return { channels, now: Date.now() };
}

/** Only Owner and Founders (giveaways.manage) may start a giveaway. */
export default async function NewGiveawayPage() {
  const { user } = await requireSession();
  if (!can(user, "giveaways.manage")) return <NoAccess />;
  const { channels, now } = await load();
  return (
    <PageTransition>
      <CreateGiveawayView channels={channels} now={now} />
    </PageTransition>
  );
}
