"use client";

import { useMemo, useState } from "react";
import { ChevronRight, LifeBuoy } from "lucide-react";
import { useT } from "@/components/providers/app-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import type { TicketSummary } from "@/lib/types";
import { TICKET_TONE, TicketDrawer } from "./ticket-drawer";

type Filter = "active" | "open" | "claimed";

export function TicketQueue({ initial }: { initial: TicketSummary[] }) {
  const t = useT();
  const [tickets, setTickets] = useState(initial);
  const [filter, setFilter] = useState<Filter>("active");
  const [openId, setOpenId] = useState<string | null>(null);

  useLiveEvent("ticket", (e) => {
    setTickets((cur) => {
      const rest = cur.filter((x) => x.id !== e.data.id);
      return e.data.status === "closed" ? rest : [e.data, ...rest];
    });
  });

  const shown = useMemo(
    () =>
      tickets
        .filter((x) => (filter === "active" ? x.status !== "closed" : x.status === filter))
        .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
    [tickets, filter],
  );

  return (
    <Card aria-labelledby="tickets-title" className="flex flex-col">
      <CardHeader
        id="tickets-title"
        title={t("overview.tickets")}
        icon={<LifeBuoy className="size-4" aria-hidden />}
        actions={
          <Segmented
            size="sm"
            label={t("tickets.title")}
            value={filter}
            onChange={setFilter}
            options={(["active", "open", "claimed"] as const).map((v) => ({ value: v, label: t(`tickets.status.${v}`) }))}
          />
        }
      />
      {shown.length === 0 ? (
        <EmptyState title={t("tickets.empty")} />
      ) : (
        <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto px-2 pb-2">
          {shown.map((tk) => (
            <li key={tk.id} className="animate-fade-in">
              <button
                type="button"
                onClick={() => setOpenId(tk.id)}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition hover:bg-white/[0.04]"
              >
                <Avatar name={tk.openedBy.name} src={tk.openedBy.avatarUrl} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="tabular shrink-0 text-xs text-ink-3">#{tk.number}</span>
                    <span className="truncate text-sm font-medium text-ink">{tk.subject}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs whitespace-nowrap text-ink-3">
                    <span className="min-w-0 truncate">{tk.openedBy.name}</span>
                    <span aria-hidden>·</span>
                    <span className="shrink-0">{t(`tickets.category.${tk.category}`)}</span>
                    <span aria-hidden>·</span>
                    <TimeAgo at={tk.lastMessageAt} className="shrink-0" />
                  </span>
                </span>
                <Badge tone={TICKET_TONE[tk.status]}>{t(`tickets.status.${tk.status}`)}</Badge>
                <ChevronRight aria-hidden className="size-4 text-ink-3 transition group-hover:text-ink-2 rtl:-scale-x-100" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <TicketDrawer ticketId={openId} onClose={() => setOpenId(null)} />
    </Card>
  );
}
