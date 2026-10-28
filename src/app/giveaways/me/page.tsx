import type { Metadata } from "next";
import { MeView } from "@/components/giveaways/me-view";
import { sortGiveaways } from "@/lib/giveaways/types";
import { getProvider } from "@/lib/provider";
import { getMemberSession } from "@/lib/server/member-session";

export const metadata: Metadata = { title: "My page · صفحتي" };

export default async function MyGiveawaysPage() {
  const session = await getMemberSession();
  if (!session) return <MeView authorized={false} joined={[]} />;
  const api = getProvider().giveaways;
  const memberId = session.member.id;
  const [state, list] = await Promise.all([api.authorizeState(memberId), api.list()]);
  // The contract has no "my giveaways" call: read each one with the member's view.
  const mine = await Promise.all(list.map((g) => api.get(g.id, memberId)));
  const joined = sortGiveaways(mine.filter((g): g is NonNullable<typeof g> => Boolean(g?.joined)));
  return <MeView authorized={state.authorized} joined={joined} />;
}
