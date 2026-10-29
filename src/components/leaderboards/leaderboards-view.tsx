"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Scene } from "@/components/art/scenes";
import { Icon, type IconName } from "@/components/icons/icon";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { MemberBadge } from "@/components/people/member-badge";
import { useDebounced } from "@/components/members/member-directory";
import { ServerChip } from "@/components/shell/server-chip";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { api, qs } from "@/lib/client/api";
import { LEADERBOARD_PERIODS, type Leaderboard, type LeaderboardEntry, type LeaderboardKind, type LeaderboardPeriod } from "@/lib/types";

const KIND_ICON: Record<LeaderboardKind, IconName> = { general: "coin", chat: "messages", voice: "headphones", reactions: "smile" };
const REFRESH_MS = 60_000;

/** One board, refreshed every minute while the tab is visible; the old board stays up while it reloads. */
function useBoard(kind: LeaderboardKind, period: LeaderboardPeriod, guild: string) {
  const key = `${guild}:${kind}:${period}`;
  const [state, setState] = useState<{ key: string; board: Leaderboard | null; error: boolean }>({ key: "", board: null, error: false });
  const latest = useRef(key);
  useEffect(() => {
    latest.current = key;
  });

  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    const fetchBoard = (signal?: AbortSignal) =>
      api<Leaderboard>(`/api/leaderboard${qs({ kind, period, guild, limit: 50 })}`, { signal }).then(
        (board) => {
          if (latest.current === key) setState({ key, board, error: false });
        },
        (err) => {
          if (signal?.aborted) return;
          console.error(err);
          // Keep showing the last board when a refresh fails.
          setState((s) => (s.key === key && s.board ? s : { key, board: null, error: true }));
        },
      );
    void fetchBoard(ctrl.signal);
    const id = setInterval(() => document.visibilityState === "visible" && void fetchBoard(), REFRESH_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [kind, period, guild, key, nonce]);

  const current = state.key === key;
  return { board: current ? state.board : null, error: current && state.error, retry: () => setNonce((n) => n + 1) };
}

