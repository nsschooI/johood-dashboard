import { guard } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

/** Both servers with their identity (icon, banner, counts). Any staff member. */
export const GET = guard({}, async () => {
  const p = getProvider();
  const list = await p.getGuilds();
  return Promise.all(list.map((g) => p.getGuildInfo(g.key)));
});
