"use client";

import { Trophy } from "lucide-react";
import { useFormat, useT } from "@/components/providers/app-provider";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import type { TopBuyer } from "@/lib/types";

export function TopBuyers({ buyers }: { buyers: TopBuyer[] }) {
  const t = useT();
  const f = useFormat();
  const max = Math.max(1, ...buyers.map((b) => b.robux));
  return (
    <Card aria-labelledby="top-title" className="flex flex-col">
      <CardHeader id="top-title" title={t("points.topBuyers")} icon={<Trophy className="size-4" aria-hidden />} />
      {buyers.length === 0 ? (
        <EmptyState title={t("common.noResults")} />
      ) : (
        <ol className="space-y-3 px-5 pb-5">
          {buyers.map((b, i) => (
            <li key={b.robloxName} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
              <span className="tabular text-xs font-semibold text-ink-3">{i + 1}</span>
              <span className="rtl:text-right truncate text-sm font-medium text-ink" dir="ltr">
                {b.robloxName}
              </span>
              <span className="tabular text-sm font-medium text-ink">{f.robux(b.robux)}</span>
              <span />
              <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                <span className="block h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400 rtl:bg-gradient-to-l" style={{ width: `${(b.robux / max) * 100}%` }} />
              </span>
              <span className="tabular text-[11px] text-ink-3">
                {f.n(b.purchases)} · +{f.n(b.points)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
