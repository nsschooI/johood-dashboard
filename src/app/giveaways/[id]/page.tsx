import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { GiveawayDetailView } from "@/components/giveaways/detail-view";
import { getProvider } from "@/lib/provider";
import { getMemberSession } from "@/lib/server/member-session";

const load = cache(async (idParam: string) => {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0 || id > 1e9) return null;
  const session = await getMemberSession();
  const g = await getProvider().giveaways.get(id, session?.member.id);
  return g ? { g, now: Date.now() } : null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const found = await load((await params).id);
  return { title: found?.g.prize ?? "Giveaway" };
}

export default async function GiveawayPage({ params }: { params: Promise<{ id: string }> }) {
  const found = await load((await params).id);
  if (!found) notFound();
  return <GiveawayDetailView key={found.g.id} initial={found.g} serverNow={found.now} />;
}