export function LeaderboardsView() {
  const { t } = useApp();
  const { guild } = useGuild();
  const [kind, setKind] = useState<LeaderboardKind>("general");
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const [q, setQ] = useState("");
  const query = useDebounced(q).toLowerCase();
  const { board, error, retry } = useBoard(kind, period, guild);
  const items = board?.items ?? [];
  const shown = query ? items.filter((i) => i.name.toLowerCase().includes(query) || i.discordId === query) : items;

  return (
    <>
      <PageHeader eyebrow={<ServerChip />} title={t("nav.leaderboards")} subtitle={t("lb.subtitle")} art={<Scene name="giveaways" className="-my-2 h-28 w-auto" />} />

      <div className="mb-3 overflow-x-auto">
        <Segmented
          label={t("lb.kind")}
          value={kind}
          onChange={setKind}
          options={(["general", "chat", "voice", "reactions"] as const).map((k) => ({ value: k, label: t(`lb.kinds.${k}`), icon: <Icon name={KIND_ICON[k]} size={16} /> }))}
        />
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label={t("lb.period")}>
        {LEADERBOARD_PERIODS.map((p) => (
          <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>
            {t(`lb.periods.${p}`)}
          </Chip>
        ))}
        {board?.available && (
          <span className="ms-auto inline-flex items-center gap-1.5 text-xs text-ink-3">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-good" />
            {t("lb.updated")} <TimeAgo at={board.updatedAt} />
          </span>
        )}
      </div>

      {error ? (
        <div className="glass rounded-[var(--radius-card)]">
          <ErrorState title={t("common.error")} action={<Button onClick={retry}>{t("common.retry")}</Button>} />
        </div>
      ) : !board ? (
        <BoardSkeleton />
      ) : !board.available ? (
        <div className="glass rounded-[var(--radius-card)]">
          <EmptyState
            art="quiet"
            title={t("lb.notYet")}
            hint={t("lb.notYetHint")}
            action={
              <Button variant="secondary" onClick={() => setPeriod("all")}>
                <Icon name="trophy" size={16} />
                {t("lb.showAll")}
              </Button>
            }
          />
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-[var(--radius-card)]">
          <EmptyState art="quiet" title={t("lb.empty")} hint={t("lb.emptyHint")} />
        </div>
      ) : (
        <div className="space-y-5">
          {!query && <Podium top={items.slice(0, 3)} kind={kind} />}
          <section className="glass overflow-hidden rounded-[var(--radius-card)]" aria-label={t("lb.list")}>
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
              <div className="min-w-48 flex-1">
                <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("lb.search")} aria-label={t("lb.search")} leading={<Icon name="search" size={16} />} maxLength={64} />
              </div>
              <span className="text-xs text-ink-3">{t("lb.top", { n: items.length })}</span>
            </div>
            {shown.length === 0 ? (
              <EmptyState art="search" title={t("lb.notOnBoard")} hint={t("lb.notOnBoardHint")} compact />
            ) : (
              <ol className="divide-y divide-line">
                {(query ? shown : shown.slice(3)).map((e) => (
                  <Row key={e.discordId} entry={e} kind={kind} />
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function useValue(kind: LeaderboardKind) {
  const { t } = useApp();
  const f = useFormat();
  return (v: number) => {
    if (kind === "voice") {
      const h = Math.floor(v / 60);
      const m = v % 60;
      return h ? t("lb.hours", { h: f.n(h), m: f.n(m) }) : t("lb.minutes", { m: f.n(m) });
    }
    return f.n(v);
  };
}

function Unit({ kind }: { kind: LeaderboardKind }) {
  const { t } = useApp();
  return kind === "voice" ? null : <span className="block text-[10.5px] font-medium text-ink-3">{t(`lb.units.${kind}`)}</span>;
}

const MEDAL = ["#f5b301", "#a8b3c2", "#cd7f45"] as const;

function Podium({ top, kind }: { top: LeaderboardEntry[]; kind: LeaderboardKind }) {
  const { t } = useApp();
  const { href } = useGuild();
  const value = useValue(kind);
  // Second, first, third — the winner stands in the middle.
  const order = [top[1], top[0], top[2]].filter(Boolean) as LeaderboardEntry[];
  return (
    <section aria-label={t("lb.podium")} className="glass relative overflow-hidden rounded-[var(--radius-card)] px-3 pt-6 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--color-accent-500)_14%,transparent),transparent)]" />
      <ol className="relative mx-auto grid max-w-3xl grid-cols-3 items-end gap-2 sm:gap-4">
        {order.map((e) => {
          const place = e.rank;
          const first = place === 1;
          return (
            <li key={e.discordId} className={cn("flex min-w-0 flex-col items-center", first ? "order-2" : place === 2 ? "order-1" : "order-3")}>
              <Link href={href("/members", { member: e.discordId })} className="group flex min-w-0 flex-col items-center text-center">
                <span className="relative">
                  {first && <Icon name="crown" size={28} duo className="absolute -top-6 left-1/2 -translate-x-1/2 text-[#f5b301] drop-shadow motion-safe:animate-[float_4s_ease-in-out_infinite]" />}
                  <Avatar name={e.name} src={e.avatarUrl} size={first ? 84 : 64} ring={MEDAL[place - 1]} className="transition group-hover:scale-105" />
                  <span
                    className="font-display absolute -end-1 -bottom-1 grid size-7 place-items-center rounded-full text-xs font-bold text-white ring-2 ring-surface"
                    style={{ background: MEDAL[place - 1] }}
                  >
                    {place}
                  </span>
                </span>
                <bdi className="mt-2.5 w-full truncate text-sm font-semibold text-ink">{e.name}</bdi>
                <MemberBadge badge={e.badge} className="mt-1" />
              </Link>
              <div
                className={cn("mt-3 flex w-full flex-col items-center justify-start rounded-t-2xl pt-3", first ? "h-28 sm:h-32" : place === 2 ? "h-20 sm:h-24" : "h-16 sm:h-20")}
                style={{ background: `linear-gradient(180deg, color-mix(in oklab, ${MEDAL[place - 1]} 30%, var(--color-surface-2)), var(--color-surface-2))` }}
              >
                <span className="font-display tabular px-1 text-center text-sm leading-tight font-bold text-ink sm:text-xl">{value(e.value)}</span>
                <Unit kind={kind} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Delta({ d }: { d?: number }) {
  const { t } = useApp();
  if (!d) return <span className="w-10" aria-hidden />;
  const up = d > 0;
  return (
    <span className={cn("tabular inline-flex w-10 items-center justify-end gap-0.5 text-xs font-semibold", up ? "text-good" : "text-bad")} aria-label={t(up ? "lb.up" : "lb.down", { n: Math.abs(d) })}>
      <Icon name={up ? "arrowUp" : "arrowDown"} size={12} />
      {Math.abs(d)}
    </span>
  );
}

function Row({ entry: e, kind }: { entry: LeaderboardEntry; kind: LeaderboardKind }) {
  const { href } = useGuild();
  const value = useValue(kind);
  return (
    <li>
      <Link href={href("/members", { member: e.discordId })} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-surface-2">
        <span className={cn("font-display tabular w-8 text-center text-sm font-bold", e.rank <= 3 ? "text-accent-400" : "text-ink-3")}>{e.rank}</span>
        <Avatar name={e.name} src={e.avatarUrl} size={36} />
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <bdi className="truncate text-sm font-semibold text-ink">{e.name}</bdi>
          <MemberBadge badge={e.badge} className="shrink-0 max-sm:hidden" />
        </span>
        <span className="text-end">
          <span className="font-display tabular block text-sm font-bold text-ink">{value(e.value)}</span>
          <Unit kind={kind} />
        </span>
        <Delta d={e.delta} />
      </Link>
    </li>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-5" aria-busy>
      <div className="glass flex items-end justify-center gap-6 rounded-[var(--radius-card)] px-6 pt-8">
        {[64, 84, 64].map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="rounded-full" style={{ width: s, height: s }} />
            <Skeleton className="h-3 w-20" />
            <Skeleton className={cn("w-28 rounded-b-none rounded-t-2xl", i === 1 ? "h-28" : "h-20")} />
          </div>
        ))}
      </div>
      <div className="glass space-y-1 rounded-[var(--radius-card)] p-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
