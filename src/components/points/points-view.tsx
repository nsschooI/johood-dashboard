"use client";

import { useState } from "react";
import { Scene } from "@/components/art/scenes";
import { useCan, useT } from "@/components/providers/app-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { PageHeader } from "@/components/ui/card";
import { ServerChip } from "@/components/shell/server-chip";
import { useHashFocus } from "@/lib/client/anchors";
import { dayKey } from "@/lib/time";
import type { PointsSummary } from "@/lib/types";
import { Kpis } from "./kpis";
import { LedgerPanel } from "./ledger-panel";
import { TopBuyers } from "./top-buyers";
import { PointsFlowChart, VolumeChart } from "./volume-chart";

export interface PointsData {
  summary: PointsSummary | null;
}

type Totals = { robux: number; pointsEarned: number; pointsRedeemed: number; purchases: number };

/** Apply a live change to today's daily bucket, this week's bucket and the KPIs. */
function bumpToday(s: PointsSummary, at: string, apply: (b: Totals) => void): PointsSummary {
  const day = dayKey(at);
  const daily = s.daily.map((b) => (b.start === day ? { ...b } : b));
  const d = daily.find((b) => b.start === day);
  if (d) apply(d);
  const weekly = s.weekly.map((b, i) => (i === s.weekly.length - 1 ? { ...b } : b));
  if (weekly.length) apply(weekly[weekly.length - 1]);
  const today = { ...s.today };
  if (day === dayKey(Date.now())) apply(today);
  return { ...s, daily, weekly, today };
}

/** The economy: today's numbers, the trend, top buyers and every member's ledger. */
export function PointsView({ data }: { data: PointsData }) {
  const t = useT();
  const can = useCan();
  const [summary, setSummary] = useState(data.summary);
  useHashFocus();

  useLiveEvent("purchase", (e) => {
    const p = e.data;
    setSummary((s) =>
      s
        ? bumpToday(s, p.at, (b) => {
            b.robux += p.robux;
            b.pointsEarned += p.points;
            b.purchases += 1;
          })
        : s,
    );
  });
  useLiveEvent("transfer", (e) => {
    if (e.data.status !== "completed") return;
    setSummary((s) => (s ? { ...s, today: { ...s.today, transfersCompleted: s.today.transfersCompleted + 1 } } : s));
  });
  useLiveEvent("redemption", (e) => {
    const r = e.data;
    setSummary((s) => (s ? bumpToday(s, r.at, (b) => void (b.pointsRedeemed += r.points)) : s));
  });

  return (
    <>
      <PageHeader eyebrow={<ServerChip global />} title={t("nav.points")} subtitle={t("pointsPage.subtitle")} art={<Scene name="points" className="-my-2 h-28 w-auto" />} />
      <div className="space-y-6">
        {summary && <Kpis summary={summary} />}
        {summary && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <VolumeChart daily={summary.daily} weekly={summary.weekly} />
            <TopBuyers buyers={summary.topBuyers} />
          </div>
        )}
        {summary && <PointsFlowChart daily={summary.daily} />}
        {can("points.view") && <LedgerPanel />}
      </div>
    </>
  );
}
