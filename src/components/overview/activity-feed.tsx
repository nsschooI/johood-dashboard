"use client";

import { useMemo, useState } from "react";
import { Radio } from "lucide-react";
import { useT } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { translateDynamic } from "@/lib/i18n";
import type { ActivityItem, ActivityKind } from "@/lib/types";
import { ACTIVITY_ICON, ACTIVITY_TONE } from "./activity-meta";

type Filter = "all" | "purchases" | "transfers" | "bots" | "tickets" | "members";
const FILTER_KINDS: Record<Exclude<Filter, "all">, ActivityKind[]> = {
  purchases: ["purchase", "redeem", "points_adjust"],
  transfers: ["transfer"],
  bots: ["bot", "assistant"],
  tickets: ["ticket"],
  members: ["member_join", "protection"],
};

export function ActivityFeed({ initial }: { initial: ActivityItem[] }) {
  const t = useT();
  const { guild } = useGuild();
  const [items, setItems] = useState(initial);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<Filter>("all");

  // The server already filtered the stream by permission; here we follow the selected server.
  useLiveEvent("activity", (e) => {
    setItems((cur) => [e.data, ...cur.filter((x) => x.id !== e.data.id)].slice(0, 80));
    setFresh((s) => new Set(s).add(e.data.id));
  });

  const inServer = useMemo(() => items.filter((a) => !a.guild || a.guild === guild), [items, guild]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: inServer.length, purchases: 0, transfers: 0, bots: 0, tickets: 0, members: 0 };
    for (const a of inServer) for (const [f, kinds] of Object.entries(FILTER_KINDS)) if (kinds.includes(a.kind)) c[f as Filter]++;
    return c;
  }, [inServer]);
  const shown = (filter === "all" ? inServer : inServer.filter((a) => FILTER_KINDS[filter].includes(a.kind))).slice(0, 40);
  const filters = (["all", "purchases", "transfers", "bots", "tickets", "members"] as const).filter((f) => f === "all" || counts[f] > 0);

  return (
    <Card aria-labelledby="activity-title" className="flex flex-col">
      <CardHeader id="activity-title" title={t("overview.activity")} icon={<Radio className="size-4" aria-hidden />} />
      {filters.length > 2 && (
        <div className="-mt-1 overflow-x-auto px-5 pb-3">
          <Segmented size="sm" label={t("overview.activity")} value={filter} onChange={setFilter} options={filters.map((f) => ({ value: f, label: t(`activityFilter.${f}`) }))} />
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyState art="inbox" title={t("overview.noActivity")} compact />
      ) : (
        <ol className="max-h-[36rem] space-y-0.5 overflow-y-auto px-3 pb-3" aria-live="polite" aria-relevant="additions">
          {shown.map((a) => {
            const Icon = ACTIVITY_ICON[a.kind];
            return (
              <li key={a.id} className={cn("flex items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.03]", fresh.has(a.id) && "motion-safe:animate-slide-in")}>
                <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ring-1", ACTIVITY_TONE[a.tone])}>
                  <Icon aria-hidden className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-ink-2">{translateDynamic(t, `activity.${a.kind}.${a.variant}`, a.params, a.kind)}</p>
                  <TimeAgo at={a.at} className="text-[11px] text-ink-3" />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
