"use client";

import Link from "next/link";
import { Trophy, Users } from "lucide-react";
import { useT, useFormat } from "@/components/providers/app-provider";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/components/ui/cn";
import type { Giveaway } from "@/lib/giveaways/types";
import { GiveawayBanner } from "./banner";
import { Countdown } from "./countdown";
import { RequirementChips } from "./requirements";

export function StatusPill({ ended, className }: { ended: boolean; className?: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        ended ? "bg-ink-3/15 text-ink-2" : "bg-[#e11d48] text-white shadow-[0_6px_16px_-8px_#e11d48]",
        className,
      )}
    >
      {!ended && (
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/80 motion-reduce:hidden" />
          <span className="relative size-2 rounded-full bg-white" />
        </span>
      )}
      {ended ? t("gw.ended") : t("gw.running")}
    </span>
  );
}

/** Big animated card for a running giveaway. */
export function RunningCard({ g, serverNow, onEnd }: { g: Giveaway; serverNow: number; onEnd?: () => void }) {
  const t = useT();
  const f = useFormat();
  return (
    <Link
      href={`/giveaways/${g.id}`}
      transitionTypes={["nav"]}
      className="gw-card gw-running gw-lift group flex w-full flex-col overflow-hidden focus-visible:outline-offset-4"
    >
      <div className="relative">
        <GiveawayBanner g={g} size="card" className="aspect-[16/7] w-full" />
        <StatusPill ended={false} className="absolute start-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <h3 className="text-lg leading-snug font-bold text-balance sm:text-xl">
          <bdi>{g.prize}</bdi>
        </h3>
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-3">{t("gw.endsIn")}</p>
          <Countdown endsAt={g.endsAt} serverNow={serverNow} size="card" onEnd={onEnd} />
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-[var(--gw-cream)] px-3 py-2">
            <dt className="flex items-center gap-1 text-xs text-ink-3">
              <Users aria-hidden className="size-3.5" />
              {t("gw.entries")}
            </dt>
            <dd className="tabular text-base font-bold">
              <CountUp value={g.entries} format={f.n} />
            </dd>
          </div>
          <div className="rounded-xl bg-[var(--gw-cream)] px-3 py-2">
            <dt className="flex items-center gap-1 text-xs text-ink-3">
              <Trophy aria-hidden className="size-3.5" />
              {t("gw.winnersCount")}
            </dt>
            <dd className="tabular text-base font-bold">{f.n(g.winnersCount)}</dd>
          </div>
        </dl>
        <div className="mt-auto">
          <RequirementChips g={g} />
        </div>
      </div>
    </Link>
  );
}

/** Muted card for a finished giveaway. */
export function EndedCard({ g }: { g: Giveaway }) {
  const t = useT();
  const f = useFormat();
  return (
    <Link href={`/giveaways/${g.id}`} transitionTypes={["nav"]} className="gw-card gw-ended gw-lift flex gap-3 overflow-hidden p-2.5 focus-visible:outline-offset-4">
      <GiveawayBanner g={g} size="thumb" className="aspect-square w-20 shrink-0 rounded-2xl sm:w-24" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-1 pe-2">
        <h3 className="truncate font-semibold text-ink-2">
          <bdi>{g.prize}</bdi>
        </h3>
        <p className="text-xs text-ink-3">{t("gw.endedOn", { date: f.date(g.endsAt) })}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1">
            <Trophy aria-hidden className="size-3.5" />
            {g.winners.length === 1 ? t("gw.winner1") : t("gw.winnersN", { n: f.n(g.winners.length) })}
          </span>
          <span className="tabular inline-flex items-center gap-1">
            <Users aria-hidden className="size-3.5" />
            {f.n(g.entries)}
          </span>
        </p>
      </div>
    </Link>
  );
}
