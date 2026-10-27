"use client";

import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Coins, Gem, Minus, Sparkles, Star, Wallet, type LucideIcon } from "lucide-react";
import { useFormat, useT } from "@/components/providers/app-provider";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/components/ui/cn";
import { Tooltip } from "@/components/ui/tooltip";
import type { MessageKey } from "@/lib/i18n";
import type { PointsSummary, TotalsBucket } from "@/lib/types";

type Metric = "robux" | "pointsEarned" | "pointsRedeemed";

/** Last 7 days vs the 7 before (fair, unlike a partial "today vs yesterday"). */
function weekDelta(daily: TotalsBucket[], m: Metric): number | null {
  if (daily.length < 14) return null;
  const sum = (xs: TotalsBucket[]) => xs.reduce((s, b) => s + b[m], 0);
  const cur = sum(daily.slice(-7));
  const prev = sum(daily.slice(-14, -7));
  return prev > 0 ? (cur - prev) / prev : null;
}

function Delta({ value }: { value: number | null }) {
  const t = useT();
  const f = useFormat();
  if (value === null) return null;
  const flat = Math.abs(value) < 0.005;
  const up = value > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <Tooltip content={`7d ${t("common.vsLastWeek")}`}>
      <span
        tabIndex={0}
        className={cn(
          "tabular inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
          flat ? "bg-white/[0.05] text-ink-3 ring-line" : up ? "bg-good/10 text-good ring-good/20" : "bg-bad/10 text-bad ring-bad/20",
        )}
      >
        <Icon aria-hidden className="size-3 rtl:-scale-x-100" />
        {f.pct(Math.abs(value))}
      </span>
    </Tooltip>
  );
}

export function Kpis({ summary }: { summary: PointsSummary }) {
  const t = useT();
  const f = useFormat();
  const s = summary.today;
  const yesterday = summary.daily.at(-2);
  const tiles: { label: MessageKey; value: number; format: (n: number) => string; icon: LucideIcon; accent?: boolean; delta?: number | null; sub?: string; hue: string }[] = [
    { label: "points.kpi.robuxToday", value: s.robux, format: f.robux, icon: Gem, accent: true, delta: weekDelta(summary.daily, "robux"), sub: yesterday ? `${t("common.vsYesterday")}: ${f.robux(yesterday.robux)}` : undefined, hue: "from-accent-500/25" },
    { label: "points.kpi.pointsEarned", value: s.pointsEarned, format: f.n, icon: Coins, delta: weekDelta(summary.daily, "pointsEarned"), sub: yesterday ? `${t("common.vsYesterday")}: ${f.n(yesterday.pointsEarned)}` : undefined, hue: "from-amber-400/15" },
    { label: "points.kpi.pointsRedeemed", value: s.pointsRedeemed, format: f.n, icon: Sparkles, delta: weekDelta(summary.daily, "pointsRedeemed"), sub: yesterday ? `${t("common.vsYesterday")}: ${f.n(yesterday.pointsRedeemed)}` : undefined, hue: "from-teal-400/15" },
    { label: "points.kpi.transfers", value: s.transfersCompleted, format: f.n, icon: ArrowLeftRight, hue: "from-sky-400/15" },
    { label: "points.kpi.avgStars", value: s.avgStars ?? 0, format: (n) => (s.avgStars === null ? "—" : n.toFixed(2)), icon: Star, hue: "from-yellow-300/15" },
    { label: "points.kpi.outstanding", value: summary.outstandingPoints, format: f.compact, icon: Wallet, hue: "from-fuchsia-400/15" },
  ];
  return (
    <dl className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {tiles.map(({ label, value, format, icon: Icon, accent, delta, sub, hue }) => (
        <div key={label} className={cn("glass lift relative overflow-hidden rounded-2xl px-4 py-3.5", accent && "ring-1 ring-accent-400/25")}>
          <span aria-hidden className={cn("absolute inset-0 bg-gradient-to-br to-transparent", hue)} />
          <dt className="relative flex items-center gap-1.5 text-xs text-ink-3">
            <span className="grid size-6 place-items-center rounded-lg bg-white/[0.06] text-ink-2 ring-1 ring-white/10">
              <Icon aria-hidden className="size-3.5" />
            </span>
            <span className="truncate">{t(label)}</span>
          </dt>
          <dd className="relative mt-2 flex flex-wrap items-baseline gap-2">
            <CountUp value={value} format={format} className="tabular text-2xl font-semibold tracking-tight text-ink" />
            <Delta value={delta ?? null} />
          </dd>
          {sub && <dd className="tabular relative mt-1 truncate text-[11px] text-ink-3">{sub}</dd>}
        </div>
      ))}
    </dl>
  );
}
