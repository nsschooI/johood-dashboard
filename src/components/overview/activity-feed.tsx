"use client";

import { useState } from "react";
import { Bot, Coins, Headphones, LifeBuoy, Radio, ShieldAlert, ShoppingBag, Sparkles, UserPlus, ArrowLeftRight, type LucideIcon } from "lucide-react";
import { useT } from "@/components/providers/app-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { translateDynamic } from "@/lib/i18n";
import type { ActivityItem, ActivityKind } from "@/lib/types";

const ICON: Record<ActivityKind, LucideIcon> = {
  purchase: ShoppingBag,
  transfer: ArrowLeftRight,
  redeem: Sparkles,
  points_adjust: Coins,
  bot: Bot,
  assistant: Headphones,
  member_join: UserPlus,
  ticket: LifeBuoy,
  protection: ShieldAlert,
};

const TONE: Record<ActivityItem["tone"], string> = {
  neutral: "bg-white/[0.05] text-ink-2 ring-line",
  success: "bg-good/10 text-good ring-good/20",
  warning: "bg-warn/10 text-warn ring-warn/20",
  danger: "bg-bad/10 text-bad ring-bad/20",
};

export function ActivityFeed({ initial }: { initial: ActivityItem[] }) {
  const t = useT();
  const [items, setItems] = useState(initial);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());

  // The server already filtered the stream by permission.
  useLiveEvent("activity", (e) => {
    setItems((cur) => [e.data, ...cur.filter((x) => x.id !== e.data.id)].slice(0, 40));
    setFresh((s) => new Set(s).add(e.data.id));
  });

  return (
    <Card aria-labelledby="activity-title" className="flex flex-col">
      <CardHeader id="activity-title" title={t("overview.activity")} icon={<Radio className="size-4" aria-hidden />} />
      {items.length === 0 ? (
        <EmptyState title={t("overview.noActivity")} />
      ) : (
        <ol className="max-h-[34rem] space-y-1 overflow-y-auto px-3 pb-3" aria-live="polite" aria-relevant="additions">
          {items.map((a) => {
            const Icon = ICON[a.kind];
            return (
              <li key={a.id} className={cn("flex items-start gap-3 rounded-xl px-2 py-2", fresh.has(a.id) && "motion-safe:animate-slide-in")}>
                <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ring-1", TONE[a.tone])}>
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
