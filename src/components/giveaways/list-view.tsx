"use client";

import { useCallback, useState } from "react";
import { Gift } from "lucide-react";
import { useFormat, useT } from "@/components/providers/app-provider";
import { Segmented } from "@/components/ui/segmented";
import { gwFetch, usePoll } from "@/lib/giveaways/client";
import type { Giveaway } from "@/lib/giveaways/types";
import { GiftBox, Parachute } from "./art";
import { EndedCard, RunningCard } from "./giveaway-card";
import { useUrlNotices } from "./use-notices";

type Tab = "running" | "ended";

export function GiveawaysListView({ initial, serverNow }: { initial: Giveaway[]; serverNow: number }) {
  const t = useT();
  const f = useFormat();
  const [list, setList] = useState(initial);
  const [tab, setTab] = useState<Tab>("running");
  useUrlNotices();

  const refresh = useCallback(() => {
    gwFetch<Giveaway[]>("/api/giveaways")
      .then(setList)
      .catch(() => {});
  }, []);
  usePoll(refresh, 30_000);
  // A countdown hit zero: fetch again shortly so the card moves to "Ended".
  const onEnd = useCallback(() => setTimeout(refresh, 1500), [refresh]);

  const running = list.filter((g) => g.status === "active");
  const ended = list.filter((g) => g.status === "ended");

  return (
    <div className="space-y-8">
      <section className="gw-card relative overflow-hidden px-5 py-7 sm:px-8 sm:py-10">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 end-0 w-1/2 max-sm:hidden">
          <GiftBox tone="red" className="gw-pop absolute end-[6%] bottom-[-8%] h-[70%] w-auto rotate-[8deg]" />
          <GiftBox tone="gold" className="gw-pop absolute end-[32%] bottom-[-12%] h-[40%] w-auto -rotate-6 [animation-delay:120ms] max-md:hidden" />
          <Parachute className="gw-pop absolute end-[24%] top-[8%] h-[46%] w-auto rotate-6 [animation-delay:240ms] max-md:hidden" />
        </div>
        <div className="relative max-w-lg">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/10 px-3 py-1 text-xs font-bold text-accent-300">
            <Gift aria-hidden className="size-3.5" />
            {running.length > 0 ? `${f.n(running.length)} · ${t("gw.running")}` : t("gw.title")}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">{t("gw.title")}</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-2 sm:text-base">{t("gw.tagline")}</p>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <Segmented
          label={t("gw.title")}
          value={tab}
          onChange={setTab}
          options={[
            { value: "running", label: t("gw.tabs.running"), count: running.length },
            { value: "ended", label: t("gw.tabs.ended"), count: ended.length },
          ]}
        />
      </div>

      {tab === "running" ? (
        <>
          {running.length > 0 ? (
            <ul className="stagger grid gap-5 md:grid-cols-2">
              {running.map((g) => (
                <li key={g.id} className="flex">
                  <RunningCard g={g} serverNow={serverNow} onEnd={onEnd} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty title={t("gw.noneRunning")} hint={t("gw.noneRunningHint")} />
          )}
          {ended.length > 0 && (
            <section aria-labelledby="gw-recent" className="space-y-3">
              <h2 id="gw-recent" className="text-sm font-semibold text-ink-3">
                {t("gw.recentlyEnded")}
              </h2>
              <ul className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ended.slice(0, 3).map((g) => (
                  <li key={g.id}>
                    <EndedCard g={g} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : ended.length > 0 ? (
        <ul className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ended.map((g) => (
            <li key={g.id}>
              <EndedCard g={g} />
            </li>
          ))}
        </ul>
      ) : (
        <Empty title={t("gw.noneEnded")} />
      )}
    </div>
  );
}

function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="gw-card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <GiftBox tone="cream" className="h-20 w-auto" />
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-sm text-ink-3">{hint}</p>}
    </div>
  );
}
