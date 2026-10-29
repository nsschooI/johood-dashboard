"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/icon";
import { useCan, useFormat, useT } from "@/components/providers/app-provider";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Segmented } from "@/components/ui/segmented";
import { Stars } from "@/components/ui/stars";
import { EmptyState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { useOpenTicket } from "@/components/tickets/ticket-drawer-provider";
import { useAttention } from "@/components/providers/attention-provider";
import { RobloxHeadshot } from "@/components/ui/roblox";
import { anchorId } from "@/lib/client/anchors";
import { api, qs } from "@/lib/client/api";
import type { Page, Transfer, TransferStatus } from "@/lib/types";
import { Table, Td, Th } from "./tables";

export const TRANSFER_TONE: Record<TransferStatus, Tone> = { pending: "warn", processing: "info", completed: "good", failed: "bad", refunded: "neutral" };

type Filter = "all" | TransferStatus;

export function TransfersTable({ initial, live, fresh }: { initial: Page<Transfer>; live: Transfer[]; fresh: ReadonlySet<string> }) {
  const t = useT();
  const f = useFormat();
  const can = useCan();
  const [filter, setFilter] = useState<Filter>("all");
  const [older, setOlder] = useState<Transfer[]>([]);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const openTicket = useOpenTicket();
  const { targets } = useAttention();

  // `live` holds the newest list (initial page merged with stream updates).
  const all = [...live, ...older.filter((o) => !live.some((l) => l.id === o.id))];
  const rows = filter === "all" ? all : all.filter((x) => x.status === filter);

  const loadMore = async () => {
    if (!cursor) return;
    setLoading(true);
    try {
      const page = await api<Page<Transfer>>(`/api/transfers${qs({ cursor, limit: 25 })}`);
      setOlder((o) => [...o, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card id={anchorId("transfers:failed")} aria-labelledby="transfers-title" className="flex scroll-mt-24 flex-col overflow-hidden">
      <CardHeader
        id="transfers-title"
        title={t("points.transfers")}
        icon="transfer"
        actions={
          <Segmented
            size="sm"
            label={t("points.col.status")}
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("common.all") },
              ...(["pending", "processing", "completed", "failed"] as const).map((s) => ({ value: s, label: t(`points.status.${s}`) })),
            ]}
          />
        }
      />
      {rows.length === 0 ? (
        <EmptyState art="purchases" title={t("points.transfersEmpty")} hint={t("points.transfersEmptyHint")} />
      ) : (
        <Table label={t("points.transfers")} className="max-h-[30rem]">
          <thead>
            <tr>
              <Th>{t("points.col.time")}</Th>
              <Th>{t("points.col.member")}</Th>
              <Th end>{t("points.col.robux")}</Th>
              <Th end>{t("points.col.points")}</Th>
              <Th>{t("points.col.status")}</Th>
              <Th>{t("points.col.review")}</Th>
              <Th>{t("points.col.ticket")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr
                key={x.id}
                className={cn(
                  "transition-colors hover:bg-surface-2",
                  fresh.has(x.id) && "live-in",
                  targets.get(`transfer:${x.id}`) === "warning" && "bg-bad/[0.05]",
                  targets.get(`transfer:${x.id}`) === "info" && "bg-warn/[0.04]",
                )}
              >
                <Td className="text-xs whitespace-nowrap text-ink-3">
                  <TimeAgo at={x.at} />
                </Td>
                <Td className="font-medium text-ink">
                  <span className="flex items-center gap-2">
                    <RobloxHeadshot userId={x.robloxId} name={x.robloxName} size={26} />
                    <span dir="ltr" className="truncate">
                      {x.robloxName}
                    </span>
                  </span>
                </Td>
                <Td end className="tabular font-medium whitespace-nowrap text-ink">
                  {f.robux(x.robux)}
                </Td>
                <Td end className="tabular whitespace-nowrap text-ink-3">
                  −{f.n(x.points)}
                </Td>
                <Td>
                  <Badge tone={TRANSFER_TONE[x.status]}>{t(`points.status.${x.status}`)}</Badge>
                </Td>
                <Td className="max-w-56">
                  {x.stars ? (
                    <span className="flex flex-col gap-0.5">
                      <Stars value={x.stars} label={`${x.stars}/5`} />
                      {x.comment && <bdi className="self-start truncate text-[11px] text-ink-3" title={x.comment}>“{x.comment}”</bdi>}
                    </span>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </Td>
                <Td>
                  {x.ticketId && can("tickets.view") ? (
                    <Button size="sm" variant="ghost" onClick={() => openTicket(x.ticketId!)} className="text-accent-300">
                      <Icon name="message" size={14} />
                      {t("tickets.title")}
                    </Button>
                  ) : (
                    <span className="text-ink-3">{x.ticketId ? "•" : "—"}</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {cursor && (
        <div className="border-t border-line p-3 text-center">
          <Button size="sm" variant="ghost" onClick={loadMore} loading={loading}>
            {t("common.loadMore")}
          </Button>
        </div>
      )}
    </Card>
  );
}
