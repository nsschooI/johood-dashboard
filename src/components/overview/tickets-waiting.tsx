"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons/icon";
import { useApp } from "@/components/providers/app-provider";
import { useAttentionFor } from "@/components/providers/attention-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import type { TicketSummary } from "@/lib/types";
import { CategoryChip } from "@/components/tickets/ticket-bits";

/** The oldest tickets nobody has claimed come first. */
export function TicketsWaiting({ initial, limit = 5 }: { initial: TicketSummary[]; limit?: number }) {
  const { t } = useApp();
  const { href, guild } = useGuild();
  const [tickets, setTickets] = useState(initial);
  const attention = useAttentionFor("tickets:unclaimed");
  useLiveEvent("ticket", (e) => {
    if ((e.data.guild ?? "catalog") !== guild) return;
    setTickets((cur) => [e.data, ...cur.filter((x) => x.id !== e.data.id)]);
  });
  const open = useMemo(
    () =>
      tickets
        .filter((x) => x.status !== "closed")
        .sort((a, b) => (a.status === b.status ? a.openedAt.localeCompare(b.openedAt) : a.status === "open" ? -1 : 1))
        .slice(0, limit),
    [tickets, limit],
  );
  return (
    <Card id="t-tickets-unclaimed" aria-labelledby="tw-title" className={cn("flex scroll-mt-24 flex-col", attention === "critical" && "ring-2 ring-bad/40")}>
      <CardHeader id="tw-title" icon="tickets" title={t("home.tickets.title")} />
      {open.length === 0 ? (
        <EmptyState art="allClear" title={t("home.tickets.empty")} compact />
      ) : (
        <ul className="space-y-1 px-2 pb-2">
          {open.map((tk) => (
            <li key={tk.id}>
              <Link href={href("/tickets", { ticket: tk.id })} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface-2 active:scale-[0.99]">
                <Avatar name={tk.openedBy.name} src={tk.openedBy.avatarUrl} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    <span className="tabular text-ink-3">#{tk.number}</span> <bdi>{tk.subject}</bdi>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">
                    <CategoryChip category={tk.category} />
                    <TimeAgo at={tk.openedAt} />
                  </p>
                </div>
                {tk.status === "open" ? (
                  <span className="shrink-0 rounded-full bg-warn/14 px-2 py-0.5 text-[11px] font-semibold text-warn">{t("home.tickets.unclaimed")}</span>
                ) : (
                  tk.claimedBy && <Avatar name={tk.claimedBy.name} src={tk.claimedBy.avatarUrl} size={22} />
                )}
                <Icon name="chevronRight" size={16} mirror className="text-ink-4 transition group-hover:text-ink-2" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={href("/tickets")} transitionTypes={["nav"]} className="mt-auto flex items-center justify-center gap-1 border-t border-line py-3 text-sm font-semibold text-accent-300 transition hover:bg-surface-2">
        {t("home.tickets.seeAll")}
        <Icon name="arrowRight" size={16} mirror />
      </Link>
    </Card>
  );
}
