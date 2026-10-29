"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Scene } from "@/components/art/scenes";
import { Icon } from "@/components/icons/icon";
import { useApp, useCan, useFormat, useT } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
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
import { ItemThumb, RobloxHeadshot } from "@/components/ui/roblox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { api, qs } from "@/lib/client/api";
import { useLoad } from "@/lib/client/use-load";
import type { LedgerEntry, MemberProfile, MemberSummary, Page } from "@/lib/types";
import { MemberSearch, RankBadge } from "./member-search";

/** Directory on the start side, the selected profile on the end side (stacked on phones). */
export function MembersPanel({ initial }: { initial: MemberSummary[] }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const preset = params.get("member");
  const selected = preset ?? null;
  const select = (id: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("member", id);
    else next.delete("member");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  return (
    <div id="t-members" className="grid scroll-mt-24 items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section aria-label={t("members.search")} className={cn("glass rounded-[var(--radius-card)] p-3 lg:sticky lg:top-20", selected && "max-lg:hidden")}>
        <MemberSearch onSelect={(m) => select(m.discordId)} selectedId={selected ?? initial[0]?.discordId} initial={initial} limit={12} />
      </section>
      <div className={cn("min-w-0", !selected && "max-lg:hidden")}>
        {selected || initial[0] ? (
          <Profile key={selected ?? initial[0].discordId} id={selected ?? initial[0].discordId} onBack={() => select(null)} />
        ) : (
          <div className="glass rounded-[var(--radius-card)]">
            <EmptyState art="people" title={t("members.pickMember")} />
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
              <RankBadge rank={p.rank} size="md" />
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
              <span dir="ltr">@{p.username}</span>
              <span className="inline-flex items-center gap-1" dir="ltr">
                {p.discordId}
                <CopyButton value={p.discordId} className="size-5" />
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon name="calendar" size={14} />
                {t("members.memberFor", { d: memberFor(p.joinedAt, locale) })}
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
        {/* Roblox */}
        <section className="glass rounded-[var(--radius-card)] p-4">
          <SectionLabel icon="dice">{t("people.roblox")}</SectionLabel>
          {p.roblox ? (
            <div className="flex items-center gap-3">
              <RobloxHeadshot userId={p.roblox.robloxId} name={p.roblox.robloxName} size={56} />
              <div className="min-w-0">
                <p className="flex items-center gap-2">
                  <span className="truncate font-semibold" dir="ltr">
                    {p.roblox.robloxName}
                  </span>
                  <Badge tone="good" icon={<Icon name="check" size={12} />}>
                    {t("members.linked")}
                  </Badge>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-ink-3">
                  <span dir="ltr">#{p.roblox.robloxId}</span>
                  <CopyButton value={p.roblox.robloxId} label={t("menu.copyRoblox")} className="size-5" />
                  <span>· {t("members.verified", { date: f.date(p.roblox.verifiedAt) })}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-3">
              <Icon name="link" size={16} />
              {t("members.notLinked")}
            </p>
          )}
        </section>
        {/* Economy */}
        <section className="glass rounded-[var(--radius-card)] p-4">
          <SectionLabel icon="coin">{t("people.economy")}</SectionLabel>
          {economy ? (
            <dl className="grid grid-cols-3 gap-2">
              {(
                [
                  ["members.points", p.points!, false, "text-ink"],
                  ["members.lifetime", p.lifetimePoints!, false, "text-ink-2"],
                  ["members.spent", p.totalRobux!, true, "text-ink-2"],
                ] as const
              ).map(([k, v, robux, c]) => {
                // Three cells share a narrow card: big numbers go compact, the exact one is on hover.
                const short = v >= 10_000 ? f.compact(v) : f.n(v);
                const full = robux ? f.robux(v) : f.n(v);
                return (
                  <div key={k} className="rounded-xl bg-surface-2 px-2.5 py-2">
                    <dt className="truncate text-[11px] text-ink-3">{t(k)}</dt>
                    <dd className={cn("font-display tabular mt-0.5 truncate text-lg font-bold", c)} title={full}>
                      {robux ? `\u2066${short} R$\u2069` : short}
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-3">
              <Icon name="lock" size={16} />
              {t("members.restricted")}
            </p>
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

      {p.purchases && (
        <section className="glass rounded-[var(--radius-card)] p-4" aria-label={t("members.purchases")}>
          <SectionLabel icon="bag">{t("members.purchases")}</SectionLabel>
          {p.purchases.length === 0 ? (
            <p className="text-sm text-ink-3">{t("members.noPurchases")}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {p.purchases.slice(0, 6).map((x) => (
                <li key={x.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-2 transition hover:bg-surface-3/70">
                  <ItemThumb assetId={x.assetId} item={x.item} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{x.item}</span>
                    <TimeAgo at={x.at} className="text-[11px] text-ink-3" />
                  </span>
                  <span className="text-end">
                    <span className="font-display tabular block text-sm font-bold">{f.robux(x.robux)}</span>
                    <span className="tabular block text-[11px] font-semibold text-good">+{f.n(x.points)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
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
    </div>
  );
}
