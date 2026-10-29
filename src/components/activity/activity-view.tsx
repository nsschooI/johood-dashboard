"use client";

import { useState } from "react";
import { Scene } from "@/components/art/scenes";
import { ActivityFeed } from "@/components/overview/activity-feed";
import { LiveStream } from "@/components/overview/live-stream";
import { TransfersTable } from "@/components/points/transfers-table";
import { useT } from "@/components/providers/app-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { ServerChip } from "@/components/shell/server-chip";
import { PageHeader } from "@/components/ui/card";
import { useHashFocus } from "@/lib/client/anchors";
import type { ActivityItem, ActivityKind, Page, PurchaseEvent, Redemption, Transfer } from "@/lib/types";

/** Lines the money stream already shows. */
const EXCLUDE: ActivityKind[] = ["purchase", "transfer", "redeem"];

export interface ActivityData {
  purchases: Page<PurchaseEvent> | null;
  transfers: Page<Transfer> | null;
  redemptions: Page<Redemption> | null;
  activity: ActivityItem[] | null;
}

/** Live: the money stream from the game, every transfer with its status, and the rest of the log. */
export function ActivityView({ data }: { data: ActivityData }) {
  const t = useT();
  const [transfers, setTransfers] = useState(data.transfers?.items ?? []);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  useHashFocus();
  useLiveEvent("transfer", (e) => {
    const x = e.data;
    setTransfers((cur) => {
      const prev = cur.find((c) => c.id === x.id);
      if (!prev) setFresh((s) => new Set(s).add(x.id));
      return prev ? cur.map((c) => (c.id === x.id ? x : c)) : [x, ...cur];
    });
  });
  const money = data.purchases || data.transfers || data.redemptions;
  return (
    <>
      <PageHeader eyebrow={<ServerChip global />} title={t("nav.activity")} subtitle={t("activityPage.subtitle")} art={<Scene name="giveaways" className="-my-2 h-28 w-auto" />} />
      <div className="space-y-6">
        <div className={money && data.activity ? "grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : ""}>
          {money && <LiveStream purchases={data.purchases?.items ?? null} transfers={data.transfers?.items ?? null} redemptions={data.redemptions?.items ?? null} limit={25} title={t("activityPage.stream")} more={false} />}
          {data.activity && <ActivityFeed initial={data.activity} exclude={money ? EXCLUDE : []} title={money ? t("activityPage.log") : undefined} />}
        </div>
        {data.transfers && <TransfersTable initial={data.transfers} live={transfers} fresh={fresh} />}
      </div>
    </>
  );
}
