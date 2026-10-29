"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { RANK_TEXT, RankIcon } from "@/components/art/rank-icon";
import { Icon, type IconName } from "@/components/icons/icon";
import { useApp, useCan, useFormat } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { MemberBadge } from "@/components/people/member-badge";
import { TRANSFER_TONE } from "@/components/points/transfers-table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { CopyButton } from "@/components/ui/copy-button";
import { Modal } from "@/components/ui/modal";
import { ItemThumb, RobloxHeadshot } from "@/components/ui/roblox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { api, qs } from "@/lib/client/api";
import { useLoad } from "@/lib/client/use-load";
import type { LinkedPlayer, MemberProfile, NumberedPage, Page, PurchaseEvent, Redemption, Transfer } from "@/lib/types";

/** Everything about one linked player: their Roblox account, spending, transfers and rewards. */
export function PlayerDrawer({ discordId, onClose }: { discordId: string; onClose: () => void }) {
  const { t } = useApp();
  const f = useFormat();
  const can = useCan();
  const { guild, href } = useGuild();
  const profile = useLoad(`p:${guild}:${discordId}`, (signal) => api<MemberProfile>(`/api/members/${discordId}${qs({ guild })}`, { signal }));
  // The linked row carries the purchase totals; searching by Discord ID finds exactly that person.
  const row = useLoad(`r:${guild}:${discordId}`, (signal) =>
    api<NumberedPage<LinkedPlayer>>(`/api/roblox/linked${qs({ q: discordId, guild, pageSize: 5 })}`, { signal }).then((p) => p.items.find((x) => x.discordId === discordId) ?? null),
  );
  const purchases = useLoad(can("purchases.view") ? `pu:${discordId}` : null, (signal) => api<Page<PurchaseEvent>>(`/api/purchases${qs({ discordId, limit: 12 })}`, { signal }));
  const transfers = useLoad(can("transfers.view") ? `tr:${discordId}` : null, (signal) => api<Page<Transfer>>(`/api/transfers${qs({ discordId, limit: 8 })}`, { signal }));
  const redemptions = useLoad(can("points.view") ? `re:${discordId}` : null, (signal) => api<Page<Redemption>>(`/api/redemptions${qs({ discordId, limit: 8 })}`, { signal }));

  const p = profile.data;
  const link = p?.roblox ?? (row.data ? { robloxId: row.data.robloxId, robloxName: row.data.robloxName, verifiedAt: row.data.linkedAt } : null);

  return (
    <Modal open onClose={onClose} variant="drawer" className="sm:max-w-xl" title={t("rbx.drawerTitle")}>
      {profile.error && !profile.notFound ? (
        <ErrorState title={t("common.error")} action={<Button onClick={profile.reload}>{t("common.retry")}</Button>} />
      ) : profile.notFound ? (
        <EmptyState art="search" title={t("rbx.notFound")} />
      ) : !p ? (
        <div className="space-y-3" aria-busy>
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-5 animate-fade-in">
          {/* Roblox account + the Discord member it belongs to */}
          <section className="overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-inset ring-line">
            <div className="flex items-center gap-4 p-4">
              {link ? <RobloxHeadshot userId={link.robloxId} name={link.robloxName} size={72} /> : <Avatar name={p.displayName} src={p.avatarUrl} size={72} />}
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-xl font-bold" dir="ltr">
                  {link?.robloxName ?? t("members.notLinked")}
                </p>
                {link && (
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                    <span className="inline-flex items-center gap-1" dir="ltr">
                      #{link.robloxId}
                      <CopyButton value={link.robloxId} label={t("menu.copyRoblox")} className="size-5" />
                    </span>
                    <span>{t("rbx.linkedOn", { date: f.date(link.verifiedAt) })}</span>
                  </p>
                )}
              </div>
            </div>
            <Link
              href={href("/members", { member: p.discordId })}
              transitionTypes={["nav"]}
              className="flex items-center gap-3 border-t border-line px-4 py-2.5 text-sm transition hover:bg-surface-3/60"
            >
              <Avatar name={p.displayName} src={p.avatarUrl} size={28} />
              <bdi className="min-w-0 truncate font-medium">{p.displayName}</bdi>
              <MemberBadge badge={p.badge} />
              <span className="ms-auto inline-flex items-center gap-1 text-xs font-semibold text-accent-300">
                {t("rbx.openMember")}
                <Icon name="arrowRight" size={14} mirror />
              </span>
            </Link>
          </section>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label={t("rbx.col.purchases")} value={row.data ? f.n(row.data.purchases) : "—"} />
            <Tile label={t("rbx.col.spent")} value={row.data ? f.robux(row.data.spentRobux) : "—"} />
            <Tile label={t("rbx.col.points")} value={p.points !== null ? f.n(p.points) : "—"} />
            <div className="rounded-xl bg-surface-2 px-3 py-2 ring-1 ring-inset ring-line">
              <dt className="text-[11px] text-ink-3">{t("rbx.gameRank")}</dt>
              <dd className={cn("font-display mt-0.5 flex items-center gap-1.5 text-sm font-bold", RANK_TEXT[p.rank])}>
                <RankIcon rank={p.rank} size={20} />
                {t(`members.rankName.${p.rank}`)}
              </dd>
            </div>
          </dl>

          {purchases.data && (
            <Section icon="bag" title={t("members.purchases")} empty={purchases.data.items.length === 0 ? t("members.noPurchases") : null}>
              <ul className="grid gap-2 sm:grid-cols-2">
                {purchases.data.items.map((x) => (
                  <li key={x.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-2">
                    <ItemThumb assetId={x.assetId} item={x.item} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{x.item}</span>
                      <TimeAgo at={x.at} className="text-[11px] text-ink-3" />
                    </span>
                    <span className="text-end">
                      <span className="font-display tabular block text-sm font-bold">{f.robux(x.robux)}</span>
                      <span className="tabular block text-[11px] font-semibold text-good">+{f.n(x.points)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {transfers.data && (
            <Section icon="transfer" title={t("rbx.transfers")} empty={transfers.data.items.length === 0 ? t("rbx.noTransfers") : null}>
              <ul className="divide-y divide-line">
                {transfers.data.items.map((x) => (
                  <li key={x.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="tabular font-medium">{f.n(x.points)}</span>
                    <Icon name="arrowRight" size={14} mirror className="text-ink-3" />
                    <span className="font-display tabular font-bold">{f.robux(x.robux)}</span>
                    <Badge tone={TRANSFER_TONE[x.status]}>{t(`points.status.${x.status}`)}</Badge>
                    <TimeAgo at={x.at} className="ms-auto text-xs text-ink-3" />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {redemptions.data && (
            <Section icon="party" title={t("rbx.redemptions")} empty={redemptions.data.items.length === 0 ? t("rbx.noRedemptions") : null}>
              <ul className="divide-y divide-line">
                {redemptions.data.items.map((x) => (
                  <li key={x.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{x.reward}</span>
                    <span className="tabular font-semibold text-ink-2">−{f.n(x.points)}</span>
                    <TimeAgo at={x.at} className="w-24 text-end text-xs text-ink-3" />
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </Modal>
  );
}

function Tile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2 ring-1 ring-inset ring-line">
      <dt className="truncate text-[11px] text-ink-3">{label}</dt>
      <dd className="font-display tabular mt-0.5 truncate text-lg font-bold">{value}</dd>
    </div>
  );
}

function Section({ icon, title, empty, children }: { icon: IconName; title: string; empty: string | null; children: ReactNode }) {
  return (
    <section>
      <h3 className="font-display mb-2 flex items-center gap-2 text-sm font-semibold text-ink-2">
        <Icon name={icon} size={16} duo className="text-accent-400" />
        {title}
      </h3>
      {empty ? <p className="rounded-xl bg-surface-2 px-3 py-3 text-sm text-ink-3">{empty}</p> : children}
    </section>
  );
}
