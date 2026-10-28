"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, Trophy, Users } from "lucide-react";
import { useFormat, useT } from "@/components/providers/app-provider";
import { Avatar } from "@/components/ui/avatar";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/components/ui/cn";
import { gwFetch, safeDiscordUrl, usePoll } from "@/lib/giveaways/client";
import type { Giveaway } from "@/lib/giveaways/types";
import { GiveawayBanner } from "./banner";
import { Countdown } from "./countdown";
import { StatusPill } from "./giveaway-card";
import { useGw } from "./gw-provider";
import { RequirementChips } from "./requirements";
import { StatusPanel } from "./status-panel";
import { useUrlNotices } from "./use-notices";

export function GiveawayDetailView({ initial, serverNow }: { initial: Giveaway; serverNow: number }) {
  const t = useT();
  const f = useFormat();
  const { member } = useGw();
  const [g, setG] = useState(initial);
  const ended = g.status === "ended";

  const refresh = useCallback(() => {
    gwFetch<Giveaway>(`/api/giveaways/${initial.id}`)
      .then(setG)
      .catch(() => {});
  }, [initial.id]);
  usePoll(refresh, 15_000);
  useUrlNotices(refresh);
  const onEnd = useCallback(() => setTimeout(refresh, 1500), [refresh]);
  const discord = safeDiscordUrl(g.messageUrl);

  return (
    <div className="space-y-5">
      <Link href="/giveaways" transitionTypes={["nav"]} className="inline-flex items-center gap-1.5 rounded-full py-1 text-sm font-semibold text-ink-2 transition-colors hover:text-accent-300">
        <ArrowLeft aria-hidden className="size-4 rtl:-scale-x-100" />
        {t("gw.back")}
      </Link>

      <div className={cn("gw-card overflow-hidden", ended ? "gw-ended" : "gw-running")}>
        <GiveawayBanner g={g} size="hero" className="aspect-[16/8] w-full sm:aspect-[16/6]" />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <section className={cn("gw-card p-5 sm:p-6", ended && "gw-ended")}>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill ended={ended} />
              {ended && <span className="text-sm font-semibold text-ink-3">{t("gw.finished")}</span>}
            </div>
            <h1 className={cn("mt-3 text-2xl font-extrabold tracking-tight text-balance sm:text-4xl", ended && "text-ink-2")}>
              <bdi>{g.prize}</bdi>
            </h1>

            {ended ? (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-3">
                <CalendarDays aria-hidden className="size-4" />
                {t("gw.endedOn", { date: f.dateTime(g.endsAt) })}
              </p>
            ) : (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-ink-3">{t("gw.endsIn")}</p>
                <Countdown endsAt={g.endsAt} serverNow={serverNow} live onEnd={onEnd} />
                <p className="mt-2 text-xs text-ink-3">{t("gw.endsOn", { date: f.dateTime(g.endsAt) })}</p>
              </div>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat icon={<Users aria-hidden className="size-4" />} label={t("gw.entries")}>
                <CountUp value={g.entries} format={f.n} />
              </Stat>
              <Stat icon={<Trophy aria-hidden className="size-4" />} label={t("gw.winnersCount")}>
                {f.n(g.winnersCount)}
              </Stat>
              <div className="col-span-2 flex items-center gap-2.5 rounded-2xl bg-[var(--gw-cream)] px-3 py-2.5 sm:col-span-1">
                <Avatar name={g.hostName ?? "?"} src={g.hostAvatarUrl} size={32} />
                <div className="min-w-0">
                  <dt className="text-xs text-ink-3">{t("gw.host")}</dt>
                  <dd className="truncate text-sm font-semibold">
                    <bdi>{g.hostName ?? "—"}</bdi>
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <RequirementChips g={g} muted={ended} />
              {discord && (
                <a href={discord} target="_blank" rel="noopener noreferrer" className="gw-cta-soft text-sm">
                  {t("gw.openInDiscord")}
                  <ExternalLink aria-hidden className="size-4 rtl:-scale-x-100" />
                </a>
              )}
            </div>
          </section>

          {ended && (
            <section aria-labelledby="gw-winners" className="gw-card gw-ended p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="gw-winners" className="flex items-center gap-2 text-lg font-bold">
                  <Trophy aria-hidden className="size-5 text-warn" />
                  {t("gw.winners")}
                </h2>
                <p className="tabular text-sm text-ink-3">{t("gw.totalEntries", { n: f.n(g.entries) })}</p>
              </div>
              {g.winners.length > 0 ? (
                <ul className="stagger mt-4 grid gap-2 sm:grid-cols-2">
                  {g.winners.map((w, i) => {
                    const me = member?.id === w.id;
                    return (
                      <li key={w.id} className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5", me ? "bg-warn/15 ring-1 ring-inset ring-warn/30" : "bg-[var(--gw-cream)]")}>
                        <span className="tabular w-5 text-center text-xs font-bold text-ink-3">{i + 1}</span>
                        <Avatar name={w.name} src={w.avatarUrl} size={36} />
                        <span className="min-w-0 flex-1 truncate font-semibold">
                          <bdi>{w.name}</bdi>
                        </span>
                        {me && <Trophy aria-label={t("gw.status.youWon")} className="size-4 text-warn" />}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 rounded-2xl bg-[var(--gw-cream)] px-4 py-6 text-center text-sm text-ink-3">{t("gw.noWinners")}</p>
              )}
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24">
          <StatusPanel g={g} onChange={setG} refresh={refresh} />
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[var(--gw-cream)] px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs text-ink-3">
        {icon}
        {label}
      </dt>
      <dd className="tabular mt-0.5 text-xl font-extrabold">{children}</dd>
    </div>
  );
}
