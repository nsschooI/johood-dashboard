"use client";

import { useMemo, useState } from "react";
import { Bot, Headphones } from "lucide-react";
import { useT } from "@/components/providers/app-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { PageHeader } from "@/components/ui/card";
import { ServerChip } from "@/components/shell/server-chip";
import { TicketQueue } from "@/components/tickets/ticket-queue";
import { useHashFocus } from "@/lib/client/anchors";
import type { ActivityItem, Assistant, BotName, BotStatus, ServerStats, TicketSummary } from "@/lib/types";
import { ActivityFeed } from "./activity-feed";
import { AssistantCard } from "./assistant-card";
import { AttentionStrip } from "./attention-strip";
import { BotCard } from "./bot-card";
import { LogsDrawer } from "./logs-drawer";
import { ServerCard } from "./server-card";

export interface OverviewData {
  bots: BotStatus[] | null;
  assistants: Assistant[] | null;
  stats: ServerStats | null;
  activity: ActivityItem[] | null;
  tickets: TicketSummary[] | null;
}

function SectionTitle({ icon, children, id, count }: { icon: React.ReactNode; children: React.ReactNode; id: string; count?: number }) {
  return (
    <h2 id={id} className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-2">
      <span className="text-accent-300">{icon}</span>
      {children}
      {count !== undefined && <span className="tabular rounded-full bg-white/[0.06] px-2 text-xs text-ink-3">{count}</span>}
    </h2>
  );
}

export function OverviewView({ data }: { data: OverviewData }) {
  const t = useT();
  const [bots, setBots] = useState(data.bots);
  const [assistants, setAssistants] = useState(data.assistants);
  const [logsFor, setLogsFor] = useState<BotName | null>(null);
  useHashFocus();

  useLiveEvent("bot", (e) => setBots((cur) => cur?.map((b) => (b.name === e.data.name ? e.data : b)) ?? cur));
  useLiveEvent("assistant", (e) => setAssistants((cur) => cur?.map((a) => (a.bot === e.data.bot ? e.data : a)) ?? cur));

  const core = useMemo(() => bots?.filter((b) => b.kind === "core") ?? [], [bots]);
  const byName = useMemo(() => new Map(bots?.map((b) => [b.name, b])), [bots]);
  const online = core.filter((b) => b.state === "online").length;
  const side = data.activity !== null || data.tickets !== null;

  return (
    <>
      <PageHeader eyebrow={<ServerChip />} title={t("overview.title")} subtitle={t("overview.subtitle")} />

      <div className="space-y-6">
        <AttentionStrip />
        {data.stats && <ServerCard initial={data.stats} />}

        <div className={side ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px]" : ""}>
          <div className="@container min-w-0 space-y-8">
            {assistants && (
              <section aria-labelledby="assistants-title">
                <SectionTitle id="assistants-title" icon={<Headphones className="size-4" aria-hidden />} count={assistants.filter((a) => a.state === "busy").length}>
                  {t("overview.assistants")}
                </SectionTitle>
                <div className="stagger grid gap-3 @lg:grid-cols-2 @4xl:grid-cols-3">
                  {assistants.map((a) => {
                    const bot = byName.get(a.bot);
                    return bot ? <AssistantCard key={a.bot} assistant={a} bot={bot} /> : null;
                  })}
                </div>
              </section>
            )}

            {bots && (
              <section aria-labelledby="bots-title">
                <SectionTitle id="bots-title" icon={<Bot className="size-4" aria-hidden />} count={online}>
                  {t("overview.bots")}
                </SectionTitle>
                <div className="stagger grid gap-3 @lg:grid-cols-2 @5xl:grid-cols-3">
                  {core.map((b) => (
                    <BotCard key={b.name} bot={b} onLogs={() => setLogsFor(b.name)} />
                  ))}
                </div>
              </section>
            )}

            {data.tickets && !bots && !assistants && <TicketQueue initial={data.tickets} />}
          </div>

          {side && (
            <div className="min-w-0 space-y-6">
              {data.tickets && (bots || assistants) && <TicketQueue initial={data.tickets} />}
              {data.activity && <ActivityFeed initial={data.activity} />}
            </div>
          )}
        </div>
      </div>

      <LogsDrawer bot={logsFor ? (byName.get(logsFor) ?? null) : null} onClose={() => setLogsFor(null)} />
    </>
  );
}
