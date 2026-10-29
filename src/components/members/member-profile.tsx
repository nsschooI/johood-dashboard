"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Scene } from "@/components/art/scenes";
import { Icon } from "@/components/icons/icon";
import { useApp, useCan, useFormat, useT } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { LinkedChip, MemberBadge } from "@/components/people/member-badge";
import { usePersonSections } from "@/components/people/person";
import { useOpenTicket } from "@/components/tickets/ticket-drawer-provider";
import { StatusPill } from "@/components/tickets/ticket-bits";
import { GuildIcon } from "@/components/shell/guild-mark";
import { ActionMenuButton } from "@/components/ui/action-menu";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/components/ui/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { api, qs } from "@/lib/client/api";
import { useLoad } from "@/lib/client/use-load";
import type { LedgerEntry, MemberProfile, Page } from "@/lib/types";
import { MemberDirectory } from "./member-directory";

/** Directory on the start side, the selected profile on the end side (stacked on phones). */
export function MembersPanel() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get("member");
  const select = (id: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("member", id);
    else next.delete("member");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  return (
    <div id="t-members" className="grid scroll-mt-24 items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
      <section aria-label={t("dir.title")} className={cn("glass rounded-[var(--radius-card)] p-3 lg:sticky lg:top-20", selected && "max-lg:hidden")}>
        <MemberDirectory selectedId={selected} onSelect={(m) => select(m.discordId)} />
      </section>
      <div className={cn("min-w-0", !selected && "max-lg:hidden")}>
        {selected ? (
          <Profile key={selected} id={selected} onBack={() => select(null)} />
        ) : (
          <div className="glass rounded-[var(--radius-card)]">
            <EmptyState art="people" title={t("members.pickMember")} hint={t("dir.pickHint")} />
          </div>
        )}
      </div>
    </div>
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

function SectionLabel({ icon, children }: { icon: Parameters<typeof Icon>[0]["name"]; children: React.ReactNode }) {
  return (
    <h4 className="font-display mb-2.5 flex items-center gap-2 text-sm font-semibold text-ink-2">
      <Icon name={icon} size={16} duo className="text-accent-400" />
      {children}
    </h4>
  );
}

function Profile({ id, onBack }: { id: string; onBack: () => void }) {
  const t = useT();
  const { locale } = useApp();
  const f = useFormat();
  const can = useCan();
  const openTicket = useOpenTicket();
  const { guild, guilds, info, setGuild, href } = useGuild();
  const {
    data: p,
    error,
    reload,
  } = useLoad(`${guild}:${id}`, (signal) =>
    api<MemberProfile>(`/api/members/${id}?guild=${guild}`, { signal }).catch((e) => {
      if (e?.status === 404) return null;
      throw e;
    }),
  );
  const { data: ledger } = useLoad(p && p.points !== null && can("points.view") ? `ledger:${id}` : null, (signal) =>
    api<Page<LedgerEntry>>(`/api/points/ledger/${id}${qs({ limit: 5 })}`, { signal }),
  );
  const sections = usePersonSections({ discordId: id, name: p?.displayName ?? id, avatarUrl: p?.avatarUrl });
  const back = (
    <Button variant="ghost" size="sm" onClick={onBack} className="mb-3 lg:hidden">
      <Icon name="arrowLeft" size={16} mirror />
      {t("people.back")}
    </Button>
  );

  if (error)
    return (
      <div className="glass rounded-[var(--radius-card)]">
        <ErrorState title={t("common.error")} action={<Button onClick={reload}>{t("common.retry")}</Button>} />
      </div>
    );
  if (p === undefined)
    return (
      <div className="space-y-4" aria-busy>
        <div className="glass overflow-hidden rounded-[var(--radius-card)]">
          <Skeleton className="h-28 rounded-none" />
          <div className="flex items-end gap-4 px-5 pb-5">
            <Skeleton className="-mt-10 size-24 rounded-full ring-4 ring-surface" />
            <div className="flex-1 space-y-2 pb-2">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-[var(--radius-card)]" />
          <Skeleton className="h-28 rounded-[var(--radius-card)]" />
        </div>
        <Skeleton className="h-48 rounded-[var(--radius-card)]" />
      </div>
    );
  if (p === null) {
    const other = guilds.find((g) => g.key !== guild);
    return (
      <>
        {back}
        <div className="glass rounded-[var(--radius-card)]">
          <EmptyState
            art="search"
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
        </div>
      </>
    );
  }

  const color = p.roles.find((r) => r.color && r.color !== "#64748b" && r.color !== "#94a3b8")?.color ?? "#e11d48";
  const economy = p.points !== null;

  return (
    <div className="stagger space-y-4">
      {back}
      {/* Identity */}
      <section className="glass overflow-hidden rounded-[var(--radius-card)]">
        <div
          aria-hidden
          className="relative h-28 overflow-hidden"
          style={{ background: `linear-gradient(120deg, ${color}, color-mix(in oklab, ${color} 40%, var(--color-surface)) 60%, var(--color-surface-2))` }}
        >
          <svg className="absolute inset-0 size-full opacity-25" aria-hidden>
            <defs>
              <pattern id={`pf-${id}`} width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.3" fill="#fff" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#pf-${id})`} />
          </svg>
        </div>
        <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
          <Avatar name={p.displayName} src={p.avatarUrl} size={96} className="-mt-12 rounded-full bg-surface ring-4 ring-surface" />
          <div className="min-w-0 flex-1 pt-3">
            <h2 className="font-display flex flex-wrap items-center gap-2 text-2xl font-bold">
              <bdi>{p.displayName}</bdi>
              <MemberBadge badge={p.badge} size="md" />
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
              <span dir="ltr">@{p.username}</span>
              <span className="inline-flex items-center gap-1" dir="ltr">
                {p.discordId}
                <CopyButton value={p.discordId} className="size-5" />
              </span>
              <span className="inline-flex items-center gap-1" title={f.date(p.joinedAt)}>
                <Icon name="calendar" size={14} />
                {t("members.memberFor", { d: memberFor(p.joinedAt, locale) })}
                <span className="text-ink-4">·</span>
                {t("dir.joined", { date: f.date(p.joinedAt) })}
              </span>
            </p>
          </div>
          <ActionMenuButton label={p.displayName} sections={sections} size="icon" />
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-line px-5 py-3.5" aria-label={t("members.roles")}>
          {p.roles.length === 0 && <span className="text-xs text-ink-3">{t("people.noRoles")}</span>}
          {p.roles.map((r) => (
            <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-2 ring-1 ring-inset ring-line">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: r.color }} />
              {r.name}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Points */}
        <section className="glass rounded-[var(--radius-card)] p-4">
          <SectionLabel icon="coin">{t("dir.points")}</SectionLabel>
          {economy ? (
            <dl className="grid grid-cols-2 gap-2">
              {(
                [
                  ["dir.serverPoints", p.points!, "text-ink"],
                  ["members.lifetime", p.lifetimePoints!, "text-ink-2"],
                ] as const
              ).map(([k, v, c]) => (
                <div key={k} className="rounded-xl bg-surface-2 px-3 py-2">
                  <dt className="truncate text-[11px] text-ink-3">{t(k)}</dt>
                  <dd className={cn("font-display tabular mt-0.5 truncate text-xl font-bold", c)} title={f.n(v)}>
                    {v >= 100_000 ? f.compact(v) : f.n(v)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-3">
              <Icon name="lock" size={16} />
              {t("members.restricted")}
            </p>
          )}
        </section>
        {/* Roblox: one line here; everything else lives on the Roblox page. */}
        <section className="glass flex flex-col rounded-[var(--radius-card)] p-4">
          <SectionLabel icon="gamepad">{t("people.roblox")}</SectionLabel>
          <p className="flex items-center gap-2 text-sm">
            <LinkedChip linked={p.linked} />
            <span className="text-ink-3">{p.linked ? t("dir.linkedLine") : t("dir.notLinkedLine")}</span>
          </p>
          {can("roblox.view") && (
            <Link
              href={p.linked ? href("/roblox", { player: p.discordId }) : href("/roblox", { tab: "candidates", q: p.displayName })}
              transitionTypes={["nav"]}
              className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-accent-300 hover:underline"
            >
              {p.linked ? t("dir.openRoblox") : t("dir.findCandidate")}
              <Icon name="arrowRight" size={14} mirror />
            </Link>
          )}
        </section>
      </div>

      {ledger && ledger.items.length > 0 && (
        <section className="glass rounded-[var(--radius-card)] p-4" aria-label={t("members.recentLedger")}>
          <div className="flex items-center">
            <SectionLabel icon="history">{t("members.recentLedger")}</SectionLabel>
            <a href={href("/points", { member: id })} className="ms-auto mb-2.5 text-xs font-semibold text-accent-300 hover:underline">
              {t("people.seeLedger")}
            </a>
          </div>
          <ul className="divide-y divide-line">
            {ledger.items.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                <Badge tone={e.kind === "adjust" ? "warn" : e.kind === "purchase" ? "accent" : "neutral"}>{t(`points.kind.${e.kind}`)}</Badge>
                <span className="min-w-0 flex-1 truncate text-xs text-ink-3">{e.reason ?? ""}</span>
                <span className={cn("font-display tabular font-bold", e.delta > 0 ? "text-good" : "text-ink-2")}>{f.signed(e.delta)}</span>
                <TimeAgo at={e.at} className="hidden w-24 text-end text-xs text-ink-3 sm:block" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="glass rounded-[var(--radius-card)] p-4" aria-label={t("members.timeline")}>
        <SectionLabel icon="tickets">{t("members.timeline")}</SectionLabel>
        {p.tickets.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-ink-3">
            <Scene name="allClear" className="h-16 w-auto" />
            {guild === "catalog" ? t("members.noTickets") : t("guild.ticketsElsewhere")}
          </div>
        ) : (
          <ol className="relative ms-2 space-y-1 border-s-2 border-line ps-4">
            {p.tickets.slice(0, 8).map((tk) => (
              <li key={tk.id} className="relative">
                <span
                  aria-hidden
                  className={cn(
                    "absolute -start-[1.42rem] top-3.5 size-3 rounded-full ring-4 ring-surface",
                    tk.status === "open" ? "bg-warn" : tk.status === "claimed" ? "bg-info" : "bg-ink-4",
                  )}
                />
                <button
                  type="button"
                  onClick={() => openTicket(tk.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm transition hover:bg-surface-2"
                >
                  <span className="tabular text-xs text-ink-3">#{tk.number}</span>
                  <bdi className="min-w-0 flex-1 truncate">{tk.subject}</bdi>
                  <TimeAgo at={tk.openedAt} className="hidden text-[11px] text-ink-3 sm:inline" />
                  <StatusPill status={tk.status} />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {p.giveaways && (
        <section className="glass rounded-[var(--radius-card)] p-4" aria-label={t("dir.giveaways")}>
          <SectionLabel icon="giveaways">{t("dir.giveaways")}</SectionLabel>
          {p.giveaways.length === 0 ? (
            <p className="text-sm text-ink-3">{t("dir.noGiveaways")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {p.giveaways.slice(0, 8).map((g) => {
                const row = (
                  <>
                    <Icon name={g.won ? "trophy" : "giveaways"} size={16} duo={g.won} className={g.won ? "text-warn" : "text-ink-3"} />
                    <bdi className="min-w-0 flex-1 truncate">{g.prize}</bdi>
                    {g.won && <Badge tone="warn">{t("dir.won")}</Badge>}
                    <TimeAgo at={g.joinedAt} className="hidden text-xs text-ink-3 sm:block" />
                  </>
                );
                return (
                  <li key={g.id}>
                    {can("giveaways.view") ? (
                      <Link href={href(`/giveaways-admin/${g.id}`)} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition hover:bg-surface-2">
                        {row}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-3 px-2 py-2 text-sm">{row}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
