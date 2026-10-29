"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Scene } from "@/components/art/scenes";
import { Icon } from "@/components/icons/icon";
import { useApp } from "@/components/providers/app-provider";
import { useAttentionFor } from "@/components/providers/attention-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { ServerChip } from "@/components/shell/server-chip";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { api, qs } from "@/lib/client/api";
import type { Page, Ticket, TicketSummary } from "@/lib/types";
import { CategoryChip } from "./ticket-bits";
import { TicketConversation } from "./ticket-conversation";

type Filter = "active" | "open" | "claimed" | "closed";

/** The inbox: queue on the start side, the conversation on the end side (full screen on phones). */
export function TicketsView({ initial }: { initial: Page<TicketSummary> }) {
  const { t, user } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get("ticket");
  const [tickets, setTickets] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [closed, setClosed] = useState<TicketSummary[] | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const unclaimed = useAttentionFor("tickets:unclaimed");

  useLiveEvent("ticket", (e) => {
    if ((e.data.guild ?? "catalog") !== "catalog") return;
    setTickets((cur) => [e.data, ...cur.filter((x) => x.id !== e.data.id)]);
  });

  const select = (id: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("ticket", id);
    else next.delete("ticket");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const showClosed = async (f: Filter) => {
    setFilter(f);
    if (f === "closed" && closed === null) {
      const page = await api<Page<TicketSummary>>(`/api/tickets${qs({ status: "closed", limit: 40, guild: "catalog" })}`).catch(() => null);
      setClosed(page?.items ?? []);
    }
  };

  const counts = useMemo(
    () => ({ active: tickets.filter((x) => x.status !== "closed").length, open: tickets.filter((x) => x.status === "open").length, claimed: tickets.filter((x) => x.status === "claimed").length }),
    [tickets],
  );

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/^#/, "");
    const base = filter === "closed" ? (closed ?? []) : tickets.filter((x) => (filter === "active" ? x.status !== "closed" : x.status === filter));
    return base
      .filter((x) => !mine || x.claimedBy?.discordId === user?.discordId)
      .filter((x) => !term || String(x.number).includes(term) || x.subject.toLowerCase().includes(term) || x.openedBy.name.toLowerCase().includes(term))
      .sort((a, b) => (filter === "open" || filter === "active" ? (a.status === b.status ? a.openedAt.localeCompare(b.openedAt) : a.status === "open" ? -1 : 1) : b.lastMessageAt.localeCompare(a.lastMessageAt)));
  }, [tickets, closed, filter, mine, q, user]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    const page = await api<Page<TicketSummary>>(`/api/tickets${qs({ status: "active", limit: 40, guild: "catalog", cursor })}`).catch(() => null);
    setLoadingMore(false);
    if (!page) return;
    setTickets((cur) => [...cur, ...page.items.filter((x) => !cur.some((c) => c.id === x.id))]);
    setCursor(page.nextCursor);
  };

  const onChange = (next: Ticket) => setTickets((cur) => cur.map((x) => (x.id === next.id ? { ...x, ...next } : x)));

  return (
    <>
      <PageHeader eyebrow={<ServerChip />} title={t("nav.tickets")} subtitle={t("inbox.subtitle")} />
      <div className="glass grid overflow-hidden rounded-[var(--radius-card)] lg:h-[calc(100dvh-13rem)] lg:min-h-[34rem] lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Queue */}
        <section aria-label={t("tickets.title")} className={cn("flex min-h-0 flex-col border-line lg:border-e", selected && "max-lg:hidden")}>
          <div className="space-y-3 border-b border-line p-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("inbox.search")} aria-label={t("inbox.search")} leading={<Icon name="search" size={16} />} />
            <div className="flex items-center gap-2">
              <Segmented
                size="sm"
                label={t("tickets.title")}
                value={filter}
                onChange={(v) => void showClosed(v)}
                options={[
                  { value: "active" as Filter, label: t("inbox.all"), count: counts.active },
                  { value: "open" as Filter, label: t("tickets.status.open"), count: counts.open },
                  { value: "claimed" as Filter, label: t("tickets.status.claimed") },
                  { value: "closed" as Filter, label: t("inbox.closedTab") },
                ]}
              />
              <Chip active={mine} onClick={() => setMine((m) => !m)} className="ms-auto shrink-0" icon={<Icon name="user" size={14} />}>
                {t("inbox.mine")}
              </Chip>
            </div>
          </div>
          {shown.length === 0 ? (
            <EmptyState art="allClear" title={t("inbox.empty")} hint={t("inbox.emptyHint")} compact className="flex-1" />
          ) : (
            <ul id="t-tickets-unclaimed" className={cn("min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2 max-lg:max-h-[70dvh]", unclaimed === "critical" && "scroll-mt-24")}>
              {shown.map((tk) => (
                <TicketRow key={tk.id} ticket={tk} active={tk.id === selected} onSelect={() => select(tk.id)} />
              ))}
              {cursor && filter !== "closed" && (
                <li className="p-2">
                  <Button variant="ghost" size="sm" className="w-full" loading={loadingMore} onClick={() => void loadMore()}>
                    {t("common.loadMore")}
                  </Button>
                </li>
              )}
            </ul>
          )}
        </section>

        {/* Conversation */}
        <section aria-label={t("tickets.reply")} className={cn("min-h-0 bg-surface", !selected && "max-lg:hidden", selected && "max-lg:min-h-[calc(100dvh-14rem)]")}>
          {selected ? (
            <TicketConversation key={selected} ticketId={selected} onBack={() => select(null)} onChange={onChange} />
          ) : (
            <div className="grid h-full place-items-center p-8">
              <div className="flex max-w-xs flex-col items-center text-center">
                <Scene name="tickets" className="h-40 w-auto" />
                <p className="font-display mt-2 text-lg font-semibold">{t("inbox.pick")}</p>
                <p className="mt-1 text-sm text-ink-3">{t("inbox.pickHint")}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function TicketRow({ ticket: tk, active, onSelect }: { ticket: TicketSummary; active: boolean; onSelect: () => void }) {
  const { t } = useApp();
  const attention = useAttentionFor(`ticket:${tk.id}`);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "relative flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-start transition-[background-color,transform] duration-[var(--dur-fast)] active:scale-[0.99]",
          active ? "bg-[color-mix(in_oklab,var(--color-accent-500)_9%,var(--color-surface))] ring-1 ring-accent-500/25" : "hover:bg-surface-2",
        )}
      >
        {tk.status === "open" && <span aria-hidden className={cn("absolute top-4 start-1 size-1.5 rounded-full", attention === "critical" ? "bg-bad needs-attention" : "bg-warn")} />}
        <Avatar name={tk.openedBy.name} src={tk.openedBy.avatarUrl} size={36} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <bdi className="truncate text-sm font-semibold">{tk.openedBy.name}</bdi>
            <TimeAgo at={tk.lastMessageAt} className="ms-auto shrink-0 text-[11px] text-ink-3" />
          </span>
          <span className="mt-0.5 block truncate text-sm text-ink-2">
            <span className="tabular text-ink-3">#{tk.number}</span> <bdi>{tk.subject}</bdi>
          </span>
          <span className="mt-1.5 flex items-center gap-1.5">
            <CategoryChip category={tk.category} />
            {tk.status === "open" ? (
              <span className="rounded-md bg-warn/14 px-1.5 py-px text-[11px] font-semibold text-warn">{t("tickets.unclaimed")}</span>
            ) : tk.status === "claimed" && tk.claimedBy ? (
              <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-ink-3">
                <Avatar name={tk.claimedBy.name} src={tk.claimedBy.avatarUrl} size={16} />
                <bdi className="truncate">{tk.claimedBy.name}</bdi>
              </span>
            ) : (
              <span className="rounded-md bg-surface-3 px-1.5 py-px text-[11px] font-semibold text-ink-3">{t("tickets.status.closed")}</span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}
