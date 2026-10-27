"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Coins, Gamepad2, LifeBuoy, Lock, ShoppingBag, UserRound } from "lucide-react";
import { useApp, useCan, useFormat, useT } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { usePersonSections } from "@/components/people/person";
import { useOpenTicket } from "@/components/tickets/ticket-drawer-provider";
import { TICKET_TONE } from "@/components/tickets/ticket-drawer";
import { GuildIcon } from "@/components/shell/guild-mark";
import { ActionMenuButton } from "@/components/ui/action-menu";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/components/ui/cn";
import { ItemThumb, RobloxHeadshot } from "@/components/ui/roblox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { api, qs } from "@/lib/client/api";
import { useLoad } from "@/lib/client/use-load";
import type { LedgerEntry, MemberProfile, MemberSummary, Page } from "@/lib/types";
import { MemberSearch, RankBadge } from "./member-search";

export function MembersPanel({ initial }: { initial: MemberSummary[] }) {
  const t = useT();
  const params = useSearchParams();
  const preset = params.get("member");
  const [selected, setSelected] = useState<string | null>(preset ?? initial[0]?.discordId ?? null);
  return (
    <Card id="t-members" aria-labelledby="members-title" className="scroll-mt-24">
      <CardHeader id="members-title" title={t("members.search")} icon={<UserRound className="size-4" aria-hidden />} />
      <div className="grid gap-6 px-5 pb-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <MemberSearch onSelect={(m) => setSelected(m.discordId)} selectedId={selected} initial={initial} limit={10} />
        <div className="min-w-0">{selected ? <Profile key={selected} id={selected} /> : <EmptyState art="people" title={t("members.pickMember")} />}</div>
      </div>
    </Card>
  );
}

function memberFor(joinedAt: string, locale: string) {
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(joinedAt)) / 86_400_000));
  const rtf = new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : "en", { maximumFractionDigits: 0 });
  if (days < 31) return `${rtf.format(days)} ${locale === "ar" ? "يوم" : days === 1 ? "day" : "days"}`;
  if (days < 365) return `${rtf.format(Math.floor(days / 30))} ${locale === "ar" ? "شهر" : "mo"}`;
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return locale === "ar" ? `${y} سنة${m ? ` و${m} شهر` : ""}` : `${y} y${m ? ` ${m} mo` : ""}`;
}

