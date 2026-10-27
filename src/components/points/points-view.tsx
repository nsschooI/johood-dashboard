"use client";

import { useState } from "react";
import { useCan, useFormat, useT } from "@/components/providers/app-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { useSound } from "@/components/providers/sound-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PageHeader } from "@/components/ui/card";
import { dayKey } from "@/lib/time";
import type { Page, PointsSummary, PurchaseEvent, Redemption, Transfer } from "@/lib/types";
import { Kpis } from "./kpis";
import { LedgerPanel } from "./ledger-panel";
import { PurchaseFeed } from "./purchase-feed";
import { Redemptions } from "./redemptions";
import { TopBuyers } from "./top-buyers";
import { TransfersTable } from "./transfers-table";
import { PointsFlowChart, VolumeChart } from "./volume-chart";

export interface PointsData {
  purchases: Page<PurchaseEvent> | null;
  transfers: Page<Transfer> | null;
  redemptions: Page<Redemption> | null;
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

export function PointsView({ data }: { data: PointsData }) {
  const t = useT();
  const f = useFormat();
  const can = useCan();
  const toast = useToast();
  const { play } = useSound();
  const [purchases, setPurchases] = useState(data.purchases?.items ?? []);
  const [transfers, setTransfers] = useState(data.transfers?.items ?? []);
  const [redemptions, setRedemptions] = useState(data.redemptions?.items ?? []);
  const [summary, setSummary] = useState(data.summary);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const markFresh = (id: string) => setFresh((s) => new Set(s).add(id));

  useLiveEvent("purchase", (e) => {
    const p = e.data;
    setPurchases((cur) => [p, ...cur.filter((x) => x.id !== p.id)].slice(0, 60));
    markFresh(p.id);
    setSummary((s) =>
      s
        ? bumpToday(s, p.at, (b) => {
            b.robux += p.robux;
            b.pointsEarned += p.points;
            b.purchases += 1;
          })
        : s,
    );
    play("purchase");
    toast({ tone: "purchase", title: t("points.newPurchase"), description: t("points.purchaseToast", { name: p.robloxName, item: p.item, robux: f.n(p.robux) }) });
  });

  useLiveEvent("transfer", (e) => {
    const x = e.data;
    setTransfers((cur) => {
      const prev = cur.find((c) => c.id === x.id);
      if (!prev) markFresh(x.id);
      if (prev && prev.status !== "completed" && x.status === "completed") {
        setSummary((s) => (s ? { ...s, today: { ...s.today, transfersCompleted: s.today.transfersCompleted + 1 } } : s));
      }
      return prev ? cur.map((c) => (c.id === x.id ? x : c)) : [x, ...cur];
    });
  });

  useLiveEvent("redemption", (e) => {
    const r = e.data;
    setRedemptions((cur) => [r, ...cur.filter((x) => x.id !== r.id)].slice(0, 30));
    markFresh(r.id);
    setSummary((s) => (s ? bumpToday(s, r.at, (b) => void (b.pointsRedeemed += r.points)) : s));
  });

  return (
    <>
      <PageHeader title={t("points.title")} subtitle={t("points.subtitle")} />
      <div className="space-y-6">
        {summary && <Kpis summary={summary} />}

        {summary && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <VolumeChart daily={summary.daily} weekly={summary.weekly} />
            <TopBuyers buyers={summary.topBuyers} />
          </div>
        )}

        {(data.purchases || summary) && (
          <div className={summary ? "grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}>
            {data.purchases && <PurchaseFeed purchases={purchases} fresh={fresh} />}
            {summary && (
              <div className="grid min-w-0 gap-6">
                <PointsFlowChart daily={summary.daily} />
                {data.redemptions && <Redemptions items={redemptions} fresh={fresh} />}
              </div>
            )}
          </div>
        )}

        {data.transfers && <TransfersTable initial={data.transfers} live={transfers} fresh={fresh} />}

        {can("points.view") && <LedgerPanel />}
      </div>
    </>
  );
}
