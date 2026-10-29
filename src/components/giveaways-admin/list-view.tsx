"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Scene } from "@/components/art/scenes";
import { Icon } from "@/components/icons/icon";
import { useApp, useFormat, useWhyNot } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { ServerChip } from "@/components/shell/server-chip";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Segmented } from "@/components/ui/segmented";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/states";
import { api } from "@/lib/client/api";
import type { AdminGiveaway } from "@/lib/giveaways/admin";
import { BannerThumb, GiveawayActions, GiveawayStatus } from "./actions";

type Filter = "all" | "active" | "ended";

/** Poll as a fallback for backends that don't push giveaway events. */
export function usePolling(fn: () => void, ms = 15_000) {
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && fn(), ms);
    return () => clearInterval(id);
  }, [fn, ms]);
}

export function GiveawaysAdminView({ initial }: { initial: AdminGiveaway[] }) {
  const { t } = useApp();
  const f = useFormat();
  const why = useWhyNot();
  const router = useRouter();
  const { href } = useGuild();
  const [list, setList] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const manageReason = why("giveaways.manage");

  const upsert = (g: AdminGiveaway) => setList((cur) => (cur.some((x) => x.id === g.id) ? cur.map((x) => (x.id === g.id ? g : x)) : [g, ...cur]));
  useLiveEvent("giveaway", (e) => upsert(e.data));
  const [refresh] = useState(() => () => {
    api<AdminGiveaway[]>("/api/giveaways-admin")
      .then(setList)
      .catch(() => {});
  });
  usePolling(refresh);

  const sorted = useMemo(() => {
    const running = list.filter((g) => g.status === "active").sort((a, b) => a.endsAt.localeCompare(b.endsAt));
    const done = list.filter((g) => g.status !== "active").sort((a, b) => b.endsAt.localeCompare(a.endsAt));
    return [...running, ...done];
  }, [list]);
  const running = sorted.filter((g) => g.status === "active");
  const shown = filter === "all" ? sorted : filter === "active" ? running : sorted.filter((g) => g.status !== "active");

  return (
    <>
      <PageHeader
        eyebrow={<ServerChip global />}
        title={t("nav.giveaways")}
        subtitle={t("ga.subtitle")}
        art={<Scene name="giveaways" className="-my-2 h-28 w-auto" />}
        actions={
          <>
            <a href="/giveaways" target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-xl bg-surface px-4 text-sm font-semibold text-ink ring-1 ring-inset ring-line-strong transition hover:bg-surface-2 active:scale-95">
              <Icon name="external" size={16} />
              {t("ga.publicPage")}
            </a>
            <Button variant="primary" disabledReason={manageReason} onClick={() => router.push(href("/giveaways-admin/new"))}>
              <Icon name="plus" size={18} />
              {t("ga.new")}
            </Button>
          </>
        }
      />
      <div className="space-y-6">
        <div className="stagger grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatTile label={t("ga.stats.running")} value={running.length} format={f.n} icon="giveaways" tone="accent" />
          <StatTile label={t("ga.stats.entries")} value={running.reduce((s, g) => s + g.entries, 0)} format={f.n} icon="members" tone="good" />
          <StatTile label={t("ga.stats.blocked")} value={running.reduce((s, g) => s + g.blocked, 0)} format={f.n} icon="lock" tone="warn" />
          <StatTile label={t("ga.stats.ended")} value={list.length - running.length} format={f.n} icon="trophy" tone="info" />
        </div>

        <section aria-labelledby="ga-list-title" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="ga-list-title" className="font-display text-lg font-semibold">
              {t("ga.list.title")}
            </h2>
            <Segmented
              size="sm"
              label={t("ga.list.title")}
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all" as Filter, label: t("common.all"), count: list.length },
                { value: "active" as Filter, label: t("ga.list.running"), count: running.length },
                { value: "ended" as Filter, label: t("ga.list.ended") },
              ]}
            />
          </div>
          {shown.length === 0 ? (
            <div className="glass rounded-[var(--radius-card)]">
              <EmptyState art="giveaways" title={t("ga.list.none")} hint={t("ga.list.noneHint")} />
            </div>
          ) : (
            <ul className="stagger space-y-3">
              {shown.map((g) => (
                <GiveawayRow key={g.id} g={g} onChange={upsert} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function GiveawayRow({ g, onChange }: { g: AdminGiveaway; onChange: (g: AdminGiveaway) => void }) {
  const { t } = useApp();
  const f = useFormat();
  const { href } = useGuild();
  const active = g.status === "active";
  return (
    <li className={cn("glass lift flex flex-col gap-4 overflow-hidden rounded-[var(--radius-card)] p-3 sm:flex-row sm:items-center", active && "ring-1 ring-accent-500/25")}>
      <Link href={href(`/giveaways-admin/${g.id}`)} transitionTypes={["nav"]} className="shrink-0" tabIndex={-1} aria-hidden>
        <BannerThumb id={g.id} className={cn("aspect-[16/9] w-full rounded-2xl sm:w-44", !active && "grayscale-[0.7]")} />
      </Link>
      <div className="min-w-0 flex-1 px-1 sm:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <GiveawayStatus g={g} />
          {g.channelName && (
            <span className="text-xs text-ink-3">
              #{g.channelName} · {g.guildName}
            </span>
          )}
        </div>
        <Link href={href(`/giveaways-admin/${g.id}`)} transitionTypes={["nav"]} className="mt-1 block hover:underline">
          <h3 className="font-display truncate text-lg font-semibold">
            <bdi>{g.prize}</bdi>
          </h3>
        </Link>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-3">
          <Icon name="clock" size={14} />
          {active ? t("ga.list.endsIn", { time: f.relative(g.endsAt) }) : g.status === "failed" ? t("ga.list.failedHint") : t("ga.list.endedAt", { time: f.relative(g.endsAt) })}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-2 px-1 text-center sm:w-72 sm:px-0">
        {(
          [
            ["entries", g.entries, "text-ink"],
            ["blocked", g.blocked, g.blocked ? "text-warn" : "text-ink-3"],
            ["winners", g.status === "ended" ? g.winners.length : g.winnersCount, "text-ink"],
          ] as const
        ).map(([k, v, c]) => (
          <div key={k} className="rounded-xl bg-surface-2 py-2">
            <dd className={cn("font-display tabular text-lg font-bold", c)}>{f.n(v)}</dd>
            <dt className="text-[11px] text-ink-3">{t(`ga.list.${k}`)}</dt>
          </div>
        ))}
      </dl>
      <div className="px-1 pb-1 sm:px-0 sm:pb-0">
        <GiveawayActions g={g} onChange={onChange} />
      </div>
    </li>
  );
}
