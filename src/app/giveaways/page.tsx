import { GiveawaysListView } from "@/components/giveaways/list-view";
import { sortGiveaways } from "@/lib/giveaways/types";
import { getProvider } from "@/lib/provider";

async function load() {
  const list = sortGiveaways(await getProvider().giveaways.list());
  // Countdowns start from the server's clock so the first paint matches.
  return { list, now: Date.now() };
}

export default async function GiveawaysPage() {
  const { list, now } = await load();
  return <GiveawaysListView initial={list} serverNow={now} />;
}
