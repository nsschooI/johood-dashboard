"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/icons/icon";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { ItemThumb, RobloxHeadshot } from "@/components/ui/roblox";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import type { PurchaseEvent, Redemption, Transfer } from "@/lib/types";
import { TRANSFER_TONE } from "@/components/points/transfers-table";

type Row = { kind: "purchase"; at: string; id: string; data: PurchaseEvent } | { kind: "transfer"; at: string; id: string; data: Transfer } | { kind: "redemption"; at: string; id: string; data: Redemption };
type Filter = "all" | Row["kind"];

const KIND_ICON: Record<Row["kind"], IconName> = { purchase: "bag", transfer: "transfer", redemption: "sparkles" };
const KIND_TONE: Record<Row["kind"], string> = { purchase: "bg-accent-500 text-white", transfer: "bg-info text-white dark:text-[#04212b]", redemption: "bg-warn text-white dark:text-[#2a1606]" };

/**
 * One stream for the money side of JoHood: purchases from the Roblox game,
 * points → Robux transfers and reward redemptions, newest first, live.
 */
export function LiveStream({ purchases, transfers, redemptions, limit = 12, title, more = true }: { purchases: PurchaseEvent[] | null; transfers: Transfer[] | null; redemptions: Redemption[] | null; limit?: number; title?: string; more?: boolean }) {
  const { t } = useApp();
  const f = useFormat();
  const { href } = useGuild();
  const [rows, setRows] = useState<Row[]>(() => [
    ...(purchases ?? []).map((d) => ({ kind: "purchase" as const, at: d.at, id: `p:${d.id}`, data: d })),
    ...(transfers ?? []).map((d) => ({ kind: "transfer" as const, at: d.at, id: `t:${d.id}`, data: d })),
    ...(redemptions ?? []).map((d) => ({ kind: "redemption" as const, at: d.at, id: `r:${d.id}`, data: d })),
  ]);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<Filter>("all");

  const add = (row: Row) => {
    setRows((cur) => [row, ...cur.filter((x) => x.id !== row.id)]);
    setFresh((s) => new Set(s).add(row.id));
  };
  useLiveEvent("purchase", (e) => purchases && add({ kind: "purchase", at: e.data.at, id: `p:${e.data.id}`, data: e.data }));
  useLiveEvent("transfer", (e) => transfers && add({ kind: "transfer", at: e.data.at, id: `t:${e.data.id}`, data: e.data }));
  useLiveEvent("redemption", (e) => redemptions && add({ kind: "redemption", at: e.data.at, id: `r:${e.data.id}`, data: e.data }));

  const sorted = useMemo(() => [...rows].sort((a, b) => b.at.localeCompare(a.at)), [rows]);
  const shown = (filter === "all" ? sorted : sorted.filter((r) => r.kind === filter)).slice(0, limit);
  const kinds = (["purchase", "transfer", "redemption"] as const).filter((k) => (k === "purchase" ? purchases : k === "transfer" ? transfers : redemptions));

  return (
    <Card aria-labelledby="live-title" className="flex flex-col">
      <CardHeader
        id="live-title"
        icon="pulse"
        title={
          <span className="flex items-center gap-2">
            {title ?? t("home.live.title")}
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-accent-500 opacity-60 motion-safe:animate-ping" />
              <span className="relative size-2 rounded-full bg-accent-500" />
            </span>
          </span>
        }
        description={t("home.live.subtitle")}
        actions={
          kinds.length > 1 && (
            <Segmented
              size="sm"
              label={t("home.live.title")}
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all" as Filter, label: t("home.live.all") },
                ...kinds.map((k) => ({ value: k as Filter, label: t(k === "purchase" ? "home.hour.purchases" : k === "transfer" ? "home.hour.transfers" : "home.hour.rewards") })),
              ]}
            />
          )
        }
      />
      {shown.length === 0 ? (
        <EmptyState art="points" title={t("home.live.empty")} compact />
      ) : (
        <ol className="divide-y divide-line px-2 pb-2" aria-live="polite" aria-relevant="additions">
          {shown.map((r) => (
            <li key={r.id} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", fresh.has(r.id) && "live-in")}>
              <span className="relative shrink-0">
                {r.kind === "purchase" ? (
                  <ItemThumb assetId={r.data.assetId} item={r.data.item} size={40} />
                ) : r.kind === "transfer" ? (
                  <RobloxHeadshot userId={r.data.robloxId} name={r.data.robloxName} size={40} />
                ) : (
                  <Avatar name={r.data.memberName} src={r.data.avatarUrl} size={40} />
                )}
                <span aria-hidden className={cn("absolute -end-1 -bottom-1 grid size-5 place-items-center rounded-full ring-2 ring-surface", KIND_TONE[r.kind])}>
                  <Icon name={KIND_ICON[r.kind]} size={12} />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink-2">
                  <bdi className="font-semibold text-ink">{r.kind === "redemption" ? r.data.memberName : r.data.robloxName}</bdi>{" "}
                  {r.kind === "purchase"
                    ? t("home.live.bought", { item: r.data.item })
                    : r.kind === "transfer"
                      ? t("home.live.converted", { robux: f.robux(r.data.robux) })
                      : t("home.live.redeemed", { reward: r.data.reward })}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">
                  <TimeAgo at={r.at} />
                  {r.kind === "transfer" && (
                    <Badge tone={TRANSFER_TONE[r.data.status]} className="py-0">
                      {t(`points.status.${r.data.status}`)}
                    </Badge>
                  )}
                </p>
              </div>
              <p className="font-display tabular shrink-0 text-end text-sm font-bold">
                {r.kind === "purchase" ? (
                  <>
                    {f.robux(r.data.robux)}
                    <span className="block text-[11px] font-medium text-good">+{f.n(r.data.points)}</span>
                  </>
                ) : r.kind === "transfer" ? (
                  <span className="text-ink-2">−{f.n(r.data.points)}</span>
                ) : (
                  <span className="text-ink-2">−{f.n(r.data.points)}</span>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
      {more && (
      <Link href={href("/activity")} transitionTypes={["nav"]} className="mt-auto flex items-center justify-center gap-1 border-t border-line py-3 text-sm font-semibold text-accent-300 transition hover:bg-surface-2">
        {t("home.live.seeAll")}
        <Icon name="arrowRight" size={16} mirror />
      </Link>
      )}
    </Card>
  );
}
