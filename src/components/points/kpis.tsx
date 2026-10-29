"use client";

import type { IconName } from "@/components/icons/icon";
import { useFormat, useT } from "@/components/providers/app-provider";
import { StatTile } from "@/components/ui/stat-tile";
import type { MessageKey } from "@/lib/i18n";
import type { PointsSummary, TotalsBucket } from "@/lib/types";

type Metric = "robux" | "pointsEarned" | "pointsRedeemed";

/** Last 7 days vs the 7 before (fair, unlike a partial "today vs yesterday"). */
export function weekDelta(daily: TotalsBucket[], m: Metric): number | null {
  if (daily.length < 14) return null;
  const sum = (xs: TotalsBucket[]) => xs.reduce((s, b) => s + b[m], 0);
  const cur = sum(daily.slice(-7));
  const prev = sum(daily.slice(-14, -7));
  return prev > 0 ? (cur - prev) / prev : null;
}

export function Kpis({ summary }: { summary: PointsSummary }) {
  const t = useT();
  const f = useFormat();
  const s = summary.today;
  const yesterday = summary.daily.at(-2);
  const delta = (v: number | null, goodWhenUp = true) =>
    v === null ? null : { value: f.pct(Math.abs(v)), direction: Math.abs(v) < 0.005 ? ("flat" as const) : v > 0 ? ("up" as const) : ("down" as const), good: v > 0 === goodWhenUp };
  const tiles: { label: MessageKey; value: number | null; format: (n: number) => string; icon: IconName; tone: "accent" | "good" | "warn" | "info"; delta?: ReturnType<typeof delta>; foot?: string }[] = [
    { label: "points.kpi.robuxToday", value: s.robux, format: f.robux, icon: "robux", tone: "accent", delta: delta(weekDelta(summary.daily, "robux")), foot: yesterday ? `${t("common.vsYesterday")}: ${f.robux(yesterday.robux)}` : undefined },
    { label: "points.kpi.pointsEarned", value: s.pointsEarned, format: f.n, icon: "coin", tone: "warn", delta: delta(weekDelta(summary.daily, "pointsEarned")), foot: yesterday ? `${t("common.vsYesterday")}: ${f.n(yesterday.pointsEarned)}` : undefined },
    { label: "points.kpi.pointsRedeemed", value: s.pointsRedeemed, format: f.n, icon: "sparkles", tone: "info", delta: delta(weekDelta(summary.daily, "pointsRedeemed")), foot: yesterday ? `${t("common.vsYesterday")}: ${f.n(yesterday.pointsRedeemed)}` : undefined },
    { label: "points.kpi.transfers", value: s.transfersCompleted, format: f.n, icon: "transfer", tone: "good" },
    { label: "points.kpi.avgStars", value: s.avgStars, format: (n) => n.toFixed(2), icon: "star", tone: "warn" },
    { label: "points.kpi.outstanding", value: summary.outstandingPoints, format: f.compact, icon: "wallet", tone: "accent" },
  ];
  return (
    <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {tiles.map((x) => (
        <StatTile key={x.label} label={t(x.label)} value={x.value} format={x.format} icon={x.icon} tone={x.tone} delta={x.delta} foot={x.foot} />
      ))}
    </div>
  );
}