function Profile({ id }: { id: string }) {
  const t = useT();
  const { locale } = useApp();
  const f = useFormat();
  const can = useCan();
  const openTicket = useOpenTicket();
  const { guild, guilds, info, setGuild } = useGuild();
  const { data: p, error, reload } = useLoad(`${guild}:${id}`, (signal) =>
    api<MemberProfile>(`/api/members/${id}?guild=${guild}`, { signal }).catch((e) => {
      if (e?.status === 404) return null;
      throw e;
    }),
  );
  const { data: ledger } = useLoad(p && p.points !== null && can("points.view") ? `ledger:${id}` : null, (signal) =>
    api<Page<LedgerEntry>>(`/api/points/ledger/${id}${qs({ limit: 5 })}`, { signal }),
  );
  const sections = usePersonSections({ discordId: id, name: p?.displayName ?? id, avatarUrl: p?.avatarUrl });

  if (error) return <ErrorState title={t("common.error")} action={<Button onClick={reload}>{t("common.retry")}</Button>} />;
  if (p === undefined)
    return (
      <div className="space-y-3" aria-busy>
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  if (p === null) {
    const other = guilds.find((g) => g.key !== guild);
    return (
      <EmptyState
        art="people"
        title={t("guild.notMember", { name: info(guild)?.name ?? "" })}
        action={
          other && (
            <Button size="sm" onClick={() => setGuild(other.key)}>
              <GuildIcon guild={other.key} info={other} size={18} />
              {t("guild.switchTo", { name: other.name })}
            </Button>
          )
        }
      />
    );
  }

  const color = p.roles.find((r) => r.color && r.color !== "#64748b" && r.color !== "#94a3b8")?.color ?? "#b06ef2";
  const economy = p.points !== null;

  return (
    <div className="stagger space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-inset ring-line">
        <div aria-hidden className="h-24" style={{ background: `linear-gradient(120deg, ${color}aa, ${color}22 55%, transparent), radial-gradient(circle at 85% 20%, #f08bd055, transparent 55%)` }}>
          <svg className="size-full opacity-[0.15]" aria-hidden>
            <defs>
              <pattern id="pf-dots" width="14" height="14" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="#fff" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pf-dots)" />
          </svg>
        </div>
        <div className="-mt-10 flex flex-wrap items-end gap-4 bg-gradient-to-b from-transparent to-white/[0.02] px-4 pb-4">
          <Avatar name={p.displayName} src={p.avatarUrl} size={84} ring={color} className="rounded-full bg-surface ring-4 ring-surface" />
          <div className="min-w-0 flex-1 pb-1">
            <h3 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
              {p.displayName}
              <RankBadge rank={p.rank} size="md" />
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
              <span dir="ltr">@{p.username}</span>
              <span className="inline-flex items-center gap-1" dir="ltr">
                {p.discordId}
                <CopyButton value={p.discordId} className="size-5" />
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays aria-hidden className="size-3.5" />
                {t("members.memberFor", { d: memberFor(p.joinedAt, locale) })}
              </span>
            </p>
          </div>
          <ActionMenuButton label={p.displayName} sections={sections} size="icon" />
        </div>
        {p.roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-3" aria-label={t("members.roles")}>
            {p.roles.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset"
                style={{ background: `${r.color}1f`, color: r.color, boxShadow: `inset 0 0 0 1px ${r.color}40` }}
              >
                <span aria-hidden className="size-2 rounded-full" style={{ background: r.color }} />
                {r.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Roblox */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-line">
          {p.roblox ? (
            <>
              <RobloxHeadshot userId={p.roblox.robloxId} name={p.roblox.robloxName} size={52} />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs text-ink-3">
                  <Gamepad2 aria-hidden className="size-3.5" />
                  {t("members.roblox")}
                  <Badge tone="good">{t("members.linked")}</Badge>
                </p>
                <p className="mt-1 truncate font-semibold text-ink" dir="ltr">
                  {p.roblox.robloxName}
                </p>
                <p className="flex items-center gap-1 text-[11px] text-ink-3">
                  <span dir="ltr">#{p.roblox.robloxId}</span>
                  <CopyButton value={p.roblox.robloxId} label={t("menu.copyRoblox")} className="size-5" />
                  <span>· {t("members.verified", { date: f.date(p.roblox.verifiedAt) })}</span>
                </p>
              </div>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-3">
              <Gamepad2 aria-hidden className="size-4" />
              {t("members.notLinked")}
            </p>
          )}
        </div>
        {/* Economy */}
        {economy ? (
          <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-gradient-to-br from-accent-500/10 to-transparent p-4 ring-1 ring-inset ring-accent-400/15">
            <div>
              <dt className="text-[11px] text-ink-3">{t("members.points")}</dt>
              <dd className="tabular mt-1 text-lg font-semibold">{f.n(p.points!)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-3">{t("members.lifetime")}</dt>
              <dd className="tabular mt-1 text-lg font-semibold text-ink-2">{f.n(p.lifetimePoints!)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-3">{t("members.spent")}</dt>
              <dd className="tabular mt-1 text-lg font-semibold text-ink-2">{f.compact(p.totalRobux!)} R$</dd>
            </div>
          </dl>
        ) : (
          <p className="flex items-center gap-2 rounded-2xl bg-white/[0.03] p-4 text-xs text-ink-3 ring-1 ring-inset ring-line">
            <Lock aria-hidden className="size-4 shrink-0" />
            {t("members.restricted")}
          </p>
        )}
      </div>

      {ledger && ledger.items.length > 0 && (
        <section aria-label={t("members.recentLedger")}>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-3 uppercase">
            <Coins aria-hidden className="size-3.5" />
            {t("members.recentLedger")}
          </h4>
          <ul className="divide-y divide-line rounded-2xl ring-1 ring-inset ring-line">
            {ledger.items.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <Badge tone={e.kind === "adjust" ? "warn" : e.kind === "purchase" ? "accent" : "neutral"}>{t(`points.kind.${e.kind}`)}</Badge>
                <span className="min-w-0 flex-1 truncate text-xs text-ink-3">{e.reason ?? ""}</span>
                <span className={cn("tabular font-medium", e.delta > 0 ? "text-good" : "text-ink-2")}>{f.signed(e.delta)}</span>
                <TimeAgo at={e.at} className="hidden w-24 text-end text-xs text-ink-3 sm:block" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.purchases && (
        <section aria-label={t("members.purchases")}>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-3 uppercase">
            <ShoppingBag aria-hidden className="size-3.5" />
            {t("members.purchases")}
          </h4>
          {p.purchases.length === 0 ? (
            <p className="text-sm text-ink-3">{t("members.noPurchases")}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {p.purchases.slice(0, 6).map((x) => (
                <li key={x.id} className="flex items-center gap-3 rounded-xl bg-white/[0.025] p-2 ring-1 ring-inset ring-line transition hover:bg-white/[0.05]">
                  <ItemThumb assetId={x.assetId} item={x.item} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{x.item}</span>
                    <TimeAgo at={x.at} className="text-[11px] text-ink-3" />
                  </span>
                  <span className="text-end">
                    <span className="tabular block text-sm font-medium">{f.robux(x.robux)}</span>
                    <span className="tabular block text-[11px] text-accent-300">+{f.n(x.points)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-label={t("members.timeline")}>
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-3 uppercase">
          <LifeBuoy aria-hidden className="size-3.5" />
          {t("members.timeline")}
        </h4>
        {p.tickets.length === 0 ? (
          <p className="text-sm text-ink-3">{guild === "catalog" ? t("members.noTickets") : t("guild.ticketsElsewhere")}</p>
        ) : (
          <ol className="relative ms-3 space-y-3 border-s border-line ps-5">
            {p.tickets.slice(0, 8).map((tk) => (
              <li key={tk.id} className="relative">
                <span aria-hidden className={cn("absolute -start-[1.6rem] top-2 size-2.5 rounded-full ring-4 ring-surface", tk.status === "open" ? "bg-warn" : tk.status === "claimed" ? "bg-accent-400" : "bg-ink-3")} />
                <button type="button" onClick={() => openTicket(tk.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm transition hover:bg-white/[0.04]">
                  <span className="tabular text-xs text-ink-3">#{tk.number}</span>
                  <span dir="auto" className="min-w-0 flex-1 truncate text-start">
                    {tk.subject}
                  </span>
                  <TimeAgo at={tk.openedAt} className="hidden text-[11px] text-ink-3 sm:inline" />
                  <Badge tone={TICKET_TONE[tk.status]}>{t(`tickets.status.${tk.status}`)}</Badge>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
