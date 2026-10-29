"use client";

import { useState } from "react";
import { Scene } from "@/components/art/scenes";
import { useApp } from "@/components/providers/app-provider";
import { useAttention } from "@/components/providers/attention-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { ServerChip } from "@/components/shell/server-chip";
import { PageHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { useHashFocus } from "@/lib/client/anchors";
import { DASHBOARD_TIMEZONE } from "@/lib/time";
import type { ActivityItem, Assistant, BotStatus, PurchaseEvent, Redemption, ServerStats, TicketSummary, Transfer } from "@/lib/types";
import { AssistantsList } from "./assistants-list";
import { AttentionStrip } from "./attention-strip";
import { LiveStream } from "./live-stream";
import { BotsPulse, HourPulse, ServerPulse, WaitingPulse } from "./pulse";
import { TicketsWaiting } from "./tickets-waiting";

export interface OverviewData {
  bots: BotStatus[] | null;
  assistants: Assistant[] | null;
  stats: ServerStats | null;
  activity: ActivityItem[] | null;
  tickets: TicketSummary[] | null;
  purchases: PurchaseEvent[] | null;
  transfers: Transfer[] | null;
  redemptions: Redemption[] | null;
  now: number;
}

function greetingKey(now: number) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: DASHBOARD_TIMEZONE }).format(now));
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

/**
 * The overview answers four questions in five seconds — are the bots
 * healthy, is anything waiting for me, what happened in the last hour, how
 * is the server — then shows the live stream and the queue behind them.
 */
export function OverviewView({ data }: { data: OverviewData }) {
  const { t, user } = useApp();
  const { items } = useAttention();
  const [bots, setBots] = useState(data.bots);
  const [stats, setStats] = useState(data.stats);
  useHashFocus();
  useLiveEvent("bot", (e) => setBots((cur) => cur?.map((b) => (b.name === e.data.name ? e.data : b)) ?? cur));
  useLiveEvent("stats", (e) => setStats((cur) => (cur && (e.data.guild ?? "main") === (cur.guild ?? "main") ? e.data : cur)));

  const critical = items.some((i) => i.severity === "critical");
  const mood = critical ? "worried" : items.length ? "calm" : "happy";
  const name = user?.name.split(" ")[0] ?? "";
  const money = data.purchases || data.transfers || data.redemptions;
  const pulses = [bots && "bots", (data.tickets || data.assistants) && "waiting", money && "hour", stats && "server"].filter(Boolean).length;
  const side = data.tickets || data.assistants;

  return (
    <>
      <PageHeader
        eyebrow={<ServerChip />}
        title={t(`shell.greeting.${greetingKey(data.now)}`, { name })}
        subtitle={t("home.subtitle")}
        art={<Scene name={mood === "worried" ? "botDown" : mood === "happy" ? "allClear" : "welcome"} className="-my-2 h-28 w-auto" />}
      />

      <div className="space-y-6">
        <AttentionStrip />

        {pulses > 0 && (
          <div className={cn("stagger grid gap-4 sm:grid-cols-2", pulses >= 4 ? "xl:grid-cols-4" : pulses === 3 ? "xl:grid-cols-3" : "")}>
            {bots && <BotsPulse bots={bots} />}
            {(data.tickets || data.assistants) && <WaitingPulse tickets={data.tickets} assistants={data.assistants} now={data.now} />}
            {money && <HourPulse purchases={data.purchases} transfers={data.transfers} redemptions={data.redemptions} now={data.now} />}
            {stats && <ServerPulse stats={stats} />}
          </div>
        )}

        {(money || side) && (
          <div className={cn("grid items-start gap-6", money && side && "xl:grid-cols-[minmax(0,1fr)_380px]")}>
            {money && <LiveStream purchases={data.purchases} transfers={data.transfers} redemptions={data.redemptions} />}
            {side && (
              <div className={cn("grid gap-6", !money && "md:grid-cols-2")}>
                {data.tickets && <TicketsWaiting initial={data.tickets} />}
                {data.assistants && <AssistantsList initial={data.assistants} />}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
