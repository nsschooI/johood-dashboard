"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BotTile } from "@/components/art/bot-tile";
import { Icon, type IconName } from "@/components/icons/icon";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/components/ui/cn";
import { Tooltip } from "@/components/ui/tooltip";
import { formatAge } from "@/lib/attention";
import type { Assistant, BotStatus, PurchaseEvent, Redemption, ServerStats, TicketSummary, Transfer } from "@/lib/types";

/** One "answer" card on the overview: a question, a big answer, the detail. */
function PulseCard({
  icon,
  title,
  tone,
  href,
  cta,
  children,
  className,
}: {
  icon: IconName;
  title: string;
  tone: "good" | "warn" | "bad" | "accent" | "guild" | "info";
  href?: string;
  cta?: string;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    good: "bg-good/12 text-good",
    warn: "bg-warn/14 text-warn",
    bad: "bg-bad/12 text-bad",
    accent: "bg-accent-500/10 text-accent-400",
    guild: "bg-[color-mix(in_oklab,var(--color-guild)_14%,transparent)] text-guild-ink",
    info: "bg-info/12 text-info",
  };
  return (
    <section className={cn("glass relative flex flex-col rounded-[var(--radius-card)] p-4 sm:p-5", className)}>
      <header className="flex items-center gap-2.5">
        <span className={cn("grid size-9 place-items-center rounded-xl", tones[tone])}>
          <Icon name={icon} size={20} duo />
        </span>
        <h2 className="font-display text-[15px] font-semibold">{title}</h2>
        {href && cta && (
          <Tooltip content={cta} className="ms-auto">
            <Link href={href} transitionTypes={["nav"]} aria-label={cta} className="group grid size-8 place-items-center rounded-lg text-ink-3 ring-1 ring-line transition hover:bg-surface-2 hover:text-ink active:scale-95">
              <Icon name="arrowUpRight" size={16} className="transition group-hover:-translate-y-px group-hover:translate-x-px rtl:-scale-x-100" />
            </Link>
          </Tooltip>
        )}
      </header>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function Big({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-display tabular text-[2rem] leading-none font-bold text-ink", className)}>{children}</p>;
}

const STATE_DOT: Record<BotStatus["state"], string> = {
  online: "bg-good",
  degraded: "bg-warn",
  restarting: "bg-info",
  offline: "bg-bad",
  stopped: "bg-ink-4",
};

export function BotsPulse({ bots }: { bots: BotStatus[] }) {
  const { t } = useApp();
  const { href } = useGuild();
  const healthy = bots.filter((b) => b.state === "online").length;
  const problem = bots.find((b) => b.state === "offline") ?? bots.find((b) => b.state === "degraded" || b.state === "stopped");
  const tone = bots.some((b) => b.state === "offline") ? "bad" : problem ? "warn" : "good";
  return (
    <PulseCard icon="bots" title={t("home.bots.title")} tone={tone} href={href("/bots")} cta={t("home.bots.open")}>
      <div className="flex items-end gap-2">
        <Big>
          {healthy}
          <span className="text-ink-4">/{bots.length}</span>
        </Big>
      </div>
      <p className={cn("mt-2 text-sm font-medium", tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-warn")}>
        {problem ? t("home.bots.problem", { bot: problem.displayName }) : t("home.bots.allHealthy")}
      </p>
      <ul className="mt-auto flex flex-wrap gap-1.5 pt-4" aria-label={t("home.bots.healthy", { n: healthy, total: bots.length })}>
        {bots.map((b) => (
          <li key={b.name}>
            <Tooltip content={`${b.displayName} · ${t(`bot.state.${b.state}`)}`}>
              <Link href={`${href("/bots")}#t-bot-${b.name}`} className="relative block rounded-[30%] transition hover:-translate-y-0.5">
                <BotTile name={b.name} avatarUrl={b.avatarUrl} size={28} badge={false} className={cn(b.state !== "online" && "opacity-70 saturate-50")} />
                <span aria-hidden className={cn("absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-surface", STATE_DOT[b.state])} />
                <span className="sr-only">
                  {b.displayName}: {t(`bot.state.${b.state}`)}
                </span>
              </Link>
            </Tooltip>
          </li>
        ))}
      </ul>
    </PulseCard>
  );
}

export function WaitingPulse({ tickets, assistants, now }: { tickets: TicketSummary[] | null; assistants: Assistant[] | null; now: number }) {
  const { t } = useApp();
  const f = useFormat();
  const { href } = useGuild();
  const open = tickets?.filter((x) => x.status !== "closed") ?? [];
  const unclaimed = open.filter((x) => x.status === "open");
  const oldest = unclaimed.reduce<TicketSummary | null>((a, b) => (!a || b.openedAt < a.openedAt ? b : a), null);
  const ageMin = oldest ? Math.max(0, Math.round((now - Date.parse(oldest.openedAt)) / 60_000)) : 0;
  const busy = assistants?.filter((a) => a.state === "busy").length ?? 0;
  const tone = ageMin >= 60 ? "bad" : unclaimed.length ? "warn" : "good";
  return (
    <PulseCard icon="inbox" title={t("home.waiting.title")} tone={tone} href={tickets ? href("/tickets") : undefined} cta={t("home.waiting.open")}>
      {tickets && (
        <>
          <div className="flex items-baseline gap-2">
            <Big>
              <CountUp value={open.length} format={f.n} />
            </Big>
            <span className="text-sm text-ink-3">{t("home.waiting.tickets")}</span>
          </div>
          <p className={cn("mt-2 text-sm font-medium", unclaimed.length ? (tone === "bad" ? "text-bad" : "text-warn") : "text-good")}>
            {unclaimed.length ? t("home.waiting.unclaimed", { n: unclaimed.length }) : t("home.waiting.allClaimed")}
            {oldest && <span className="font-normal text-ink-3"> · {t("home.waiting.oldest", { age: formatAge(ageMin) })}</span>}
          </p>
        </>
      )}
      {assistants && (
        <div className={cn("mt-auto flex items-center gap-3", tickets && "pt-4")}>
          <div className="flex -space-x-2 rtl:space-x-reverse">
            {assistants.map((a) => (
              <BotTile key={a.bot} name={a.bot} avatarUrl={a.avatarUrl} size={26} badge={false} className={cn("rounded-[30%] ring-2 ring-surface", a.state !== "busy" && "opacity-45 grayscale")} />
            ))}
          </div>
          <p className="text-sm text-ink-2">
            <span className="font-semibold text-ink">{t("home.waiting.ofTotal", { n: busy, total: assistants.length })}</span> {t("home.waiting.assistants").toLowerCase()}
          </p>
        </div>
      )}
    </PulseCard>
  );
}

const BUCKET_MIN = 5;

export function HourPulse({ purchases, transfers, redemptions, now }: { purchases: PurchaseEvent[] | null; transfers: Transfer[] | null; redemptions: Redemption[] | null; now: number }) {
  const { t } = useApp();
  const f = useFormat();
  const { href } = useGuild();
  const since = now - 3_600_000;
  const inHour = <T extends { at: string }>(list: T[] | null) => (list ?? []).filter((x) => Date.parse(x.at) >= since);
  const p = inHour(purchases);
  const tr = inHour(transfers);
  const rd = inHour(redemptions);
  const robux = p.reduce((s, x) => s + x.robux, 0);
  const buckets = Array.from({ length: 60 / BUCKET_MIN }, () => 0);
  for (const x of p) {
    const i = Math.min(buckets.length - 1, Math.floor((Date.parse(x.at) - since) / (BUCKET_MIN * 60_000)));
    if (i >= 0) buckets[i] += x.robux;
  }
  const max = Math.max(1, ...buckets);
  return (
    <PulseCard icon="zap" title={t("home.hour.title")} tone="accent" href={href("/activity")} cta={t("home.live.seeAll")}>
      {purchases && (
        <>
          <Big>
            <CountUp value={robux} format={f.robux} />
          </Big>
          <p className="mt-2 text-sm text-ink-3">{robux ? t("home.hour.robux") : t("home.hour.quiet")}</p>
          <div role="img" aria-label={t("home.hour.trend")} className="mt-3 flex h-10 items-end gap-[2px]">
            {buckets.map((v, i) => (
              <span
                key={i}
                title={`${f.robux(v)} · −${60 - i * BUCKET_MIN} min`}
                className={cn("flex-1 rounded-t-[4px] transition-[height] duration-[var(--dur-slow)]", v ? "bg-series-1" : "bg-surface-3")}
                style={{ height: `${Math.max(8, (v / max) * 100)}%`, opacity: v ? 0.45 + 0.55 * (i / buckets.length) : 1 }}
              />
            ))}
          </div>
        </>
      )}
      <dl className="mt-auto grid grid-cols-3 gap-2 pt-4 text-center">
        {(
          [
            [purchases, p.length, "home.hour.purchases"],
            [transfers, tr.length, "home.hour.transfers"],
            [redemptions, rd.length, "home.hour.rewards"],
          ] as const
        ).map(([list, n, label]) =>
          list ? (
            <div key={label} className="rounded-xl bg-surface-2 px-1 py-1.5">
              <dd className="font-display tabular text-base font-bold">
                <CountUp value={n} format={f.n} />
              </dd>
              <dt className="truncate text-[11px] text-ink-3">{t(label)}</dt>
            </div>
          ) : null,
        )}
      </dl>
    </PulseCard>
  );
}

export function ServerPulse({ stats }: { stats: ServerStats }) {
  const { t } = useApp();
  const f = useFormat();
  const share = stats.members ? stats.online / stats.members : 0;
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <PulseCard icon="members" title={t("home.server.title")} tone="guild">
      <div className="flex items-center gap-4">
        <div className="relative size-16 shrink-0" role="img" aria-label={t("home.server.onlineShare", { pct: f.pct(share) })}>
          <svg viewBox="0 0 64 64" className="size-full -rotate-90">
            <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth="7" />
            <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-good)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * share} ${c}`} className="transition-[stroke-dasharray] duration-[var(--dur-count)]" />
          </svg>
          <span className="absolute inset-0 grid place-items-center">
            <Icon name="wifi" size={18} className="text-good" />
          </span>
        </div>
        <div>
          <Big>
            <CountUp value={stats.online} format={f.n} />
          </Big>
          <p className="mt-1.5 text-sm text-ink-3">{t("stats.online")}</p>
        </div>
      </div>
      <dl className="mt-auto grid grid-cols-3 gap-2 pt-4 text-center">
        {(
          [
            ["members", stats.members, "stats.members"],
            ["newToday", stats.newToday, "stats.newToday"],
            ["inVoice", stats.inVoice, "stats.inVoice"],
          ] as const
        ).map(([k, v, label]) => (
          <div key={k} className="rounded-xl bg-surface-2 px-1 py-1.5">
            <dd className="font-display tabular text-base font-bold">
              <CountUp value={v} format={k === "members" ? f.compact : f.n} />
            </dd>
            <dt className="truncate text-[11px] text-ink-3">{t(label)}</dt>
          </div>
        ))}
      </dl>
    </PulseCard>
  );
}
