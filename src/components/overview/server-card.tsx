"use client";

import { useState } from "react";
import { Headphones, LifeBuoy, Rocket, UserPlus, Users, Wifi, type LucideIcon } from "lucide-react";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { GuildBannerArt } from "@/components/art/mock-art";
import { GuildIcon } from "@/components/shell/guild-mark";
import { CountUp } from "@/components/ui/count-up";
import { Img } from "@/components/ui/img";
import { Tooltip } from "@/components/ui/tooltip";
import type { MessageKey } from "@/lib/i18n";
import type { ServerStats } from "@/lib/types";

const TILES: { key: keyof Omit<ServerStats, "at" | "guild">; label: MessageKey; icon: LucideIcon }[] = [
  { key: "members", label: "stats.members", icon: Users },
  { key: "online", label: "stats.online", icon: Wifi },
  { key: "newToday", label: "stats.newToday", icon: UserPlus },
  { key: "ticketsOpen", label: "stats.ticketsOpen", icon: LifeBuoy },
  { key: "inVoice", label: "stats.inVoice", icon: Headphones },
  { key: "boosts", label: "stats.boosts", icon: Rocket },
];

/** The selected server: banner, icon, description and live health numbers. */
export function ServerCard({ initial }: { initial: ServerStats | null }) {
  const { t } = useApp();
  const f = useFormat();
  const { guild, current } = useGuild();
  const [stats, setStats] = useState(initial);
  useLiveEvent("stats", (e) => {
    if ((e.data.guild ?? "main") === guild) setStats(e.data);
  });

  return (
    <section aria-label={current?.name ?? t("overview.serverCard")} className="glass relative overflow-hidden rounded-[var(--radius-card)] animate-rise">
      <div aria-hidden className="absolute inset-x-0 top-0 h-36">
        <Img src={current?.bannerUrl} sizes="1200px" priority className="size-full opacity-80" fallback={<GuildBannerArt guild={guild} className="absolute inset-0 size-full" />} />
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/60 to-surface" />
      </div>
      <div className="relative px-5 pt-16 pb-5">
        <div className="flex flex-wrap items-end gap-4">
          <GuildIcon guild={guild} info={current} size={72} className="ring-4 ring-surface [&>span]:rounded-[26%]" />
          <div className="min-w-0 flex-1 pb-1">
            <h2 className="truncate text-xl font-semibold tracking-tight">{current?.name ?? "JoHood"}</h2>
            {current?.description && <p className="mt-0.5 line-clamp-2 text-sm text-ink-3">{current.description}</p>}
          </div>
          {current && current.boostLevel > 0 && (
            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-blush/15 px-3 py-1 text-xs font-semibold text-blush ring-1 ring-inset ring-blush/30">
              <Rocket aria-hidden className="size-3.5" />
              {t("guild.boostLevel", { n: current.boostLevel })}
            </span>
          )}
        </div>
        {stats && (
          <dl className="stagger mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {TILES.map(({ key, label, icon: Icon }) => {
              const v = stats[key];
              return (
                <div key={key} className="rounded-2xl bg-white/[0.035] px-4 py-3 ring-1 ring-inset ring-line">
                  <dt className="flex items-center gap-1.5 text-xs text-ink-3">
                    <Icon aria-hidden className="size-3.5" />
                    {t(label)}
                  </dt>
                  <dd className="tabular mt-1 text-2xl font-semibold tracking-tight text-ink">
                    {typeof v === "number" ? (
                      <CountUp value={v} format={f.n} />
                    ) : (
                      <Tooltip content={t("guild.ticketsElsewhere")}>
                        <span tabIndex={0} className="text-base font-medium text-ink-3">
                          {t("common.notTracked")}
                        </span>
                      </Tooltip>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </div>
    </section>
  );
}
