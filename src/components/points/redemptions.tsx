"use client";

import { Sparkles } from "lucide-react";
import { useFormat, useT } from "@/components/providers/app-provider";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import type { Redemption } from "@/lib/types";

export function Redemptions({ items, fresh }: { items: Redemption[]; fresh: ReadonlySet<string> }) {
  const t = useT();
  const f = useFormat();
  return (
    <Card aria-labelledby="redeem-title" className="flex flex-col">
      <CardHeader id="redeem-title" title={t("points.redemptions")} icon={<Sparkles className="size-4" aria-hidden />} />
      {items.length === 0 ? (
        <EmptyState title={t("common.noResults")} />
      ) : (
        <ul className="max-h-80 space-y-0.5 overflow-y-auto px-3 pb-3">
          {items.map((r) => (
            <li key={r.id} className={cn("flex items-center gap-3 rounded-xl px-2 py-2", fresh.has(r.id) && "motion-safe:animate-slide-in")}>
              <Avatar name={r.memberName} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{r.reward}</span>
                <span className="block truncate text-xs text-ink-3">
                  <bdi>{r.memberName}</bdi> · <TimeAgo at={r.at} />
                </span>
              </span>
              <span className="tabular text-sm font-medium text-ink-2">−{f.n(r.points)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
