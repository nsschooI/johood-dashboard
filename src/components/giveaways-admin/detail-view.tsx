"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons/icon";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useRouter } from "next/navigation";
import { useLiveEvent } from "@/components/providers/live-provider";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { Table, Td, Th } from "@/components/points/tables";
import { api } from "@/lib/client/api";
import { downloadCsv } from "@/lib/client/download";
import { funnel, missingKey, toCsv, type AdminGiveaway, type Blocked, type MissingRequirement, type Participant } from "@/lib/giveaways/admin";
import { BannerThumb, GiveawayActions, GiveawayStatus } from "./actions";
import { usePolling } from "./list-view";

type Tab = "entries" | "blocked";
const PAGE = 150;

export function GiveawayDetailView({ initial, people: initialPeople }: { initial: AdminGiveaway; people: { entries: Participant[]; blocked: Blocked[] } }) {
  const { t } = useApp();
  const f = useFormat();
  const { href } = useGuild();
  const router = useRouter();
  const [g, setG] = useState(initial);
  const [people, setPeople] = useState(initialPeople);
  const [tab, setTab] = useState<Tab>("entries");
  const [q, setQ] = useState("");
  const [missing, setMissing] = useState<string>("all");
  const [limit, setLimit] = useState(PAGE);

  const reloadPeople = useCallback(() => {
    api<{ entries: Participant[]; blocked: Blocked[] }>(`/api/giveaways-admin/${g.id}/participants`)
      .then(setPeople)
      .catch(() => {});
  }, [g.id]);
  const refresh = useCallback(() => {
    api<AdminGiveaway>(`/api/giveaways-admin/${g.id}`)
      .then(setG)
      .catch(() => {});
    reloadPeople();
  }, [g.id, reloadPeople]);
  usePolling(refresh);

  // Live: counts arrive with the event; the lists follow shortly after (debounced).
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useLiveEvent("giveaway", (e) => {
    if (e.data.id !== g.id) return;
    // Deleted (here or by someone else): nothing left to show.
    if (e.data.deleted) return router.replace(href("/giveaways-admin"));
    setG(e.data);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(reloadPeople, 1200);
  });
  useEffect(() => () => void (debounce.current && clearTimeout(debounce.current)), []);

  const fun = funnel(g);
  const winners = useMemo(() => new Set(g.winners.map((w) => w.id)), [g.winners]);
  const term = q.trim().toLowerCase();
  const match = (p: { name: string; userId: string }) => !term || p.name.toLowerCase().includes(term) || p.userId.includes(term);
  const entries = useMemo(() => people.entries.filter(match).sort((a, b) => Number(winners.has(b.userId)) - Number(winners.has(a.userId))), [people.entries, term, winners]); // eslint-disable-line react-hooks/exhaustive-deps
  const missingOptions = useMemo(() => {
    const m = new Map<string, MissingRequirement>();
    for (const b of people.blocked) for (const x of b.missing) m.set(missingKey(x), x);
    return [...m];
  }, [people.blocked]);
  const blocked = useMemo(() => people.blocked.filter((b) => match(b) && (missing === "all" || b.missing.some((x) => missingKey(x) === missing))), [people.blocked, term, missing]); // eslint-disable-line react-hooks/exhaustive-deps
  const label = (m: MissingRequirement) => (m.type === "authorize" ? t("ga.detail.missingAuthorize") : t("ga.detail.missingServer", { name: m.name }));

  const exportCsv = () => {
    if (tab === "entries") {
      downloadCsv(
        `giveaway-${g.id}-participants.csv`,
        toCsv([
          [t("ga.detail.name"), t("ga.detail.id"), t("ga.detail.joinedAt"), t("ga.detail.winner")],
          ...entries.map((p) => [p.name, p.userId, p.joinedAt, winners.has(p.userId) ? "1" : ""]),
        ]),
      );
    } else {
      downloadCsv(
        `giveaway-${g.id}-blocked.csv`,
        toCsv([
          [t("ga.detail.name"), t("ga.detail.id"), t("ga.detail.missing"), t("ga.detail.tries"), t("ga.detail.firstTry"), t("ga.detail.lastTry")],
          ...blocked.map((b) => [b.name, b.userId, b.missing.map(label).join(" + "), b.attempts, b.firstAt, b.lastAt]),
        ]),
      );
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href={href("/giveaways-admin")}
        transitionTypes={["nav"]}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 transition hover:text-accent-400"
      >
        <Icon name="arrowLeft" size={16} mirror />
        {t("ga.detail.back")}
      </Link>

      {/* Hero */}
      <section className="glass grid gap-5 overflow-hidden rounded-[var(--radius-card)] p-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:p-5">
        <BannerThumb id={g.id} className={cn("aspect-[16/9] w-full rounded-2xl", g.status !== "active" && "grayscale-[0.6]")} />
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <GiveawayStatus g={g} />
            {g.status === "active" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-good">
                <span aria-hidden className="size-1.5 rounded-full bg-good motion-safe:animate-pulse" />
                {t("ga.detail.live")}
              </span>
            )}
          </div>
          <h1 className="font-display mt-2 text-2xl leading-tight font-bold sm:text-3xl">
            <bdi>{g.prize}</bdi>
          </h1>
          {g.channelName && <p className="mt-1 text-sm text-ink-3">{t("ga.detail.postedIn", { channel: g.channelName, guild: g.guildName ?? "" })}</p>}
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-2">
            <Icon name="clock" size={16} className="text-ink-3" />
            {g.status === "active" ? t("ga.list.endsIn", { time: f.relative(g.endsAt) }) : t("ga.list.endedAt", { time: f.relative(g.endsAt) })}
            <span className="text-ink-3">· {f.dateTime(g.endsAt)}</span>
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
            <GiveawayActions g={g} onChange={setG} compact />
            {g.messageUrl && /^https:\/\/(\w+\.)?discord(app)?\.com\//.test(g.messageUrl) && (
              <a
                href={g.messageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-accent-300 transition hover:bg-accent-500/10"
              >
                {t("ga.detail.openDiscord")}
                <Icon name="external" size={14} />
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="order-2 space-y-4 xl:order-1">
          {/* Lists */}
          <section className="glass rounded-[var(--radius-card)]" aria-label={tab === "entries" ? t("ga.detail.participants") : t("ga.detail.blockedTab")}>
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
              <Segmented
                label={t("ga.detail.participants")}
                value={tab}
                onChange={(v) => {
                  setTab(v);
                  setLimit(PAGE);
                }}
                options={[
                  { value: "entries" as Tab, label: t("ga.detail.participants"), count: people.entries.length },
                  { value: "blocked" as Tab, label: t("ga.detail.blockedTab"), count: people.blocked.length },
                ]}
              />
              <Button size="sm" variant="secondary" className="ms-auto" onClick={exportCsv} disabled={(tab === "entries" ? entries : blocked).length === 0}>
                <Icon name="download" size={16} />
                {t("ga.detail.export")}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
              <div className="w-full sm:w-72">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("ga.detail.search")}
                  aria-label={t("ga.detail.search")}
                  leading={<Icon name="search" size={16} />}
                />
              </div>
              {tab === "blocked" && missingOptions.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  <Chip active={missing === "all"} onClick={() => setMissing("all")}>
                    {t("ga.detail.all")}
                  </Chip>
                  {missingOptions.map(([k, m]) => (
                    <Chip key={k} active={missing === k} onClick={() => setMissing(k)} icon={<Icon name={m.type === "authorize" ? "access" : "server"} size={14} />}>
                      {label(m)}
                    </Chip>
                  ))}
                </div>
              )}
              <p className="tabular ms-auto text-xs font-semibold text-ink-3" aria-live="polite">
                {t("ga.detail.count", { n: f.n(tab === "entries" ? entries.length : blocked.length) })}
              </p>
            </div>
            {tab === "blocked" && <p className="px-4 pt-3 text-sm text-ink-2">{t("ga.detail.blockedHint")}</p>}

            {tab === "entries" ? (
              entries.length === 0 ? (
                <EmptyState
                  art={term ? "search" : "emptyGift"}
                  title={term ? t("ga.detail.noMatch") : t("ga.detail.noneJoined")}
                  hint={term ? undefined : t("ga.detail.noneJoinedHint")}
                />
              ) : (
                <Table label={t("ga.detail.participants")} className="mt-3 max-h-[36rem] overflow-y-auto">
                  <thead>
                    <tr>
                      <Th>{t("ga.detail.name")}</Th>
                      <Th className="hidden sm:table-cell">{t("ga.detail.id")}</Th>
                      <Th end>{t("ga.detail.joinedAt")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice(0, limit).map((p) => {
                      const won = winners.has(p.userId);
                      return (
                        <tr key={p.userId} className={cn("transition-colors hover:bg-surface-2", won && "bg-warn/[0.08]")}>
                          <Td>
                            <span className="flex items-center gap-2.5">
                              <Avatar name={p.name} src={p.avatarUrl} size={30} />
                              <span className="min-w-0">
                                <bdi className="block truncate font-semibold">{p.name}</bdi>
                                {/* Phones: the id sits under the name instead of in its own column. */}
                                <span className="font-mono text-[11px] text-ink-3 sm:hidden" dir="ltr">
                                  {p.userId}
                                </span>
                              </span>
                              {won && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-semibold text-warn">
                                  <Icon name="trophy" size={12} />
                                  {t("ga.detail.winner")}
                                </span>
                              )}
                            </span>
                          </Td>
                          <Td className="hidden font-mono text-xs text-ink-3 sm:table-cell">
                            <span className="inline-flex items-center gap-1" dir="ltr">
                              {p.userId}
                              <CopyButton value={p.userId} className="size-5" />
                            </span>
                          </Td>
                          <Td end className="text-xs whitespace-nowrap text-ink-3">
                            <TimeAgo at={p.joinedAt} />
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )
            ) : blocked.length === 0 ? (
              <EmptyState
                art={term || missing !== "all" ? "search" : people.blocked.length ? "search" : g.entries ? "allClear" : "emptyGift"}
                title={term || missing !== "all" ? t("ga.detail.noMatch") : t("ga.detail.noneBlocked")}
                hint={term || missing !== "all" ? undefined : t("ga.detail.noneBlockedHint")}
              />
            ) : (
              <Table label={t("ga.detail.blockedTab")} className="mt-3 max-h-[36rem] overflow-y-auto">
                <thead>
                  <tr>
                    <Th>{t("ga.detail.name")}</Th>
                    <Th>{t("ga.detail.missing")}</Th>
                    <Th end>{t("ga.detail.tries")}</Th>
                    <Th end className="hidden sm:table-cell">
                      {t("ga.detail.firstTry")}
                    </Th>
                    <Th end>{t("ga.detail.lastTry")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {blocked.slice(0, limit).map((b) => (
                    <tr key={b.userId} className="transition-colors hover:bg-surface-2">
                      <Td>
                        <span className="flex items-center gap-2.5">
                          <Avatar name={b.name} src={b.avatarUrl} size={30} />
                          <span className="min-w-0">
                            <bdi className="block truncate font-semibold">{b.name}</bdi>
                            <span className="font-mono text-[11px] text-ink-3" dir="ltr">
                              {b.userId}
                            </span>
                          </span>
                        </span>
                      </Td>
                      <Td>
                        <span className="flex flex-wrap gap-1">
                          {b.missing.map((m) => (
                            <span key={missingKey(m)} className="inline-flex items-center gap-1 rounded-md bg-warn/12 px-1.5 py-0.5 text-[11px] font-semibold text-warn">
                              <Icon name={m.type === "authorize" ? "access" : "server"} size={12} />
                              {label(m)}
                            </span>
                          ))}
                        </span>
                      </Td>
                      <Td end className="font-display tabular font-bold">
                        {f.n(b.attempts)}
                      </Td>
                      <Td end className="hidden text-xs whitespace-nowrap text-ink-3 sm:table-cell">
                        <TimeAgo at={b.firstAt} />
                      </Td>
                      <Td end className="text-xs whitespace-nowrap text-ink-3">
                        <TimeAgo at={b.lastAt} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            {(tab === "entries" ? entries.length : blocked.length) > limit && (
              <div className="border-t border-line p-3 text-center">
                <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + PAGE)}>
                  {t("common.loadMore")}
                </Button>
              </div>
            )}
          </section>
        </div>

        <aside className="order-1 space-y-4 xl:order-2">
          {/* Joined vs blocked: one 100% bar, direct labels */}
          <section className="glass rounded-[var(--radius-card)] p-5" aria-labelledby="funnel-title">
            <h2 id="funnel-title" className="font-display text-[15px] font-semibold">
              {t("ga.detail.funnel")}
            </h2>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="font-display tabular text-3xl font-bold">{f.n(fun.attempts)}</span>
              <span className="text-sm text-ink-3">{t("ga.detail.attempts")}</span>
            </p>
            <div
              className="mt-3 flex h-3 gap-[2px] overflow-hidden rounded-full bg-surface-3"
              role="img"
              aria-label={`${t("ga.detail.joined")} ${f.pct(fun.joinedPct)}, ${t("ga.detail.blocked")} ${f.pct(fun.blockedPct)}`}
            >
              {fun.joined > 0 && <span className="h-full rounded-s-full bg-series-1 transition-[width] duration-[var(--dur-slow)]" style={{ width: `${fun.joinedPct * 100}%` }} />}
              {fun.blocked > 0 && (
                <span className="h-full bg-series-3 transition-[width] duration-[var(--dur-slow)] last:rounded-e-full" style={{ width: `${fun.blockedPct * 100}%` }} />
              )}
            </div>
            <dl className="mt-4 space-y-2.5 text-sm">
              {(
                [
                  ["joined", fun.joined, fun.joinedPct, "bg-series-1"],
                  ["blocked", fun.blocked, fun.blockedPct, "bg-series-3"],
                ] as const
              ).map(([k, n, pct, c]) => (
                <div key={k} className="flex items-center gap-2.5">
                  <span aria-hidden className={cn("size-2.5 rounded-sm", c)} />
                  <dt className="flex-1 text-ink-2">{t(`ga.detail.${k}`)}</dt>
                  <dd className="font-display tabular font-bold">{f.n(n)}</dd>
                  <dd className="tabular w-14 text-end text-xs text-ink-3">{f.pct(pct)}</dd>
                </div>
              ))}
            </dl>
          </section>

          {g.status !== "active" && (
            <section className="glass rounded-[var(--radius-card)] p-5" aria-labelledby="winners-title">
              <h2 id="winners-title" className="font-display flex items-center gap-2 text-[15px] font-semibold">
                <Icon name="trophy" size={18} duo className="text-warn" />
                {t("ga.detail.winnersTitle")}
              </h2>
              {g.winners.length === 0 ? (
                <p className="mt-3 text-sm text-ink-3">{t("ga.detail.noWinners")}</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {g.winners.map((w, i) => {
                    const p = people.entries.find((x) => x.userId === w.id);
                    return (
                      <li key={w.id} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-2.5 py-2">
                        <span className="tabular w-4 text-center text-xs font-bold text-ink-3">{i + 1}</span>
                        <Avatar name={w.name} src={p?.avatarUrl} size={28} />
                        <bdi className="min-w-0 flex-1 truncate text-sm font-semibold">{w.name}</bdi>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          <section className="glass rounded-[var(--radius-card)] p-5 text-sm">
            <h2 className="font-display text-[15px] font-semibold">{t("ga.form.summary.requirements")}</h2>
            <ul className="mt-3 space-y-1.5 text-ink-2">
              {g.requirements.servers.map((s) => (
                <li key={s.key} className="flex items-center gap-2">
                  <Icon name="server" size={16} className="text-ink-3" />
                  {t("ga.detail.missingServer", { name: s.name })}
                </li>
              ))}
              {g.requirements.authorize && (
                <li className="flex items-center gap-2">
                  <Icon name="access" size={16} className="text-ink-3" />
                  {t("ga.detail.missingAuthorize")}
                </li>
              )}
              {!g.requirements.servers.length && !g.requirements.authorize && <li>{t("ga.discord.noReq")}</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
