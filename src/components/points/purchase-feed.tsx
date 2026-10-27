"use client";

import { ShoppingBag } from "lucide-react";
import { useFormat, useT } from "@/components/providers/app-provider";
import { Card, CardHeader } from "@/components/ui/card";
import { Dot } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import type { PurchaseEvent } from "@/lib/types";
import { Table, Td, Th } from "./tables";

export function PurchaseFeed({ purchases, fresh }: { purchases: PurchaseEvent[]; fresh: ReadonlySet<string> }) {
  const t = useT();
  const f = useFormat();
  return (
    <Card aria-labelledby="feed-title" className="flex flex-col overflow-hidden">
      <CardHeader
        id="feed-title"
        title={t("points.liveFeed")}
        icon={<ShoppingBag className="size-4" aria-hidden />}
        actions={
          <span className="flex items-center gap-1.5 text-xs text-ink-3">
            <Dot tone="good" pulse />
            {t("common.live")}
          </span>
        }
      />
      {purchases.length === 0 ? (
        <EmptyState title={t("points.feedEmpty")} />
      ) : (
        <Table label={t("points.liveFeed")} className="max-h-[28rem]">
          <thead>
            <tr>
              <Th>{t("points.col.time")}</Th>
              <Th>{t("points.col.buyer")}</Th>
              <Th>{t("points.col.item")}</Th>
              <Th end>{t("points.col.robux")}</Th>
              <Th end>{t("points.col.points")}</Th>
              <Th end>{t("points.col.cashback")}</Th>
            </tr>
          </thead>
          <tbody aria-live="polite" aria-relevant="additions">
            {purchases.map((p) => (
              <tr key={p.id} className={cn("transition-colors hover:bg-white/[0.02]", fresh.has(p.id) && "motion-safe:animate-slide-in")}>
                <Td className="text-xs whitespace-nowrap text-ink-3">
                  <TimeAgo at={p.at} />
                </Td>
                <Td>
                  <span className="rtl:text-right block font-medium text-ink" dir="ltr">
                    {p.robloxName}
                  </span>
                  {!p.discordId && <span className="text-[11px] text-ink-3">{t("points.unlinked")}</span>}
                </Td>
                <Td className="text-ink-2">{p.item}</Td>
                <Td end className="tabular font-medium whitespace-nowrap text-ink">
                  {f.robux(p.robux)}
                </Td>
                <Td end className="tabular whitespace-nowrap text-accent-300">
                  +{f.n(p.points)}
                </Td>
                <Td end className="tabular text-ink-3">
                  {f.pct(p.cashbackRate)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
