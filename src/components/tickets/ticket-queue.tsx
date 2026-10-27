"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, ChevronRight, Hand, LifeBuoy, MessageSquare } from "lucide-react";
import { useT, useWhyNot } from "@/components/providers/app-provider";
import { useAttentionFor } from "@/components/providers/attention-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { PersonAvatar } from "@/components/people/person";
import { ActionMenuButton, useContextMenu } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import type { MenuSection } from "@/components/ui/menu";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { GuildIcon } from "@/components/shell/guild-mark";
import { anchorId } from "@/lib/client/anchors";
import type { TicketSummary } from "@/lib/types";
import { TICKET_TONE } from "./ticket-drawer";
import { useOpenTicket } from "./ticket-drawer-provider";

type Filter = "active" | "open" | "claimed";

export function TicketQueue({ initial }: { initial: TicketSummary[] }) {
  const t = useT();
  const { guild, info, setGuild } = useGuild();
  const [tickets, setTickets] = useState(initial);
  const [filter, setFilter] = useState<Filter>("active");
  const unclaimedAttention = useAttentionFor("tickets:unclaimed");

  useLiveEvent("ticket", (e) => {
    if ((e.data.guild ?? "catalog") !== guild) return;
    setTickets((cur) => {
      const rest = cur.filter((x) => x.id !== e.data.id);
      return e.data.status === "closed" ? rest : [e.data, ...rest];
    });
  });

  const counts = useMemo(() => ({ active: tickets.length, open: tickets.filter((x) => x.status === "open").length, claimed: tickets.filter((x) => x.status === "claimed").length }), [tickets]);
  const shown = useMemo(
    () => tickets.filter((x) => (filter === "active" ? x.status !== "closed" : x.status === filter)).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
    [tickets, filter],
  );
  const catalog = info("catalog");

  return (
    <Card id={anchorId("tickets:unclaimed")} aria-labelledby="tickets-title" className={cn("flex scroll-mt-24 flex-col", unclaimedAttention && "border-warn/35")}>
      <CardHeader
        id="tickets-title"
        title={t("overview.tickets")}
        icon={<LifeBuoy className="size-4" aria-hidden />}
        actions={
          guild === "catalog" && (
            <Segmented
              size="sm"
              label={t("tickets.title")}
              value={filter}
              onChange={setFilter}
              options={(["active", "open", "claimed"] as const).map((v) => ({ value: v, label: t(`tickets.status.${v}`), count: counts[v] }))}
            />
          )
        }
      />
      {guild !== "catalog" ? (
        <EmptyState
          art="tickets"
          title={t("guild.ticketsElsewhere")}
          hint={t("overview.noTicketsHere")}
          action={
            <Button size="sm" onClick={() => setGuild("catalog")}>
              <GuildIcon guild="catalog" info={catalog} size={18} />
              {t("guild.switchTo", { name: catalog?.name ?? "JoHood Catalog" })}
            </Button>
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState art="tickets" title={t("tickets.empty")} />
      ) : (
        <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto px-2 pb-2">
          {shown.map((tk) => (
            <TicketRow key={tk.id} ticket={tk} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export function useTicketSections(tk: TicketSummary): MenuSection[] {
  const t = useT();
  const why = useWhyNot();
  const open = useOpenTicket();
  return [
    {
      title: `#${tk.number}`,
      items: [
        { key: "open", label: t("menu.openTicket"), icon: <MessageSquare />, onSelect: () => open(tk.id) },
        { key: "claim", label: t("tickets.claim"), icon: <Hand />, onSelect: () => open(tk.id), disabledReason: why("tickets.claim") ?? (tk.status === "open" ? null : t("tickets.status.claimed")) },
        { key: "transfer", label: t("tickets.transfer"), icon: <ArrowLeftRight />, onSelect: () => open(tk.id), disabledReason: why("tickets.transfer") },
        { key: "close", label: t("tickets.close"), icon: <LifeBuoy />, danger: true, onSelect: () => open(tk.id), disabledReason: why("tickets.close") },
      ],
    },
  ];
}

function TicketRow({ ticket: tk }: { ticket: TicketSummary }) {
  const t = useT();
  const open = useOpenTicket();
  const attention = useAttentionFor(`ticket:${tk.id}`);
  const sections = useTicketSections(tk);
  const ctx = useContextMenu(`#${tk.number}`, sections);
  return (
    <li className="animate-fade-in" onContextMenu={ctx.onContextMenu}>
      <div className={cn("group flex w-full items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.04]", attention && "bg-warn/[0.05]")}>
        <PersonAvatar person={tk.openedBy} size={32} />
        <button type="button" onClick={() => open(tk.id)} className="min-w-0 flex-1 text-start">
          <span className="flex items-center gap-2">
            <span className="tabular shrink-0 text-xs text-ink-3">#{tk.number}</span>
            <span dir="auto" className="truncate text-sm font-medium text-ink">
              {tk.subject}
            </span>
            {attention && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", attention === "critical" ? "bg-bad" : "bg-warn", "motion-safe:animate-pulse")} />}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs whitespace-nowrap text-ink-3">
            <bdi className="min-w-0 truncate">{tk.openedBy.name}</bdi>
            <span aria-hidden>·</span>
            <span className="shrink-0">{t(`tickets.category.${tk.category}`)}</span>
            <span aria-hidden>·</span>
            <TimeAgo at={tk.lastMessageAt} className="shrink-0" />
          </span>
        </button>
        {tk.claimedBy && <PersonAvatar person={tk.claimedBy} size={22} className="hidden sm:inline-flex" />}
        <Badge tone={TICKET_TONE[tk.status]}>{t(`tickets.status.${tk.status}`)}</Badge>
        <ActionMenuButton label={`#${tk.number}`} sections={sections} />
        <ChevronRight aria-hidden className="hidden size-4 text-ink-3 transition group-hover:translate-x-0.5 sm:block rtl:-scale-x-100" />
      </div>
      {ctx.popover}
    </li>
  );
}
