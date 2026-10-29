"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Scene } from "@/components/art/scenes";
import { Icon } from "@/components/icons/icon";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useToast } from "@/components/providers/toast-provider";
import { useDebounced } from "@/components/members/member-directory";
import { ServerChip } from "@/components/shell/server-chip";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Input, Select } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/modal";
import { RobloxHeadshot } from "@/components/ui/roblox";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { Chip } from "@/components/ui/badge";
import { api, qs } from "@/lib/client/api";
import { downloadCsv } from "@/lib/client/download";
import { useAction } from "@/lib/client/use-action";
import { usePagedList } from "@/lib/client/use-paged";
import { toCsv } from "@/lib/csv";
import type { Candidate, CandidateSort, LinkedPlayer, LinkedSort, NumberedPage, OutsidePlayer, OutsideSort } from "@/lib/types";
import { PlayerDrawer } from "./player-drawer";

export interface RobloxData {
  counts: { linked: number | null; candidates: number | null; outside: number | null };
}

type Tab = "linked" | "candidates" | "outside";
const TABS: Tab[] = ["linked", "candidates", "outside"];

export function RobloxView({ data }: { data: RobloxData }) {
  const { t } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = TABS.find((x) => x === params.get("tab")) ?? "linked";
  const player = params.get("player");
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  const count = (n: number | null) => (n === null ? undefined : n);
  return (
    <>
      <PageHeader eyebrow={<ServerChip />} title={t("nav.roblox")} subtitle={t("rbx.subtitle")} art={<Scene name="points" className="-my-2 h-28 w-auto" />} />
      <div className="mb-5 overflow-x-auto">
        <Segmented
          label={t("nav.roblox")}
          value={tab}
          onChange={(v) => set({ tab: v === "linked" ? null : v, q: null })}
          options={[
            { value: "linked" as Tab, label: t("rbx.tabs.linked"), count: count(data.counts.linked), icon: <Icon name="link" size={16} /> },
            { value: "candidates" as Tab, label: t("rbx.tabs.candidates"), count: count(data.counts.candidates), icon: <Icon name="userPlus" size={16} /> },
            { value: "outside" as Tab, label: t("rbx.tabs.outside"), count: count(data.counts.outside), icon: <Icon name="gamepad" size={16} /> },
          ]}
        />
      </div>
      {tab === "linked" && <LinkedTab key="linked" initialQuery={params.get("q") ?? ""} onOpen={(id) => set({ player: id })} />}
      {tab === "candidates" && <CandidatesTab key="candidates" initialQuery={params.get("q") ?? ""} />}
      {tab === "outside" && <OutsideTab key="outside" />}
      {player && <PlayerDrawer discordId={player} onClose={() => set({ player: null })} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function Purpose({ icon, children }: { icon: "link" | "userPlus" | "gamepad"; children: ReactNode }) {
  return (
    <p className="mb-4 flex items-start gap-2.5 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-ink-2 ring-1 ring-inset ring-line">
      <Icon name={icon} size={18} duo className="mt-px shrink-0 text-accent-400" />
      <span>{children}</span>
    </p>
  );
}

function ListCard({
  toolbar,
  state,
  children,
  footer,
}: {
  toolbar: ReactNode;
  state: { error: boolean; loading: boolean; empty: boolean; reload: () => void; emptyView: ReactNode };
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useApp();
  return (
    <section className="glass overflow-hidden rounded-[var(--radius-card)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">{toolbar}</div>
      {state.error ? (
        <ErrorState title={t("common.error")} action={<Button onClick={state.reload}>{t("common.retry")}</Button>} />
      ) : state.loading ? (
        <ul className="divide-y divide-line" aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-10 rounded-full" />
              <span className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2.5 w-1/4" />
              </span>
              <Skeleton className="h-8 w-24 rounded-xl" />
            </li>
          ))}
        </ul>
      ) : state.empty ? (
        state.emptyView
      ) : (
        children
      )}
      {footer}
    </section>
  );
}

function LoadMore({ list }: { list: { hasMore: boolean; loadMore: () => void; loadingMore: boolean; moreError: boolean } }) {
  const { t } = useApp();
  if (!list.hasMore) return null;
  return (
    <div className="border-t border-line p-3 text-center">
      <Button variant="ghost" size="sm" onClick={list.loadMore} loading={list.loadingMore}>
        {list.moreError ? t("common.retry") : t("common.loadMore")}
      </Button>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <span className={cn("min-w-0 text-end", className)}>
      <span className="font-display tabular block truncate text-sm font-bold text-ink">{value}</span>
      <span className="block truncate text-[10.5px] text-ink-3">{label}</span>
    </span>
  );
}

/** Every page of a list (for Copy list / CSV), 100 rows at a time. */
async function fetchAll<T>(path: string, params: Record<string, string | number | undefined>) {
  const out: T[] = [];
  for (let page = 1; page <= 200; page++) {
    const res = await api<NumberedPage<T>>(`${path}${qs({ ...params, page, pageSize: 100 })}`);
    out.push(...res.items);
    if (page * res.pageSize >= res.total || res.items.length === 0) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1 · Linked players
// ---------------------------------------------------------------------------

function LinkedTab({ initialQuery, onOpen }: { initialQuery: string; onOpen: (discordId: string) => void }) {
  const { t } = useApp();
  const f = useFormat();
  const toast = useToast();
  const { guild } = useGuild();
  const [q, setQ] = useState(initialQuery);
  const [sort, setSort] = useState<LinkedSort>("spent");
  const query = useDebounced(q);
  const list = usePagedList<LinkedPlayer>("/api/roblox/linked", { q: query, sort, guild }, 30);
  const [busy, setBusy] = useState<"copy" | "csv" | null>(null);

  const everyone = () => fetchAll<LinkedPlayer>("/api/roblox/linked", { q: query, sort, guild });
  const copy = async () => {
    setBusy("copy");
    try {
      const rows = await everyone();
      await navigator.clipboard.writeText(rows.map((r) => r.discordId).join("\n"));
      toast({ tone: "success", title: t("rbx.copied", { n: f.n(rows.length) }), description: t("rbx.copiedHint") });
    } catch {
      toast({ tone: "error", title: t("common.error") });
    } finally {
      setBusy(null);
    }
  };
  const csv = async () => {
    setBusy("csv");
    try {
      const rows = await everyone();
      downloadCsv(
        `linked-players-${guild}.csv`,
        toCsv([
          ["Discord ID", "Discord name", "Roblox ID", "Roblox username", "Linked at", "Purchases", "Robux spent", "Server points"],
          ...rows.map((r) => [r.discordId, r.discordName, r.robloxId, r.robloxName, r.linkedAt, r.purchases, r.spentRobux, r.points]),
        ]),
      );
    } catch {
      toast({ tone: "error", title: t("common.error") });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Purpose icon="link">{t("rbx.linkedPurpose")}</Purpose>
      <ListCard
        toolbar={
          <>
            <div className="min-w-48 flex-1">
              <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("rbx.searchLinked")} aria-label={t("rbx.searchLinked")} leading={<Icon name="search" size={16} />} maxLength={64} />
            </div>
            <Segmented
              size="sm"
              label={t("dir.sortBy")}
              value={sort}
              onChange={setSort}
              options={[
                { value: "spent" as LinkedSort, label: t("rbx.sort.spent") },
                { value: "linked" as LinkedSort, label: t("rbx.sort.linked") },
                { value: "points" as LinkedSort, label: t("rbx.sort.points") },
              ]}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={copy} loading={busy === "copy"} disabled={!list.total}>
                <Icon name="copyList" size={16} />
                {t("rbx.copyList")}
              </Button>
              <Button size="sm" variant="secondary" onClick={csv} loading={busy === "csv"} disabled={!list.total}>
                <Icon name="download" size={16} />
                CSV
              </Button>
            </div>
          </>
        }
        state={{
          error: list.error,
          loading: list.items === null,
          empty: list.items?.length === 0,
          reload: list.reload,
          emptyView: <EmptyState art={query ? "search" : "quiet"} title={query ? t("dir.noMatch") : t("rbx.noLinked")} hint={query ? undefined : t("rbx.noLinkedHint")} />,
        }}
        footer={<LoadMore list={list} />}
      >
        <ul className="divide-y divide-line">
          {list.items?.map((p) => (
            <li key={p.discordId}>
              <button
                type="button"
                onClick={() => onOpen(p.discordId)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-start transition hover:bg-surface-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_repeat(4,minmax(4.5rem,auto))]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar name={p.discordName} src={p.avatarUrl} size={36} />
                  <span className="min-w-0">
                    <bdi className="block truncate text-sm font-semibold text-ink">{p.discordName}</bdi>
                    <span className="block truncate text-[11px] text-ink-3 md:hidden" dir="ltr">
                      {p.robloxName}
                    </span>
                  </span>
                </span>
                <span className="hidden min-w-0 items-center gap-2.5 md:flex">
                  <RobloxHeadshot userId={p.robloxId} name={p.robloxName} size={32} />
                  <span className="truncate text-sm text-ink-2" dir="ltr">
                    {p.robloxName}
                  </span>
                </span>
                <Stat label={t("rbx.col.linked")} value={<TimeAgo at={p.linkedAt} />} className="hidden md:block" />
                <Stat label={t("rbx.col.purchases")} value={f.n(p.purchases)} className="hidden md:block" />
                <Stat label={t("rbx.col.spent")} value={f.robux(p.spentRobux)} />
                <Stat label={t("rbx.col.points")} value={f.compact(p.points)} className="hidden md:block" />
              </button>
            </li>
          ))}
        </ul>
      </ListCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// 2 · Link candidates
// ---------------------------------------------------------------------------

const MIN_POINTS = [0, 200, 500, 1_000, 3_000] as const;

function CandidatesTab({ initialQuery }: { initialQuery: string }) {
  const { t } = useApp();
  const f = useFormat();
  const { guild, href } = useGuild();
  const { pending, run } = useAction();
  const [q, setQ] = useState(initialQuery);
  const [sort, setSort] = useState<CandidateSort>("points");
  const [ticket, setTicket] = useState(false);
  const [min, setMin] = useState<number>(0);
  const [confirm, setConfirm] = useState<Candidate | null>(null);
  const query = useDebounced(q);
  const list = usePagedList<Candidate>("/api/roblox/candidates", { q: query, sort, guild, hasTicket: ticket ? 1 : undefined, minPoints: min || undefined }, 30);

  const invite = async () => {
    if (!confirm) return;
    const who = confirm;
    const res = await run(
      `invite:${who.discordId}`,
      () => api<{ invitedAt: string }>(`/api/roblox/candidates/${who.discordId}/invite${qs({ guild })}`, { method: "POST", body: { confirm: true } }),
      t("rbx.invitedToast", { name: who.name }),
    );
    setConfirm(null);
    if (res) list.patch((r) => r.discordId === who.discordId, (r) => ({ ...r, invitedAt: res.invitedAt }));
  };

  return (
    <>
      <Purpose icon="userPlus">{t("rbx.candidatesPurpose")}</Purpose>
      <ListCard
        toolbar={
          <>
            <div className="min-w-48 flex-1">
              <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("dir.search")} aria-label={t("dir.search")} leading={<Icon name="search" size={16} />} maxLength={64} />
            </div>
            <Segmented
              size="sm"
              label={t("dir.sortBy")}
              value={sort}
              onChange={setSort}
              options={[
                { value: "points" as CandidateSort, label: t("rbx.sort.points") },
                { value: "ticket" as CandidateSort, label: t("rbx.sort.ticket") },
              ]}
            />
            <Chip active={ticket} onClick={() => setTicket((v) => !v)} icon={<Icon name="tickets" size={14} />}>
              {t("rbx.hasTicket")}
            </Chip>
            <label className="flex items-center gap-2 text-xs text-ink-3">
              <span className="whitespace-nowrap">{t("rbx.minPoints")}</span>
              <Select value={String(min)} onChange={(e) => setMin(Number(e.target.value))} className="w-28">
                {MIN_POINTS.map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? t("rbx.anyPoints") : `${f.n(n)}+`}
                  </option>
                ))}
              </Select>
            </label>
          </>
        }
        state={{
          error: list.error,
          loading: list.items === null,
          empty: list.items?.length === 0,
          reload: list.reload,
          emptyView:
            query || ticket || min ? (
              <EmptyState art="search" title={t("dir.noMatch")} />
            ) : (
              <EmptyState art="allClear" title={t("rbx.noCandidates")} hint={t("rbx.noCandidatesHint")} />
            ),
        }}
        footer={<LoadMore list={list} />}
      >
        <ul className="divide-y divide-line">
          {list.items?.map((c) => (
            <li key={c.discordId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <Link href={href("/members", { member: c.discordId })} className="flex min-w-0 flex-1 basis-56 items-center gap-3 rounded-xl transition hover:opacity-80">
                <Avatar name={c.name} src={c.avatarUrl} size={40} />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <bdi className="truncate text-sm font-semibold text-ink">{c.name}</bdi>
                    {c.openTicketId && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warn/12 px-2 py-px text-[11px] font-semibold text-warn ring-1 ring-inset ring-warn/30">
                        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-warn" />
                        {t("rbx.openTicket")}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-3">
                    {c.lastActiveAt ? (
                      <>
                        {t("rbx.active")} <TimeAgo at={c.lastActiveAt} />
                      </>
                    ) : (
                      t("rbx.neverActive")
                    )}
                  </span>
                </span>
              </Link>
              <Stat label={t("rbx.col.points")} value={f.n(c.points)} className="w-20" />
              <div className="flex min-w-0 items-center justify-end gap-2 max-sm:w-full">
                {c.openTicketId && (
                  <Link
                    href={href("/tickets", { guild: "catalog", ticket: c.openTicketId })}
                    transitionTypes={["nav"]}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-ink-2 transition hover:bg-surface-3/70 hover:text-ink"
                  >
                    <Icon name="tickets" size={16} />
                    <span className="max-sm:hidden">{t("rbx.viewTicket")}</span>
                  </Link>
                )}
                {c.invitedAt && (
                  <span className="text-xs text-ink-3">
                    {t("rbx.invited")} <TimeAgo at={c.invitedAt} />
                  </span>
                )}
                <Button size="sm" variant={c.invitedAt ? "secondary" : "soft"} onClick={() => setConfirm(c)} loading={pending === `invite:${c.discordId}`}>
                  <Icon name="send" size={16} />
                  {c.invitedAt ? t("rbx.inviteAgain") : t("rbx.invite")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </ListCard>
      <ConfirmDialog
        open={confirm !== null}
        title={confirm ? t("rbx.inviteTitle", { name: confirm.name }) : ""}
        body={t("rbx.inviteBody")}
        confirmLabel={t("rbx.invite")}
        loading={confirm ? pending === `invite:${confirm.discordId}` : false}
        onCancel={() => setConfirm(null)}
        onConfirm={invite}
      >
        {confirm?.invitedAt && (
          <p className="flex items-center gap-2 text-sm text-warn">
            <Icon name="warning" size={16} />
            <span>
              {t("rbx.alreadyInvited")} <TimeAgo at={confirm.invitedAt} />
            </span>
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// 3 · Players outside the server
// ---------------------------------------------------------------------------

function OutsideTab() {
  const { t } = useApp();
  const f = useFormat();
  const { pending, run } = useAction();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<OutsideSort>("spent");
  const [confirm, setConfirm] = useState<OutsidePlayer | null>(null);
  const query = useDebounced(q);
  const list = usePagedList<OutsidePlayer>("/api/roblox/outside", { q: query, sort }, 30);

  const nudge = async () => {
    if (!confirm) return;
    const who = confirm;
    const res = await run(
      `nudge:${who.robloxId}`,
      () => api<{ nudgedAt: string }>(`/api/roblox/outside/${who.robloxId}/nudge`, { method: "POST", body: { confirm: true } }),
      t("rbx.nudgedToast", { name: who.robloxName }),
    );
    setConfirm(null);
    if (res) list.patch((r) => r.robloxId === who.robloxId, (r) => ({ ...r, nudgedAt: res.nudgedAt }));
  };

  return (
    <>
      <Purpose icon="gamepad">{t("rbx.outsidePurpose")}</Purpose>
      <ListCard
        toolbar={
          <>
            <div className="min-w-48 flex-1">
              <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("rbx.searchOutside")} aria-label={t("rbx.searchOutside")} leading={<Icon name="search" size={16} />} maxLength={64} />
            </div>
            <Segmented
              size="sm"
              label={t("dir.sortBy")}
              value={sort}
              onChange={setSort}
              options={[
                { value: "spent" as OutsideSort, label: t("rbx.sort.spent") },
                { value: "last" as OutsideSort, label: t("rbx.sort.last") },
              ]}
            />
          </>
        }
        state={{
          error: list.error,
          loading: list.items === null,
          empty: list.items?.length === 0,
          reload: list.reload,
          emptyView: query ? <EmptyState art="search" title={t("dir.noMatch")} /> : <EmptyState art="allClear" title={t("rbx.noOutside")} hint={t("rbx.noOutsideHint")} />,
        }}
        footer={<LoadMore list={list} />}
      >
        <ul className="divide-y divide-line">
          {list.items?.map((p) => (
            <li key={p.robloxId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="flex min-w-0 flex-1 basis-48 items-center gap-3">
                <RobloxHeadshot userId={p.robloxId} name={p.robloxName} size={40} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink" dir="ltr">
                    {p.robloxName}
                  </span>
                  <span className="block text-xs text-ink-3">
                    {t("rbx.lastPurchase")} <TimeAgo at={p.lastPurchaseAt} />
                  </span>
                </span>
              </span>
              <Stat label={t("rbx.col.spent")} value={f.robux(p.spentRobux)} className="w-24" />
              <Stat label={t("rbx.col.purchases")} value={f.n(p.purchases)} className="w-16" />
              <div className="flex items-center justify-end gap-2 max-sm:w-full">
                {p.nudgedAt && (
                  <span className="text-xs text-ink-3">
                    {t("rbx.nudged")} <TimeAgo at={p.nudgedAt} />
                  </span>
                )}
                <Button size="sm" variant={p.nudgedAt ? "secondary" : "soft"} onClick={() => setConfirm(p)} loading={pending === `nudge:${p.robloxId}`}>
                  <Icon name="gamepad" size={16} />
                  {p.nudgedAt ? t("rbx.nudgeAgain") : t("rbx.nudge")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </ListCard>
      <ConfirmDialog
        open={confirm !== null}
        title={confirm ? t("rbx.nudgeTitle", { name: confirm.robloxName }) : ""}
        body={t("rbx.nudgeBody")}
        confirmLabel={t("rbx.nudge")}
        loading={confirm ? pending === `nudge:${confirm.robloxId}` : false}
        onCancel={() => setConfirm(null)}
        onConfirm={nudge}
      >
        <figure className="rounded-2xl bg-charcoal p-4 text-[#fbf2ee]">
          <figcaption className="mb-2 text-[11px] font-semibold tracking-wide text-[#c9bdc1] uppercase">{t("rbx.inGamePreview")}</figcaption>
          <p className="text-sm leading-relaxed">{t("rbx.nudgeMessage")}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#5865f2] px-3 py-1.5 text-xs font-semibold text-white">
            <Icon name="external" size={14} />
            {t("rbx.nudgeButton")}
          </span>
        </figure>
        {confirm?.nudgedAt && (
          <p className="mt-3 flex items-center gap-2 text-sm text-warn">
            <Icon name="warning" size={16} />
            <span>
              {t("rbx.alreadyNudged")} <TimeAgo at={confirm.nudgedAt} />
            </span>
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
