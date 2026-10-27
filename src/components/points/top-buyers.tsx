"use client";

import { Crown, Trophy } from "lucide-react";
import { useFormat, useT } from "@/components/providers/app-provider";
import { Card, CardHeader } from "@/components/ui/card";
import { RobloxHeadshot } from "@/components/ui/roblox";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/components/ui/cn";
import type { TopBuyer } from "@/lib/types";

const MEDAL = ["text-yellow-300", "text-slate-200", "text-amber-500"];

export function TopBuyers({ buyers }: { buyers: TopBuyer[] }) {
  const t = useT();
  const f = useFormat();
  const max = Math.max(1, ...buyers.map((b) => b.robux));
  return (
    <Card aria-labelledby="top-title" className="flex flex-col">
      <CardHeader id="top-title" title={t("points.topBuyers")} icon={<Trophy className="size-4" aria-hidden />} />
      {buyers.length === 0 ? (
        <EmptyState art="purchases" title={t("points.feedEmpty")} hint={t("points.feedEmptyHint")} compact />
      ) : (
        <ol className="stagger space-y-2.5 px-4 pb-5">
          {buyers.map((b, i) => (
            <li key={b.robloxName} className="flex items-center gap-3 rounded-xl px-1 py-0.5 transition hover:bg-white/[0.03]">
              <span className="relative">
                <RobloxHeadshot userId={b.robloxId} name={b.robloxName} size={i === 0 ? 44 : 36} className={cn(i === 0 && "drop-shadow-[0_0_12px_rgb(253_224_71/0.35)]")} />
                {i < 3 ? (
                  <Crown aria-hidden className={cn("absolute -top-2 -start-1.5 size-4 fill-current drop-shadow", MEDAL[i])} />
                ) : (
                  <span className="tabular absolute -start-1 -top-1 grid size-4 place-items-center rounded-full bg-surface-2 text-[9px] font-semibold text-ink-3 ring-1 ring-line">{i + 1}</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink" dir="ltr">
                    {b.robloxName}
                  </span>
                  <span className="tabular shrink-0 text-sm font-semibold text-ink">{f.robux(b.robux)}</span>
                </span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                    <span className="block h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-300 rtl:bg-gradient-to-l" style={{ width: `${(b.robux / max) * 100}%` }} />
                  </span>
                  <span className="tabular shrink-0 text-[11px] text-ink-3">
                    {f.n(b.purchases)} · +{f.n(b.points)}
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
