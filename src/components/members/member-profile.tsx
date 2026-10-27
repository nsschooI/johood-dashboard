"use client";

import { useEffect, useState } from "react";
import { Gamepad2, Lock, UserRound } from "lucide-react";
import { useFormat, useT } from "@/components/providers/app-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { TICKET_TONE, TicketDrawer } from "@/components/tickets/ticket-drawer";
import { api } from "@/lib/client/api";
import type { MemberProfile, MemberSummary } from "@/lib/types";
import { MemberSearch, RankBadge } from "./member-search";

export function MembersPanel({ initial }: { initial: MemberSummary[] }) {
  const t = useT();
  const [selected, setSelected] = useState<MemberSummary | null>(initial[0] ?? null);
  return (
    <Card aria-labelledby="members-title">
      <CardHeader id="members-title" title={t("members.search")} icon={<UserRound className="size-4" aria-hidden />} />
      <div className="grid gap-6 px-5 pb-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <MemberSearch onSelect={setSelected} selectedId={selected?.discordId} initial={initial} limit={10} />
        <div className="min-w-0">
          {selected ? <Profile key={selected.discordId} id={selected.discordId} /> : <EmptyState title={t("members.pickMember")} />}
        </div>
      </div>
    </Card>
  );
}

function Profile({ id }: { id: string }) {
  const t = useT();
  const f = useFormat();
  const [p, setP] = useState<MemberProfile | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [ticket, setTicket] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setError(false);
    api<MemberProfile>(`/api/members/${id}`, { signal: ctrl.signal })
      .then(setP)
      .catch(() => !ctrl.signal.aborted && setError(true));
    return () => ctrl.abort();
  }, [id, reload]);

  if (error) return <ErrorState title={t("common.error")} action={<Button onClick={() => setReload((n) => n + 1)}>{t("common.retry")}</Button>} />;
  if (!p)
    return (
      <div className="space-y-3" aria-busy>
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );

  const economy = p.points !== null;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar name={p.displayName} src={p.avatarUrl} size={56} />
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {p.displayName}
            <RankBadge rank={p.rank} />
          </h3>
          <p className="text-xs text-ink-3" dir="ltr">
            @{p.username} · {p.discordId}
          </p>
          <p className="mt-1 text-xs text-ink-3">
            {t("members.joined")} {f.date(p.joinedAt)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label={t("members.roles")}>
        {p.roles.map((r) => (
          <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-ink-2 ring-1 ring-inset ring-line">
            <span aria-hidden className="size-2 rounded-full" style={{ background: r.color }} />
            {r.name}
          </span>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-line">
          <p className="flex items-center gap-1.5 text-xs text-ink-3">
            <Gamepad2 aria-hidden className="size-3.5" />
            {t("members.roblox")}
          </p>
          {p.roblox ? (
            <>
              <p className="mt-1 font-medium text-ink" dir="ltr">
                {p.roblox.robloxName}
              </p>
              <p className="text-xs text-ink-3">
                <span dir="ltr">#{p.roblox.robloxId}</span> · {t("members.verified", { date: f.date(p.roblox.verifiedAt) })}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-3">{t("members.notLinked")}</p>
          )}
        </div>
        {economy ? (
          <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-line">
            <div>
              <dt className="text-xs text-ink-3">{t("members.points")}</dt>
              <dd className="tabular mt-1 font-semibold">{f.n(p.points!)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">{t("members.lifetime")}</dt>
              <dd className="tabular mt-1 font-semibold">{f.n(p.lifetimePoints!)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">{t("members.spent")}</dt>
              <dd className="tabular mt-1 font-semibold">{f.robux(p.totalRobux!)}</dd>
            </div>
          </dl>
        ) : (
          <p className="flex items-center gap-2 rounded-2xl bg-white/[0.03] p-4 text-xs text-ink-3 ring-1 ring-inset ring-line">
            <Lock aria-hidden className="size-4 shrink-0" />
            {t("members.restricted")}
          </p>
        )}
      </div>

      {p.purchases && (
        <section aria-label={t("members.purchases")}>
          <h4 className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">{t("members.purchases")}</h4>
          {p.purchases.length === 0 ? (
            <p className="text-sm text-ink-3">{t("members.noPurchases")}</p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl ring-1 ring-inset ring-line">
              {p.purchases.slice(0, 6).map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-ink-2">{x.item}</span>
                  <span className="tabular text-ink">{f.robux(x.robux)}</span>
                  <span className="tabular w-12 text-end text-accent-300">+{f.n(x.points)}</span>
                  <TimeAgo at={x.at} className="hidden w-24 text-end text-xs text-ink-3 sm:block" />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-label={t("members.tickets")}>
        <h4 className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">{t("members.tickets")}</h4>
        {p.tickets.length === 0 ? (
          <p className="text-sm text-ink-3">{t("members.noTickets")}</p>
        ) : (
          <ul className="space-y-1">
            {p.tickets.slice(0, 6).map((tk) => (
              <li key={tk.id}>
                <button type="button" onClick={() => setTicket(tk.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm hover:bg-white/[0.04]">
                  <span className="tabular text-xs text-ink-3">#{tk.number}</span>
                  <span className="min-w-0 flex-1 truncate">{tk.subject}</span>
                  <Badge tone={TICKET_TONE[tk.status]}>{t(`tickets.status.${tk.status}`)}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <TicketDrawer ticketId={ticket} onClose={() => setTicket(null)} />
    </div>
  );
}
