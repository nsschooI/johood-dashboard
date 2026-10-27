"use client";

import { ArrowLeftRight, Coins, Gem, Sparkles, Star, Wallet, type LucideIcon } from "lucide-react";
import { useFormat, useT } from "@/components/providers/app-provider";
import type { MessageKey } from "@/lib/i18n";
import type { PointsSummary } from "@/lib/types";

export function Kpis({ summary }: { summary: PointsSummary }) {
  const t = useT();
  const f = useFormat();
  const s = summary.today;
  const tiles: { label: MessageKey; value: string; icon: LucideIcon; accent?: boolean }[] = [
    { label: "points.kpi.robuxToday", value: f.robux(s.robux), icon: Gem, accent: true },
    { label: "points.kpi.pointsEarned", value: f.n(s.pointsEarned), icon: Coins },
    { label: "points.kpi.pointsRedeemed", value: f.n(s.pointsRedeemed), icon: Sparkles },
    { label: "points.kpi.transfers", value: f.n(s.transfersCompleted), icon: ArrowLeftRight },
    { label: "points.kpi.avgStars", value: s.avgStars !== null ? `${s.avgStars.toFixed(2)} ★` : "—", icon: Star },
    { label: "points.kpi.outstanding", value: f.compact(summary.outstandingPoints), icon: Wallet },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {tiles.map(({ label, value, icon: Icon, accent }) => (
        <div
          key={label}
          className={
            accent
              ? "glass relative overflow-hidden rounded-2xl px-4 py-3.5 before:absolute before:inset-0 before:bg-gradient-to-br before:from-accent-500/20 before:to-transparent"
              : "glass rounded-2xl px-4 py-3.5"
          }
        >
          <dt className="relative flex items-center gap-1.5 text-xs text-ink-3">
            <Icon aria-hidden className="size-3.5" />
            {t(label)}
          </dt>
          <dd className="tabular relative mt-1.5 text-2xl font-semibold tracking-tight text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
