"use client";

import { useFormat, useT } from "@/components/providers/app-provider";
import { RANK_TEXT, RankIcon } from "@/components/art/rank-icon";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import type { RankInfo, RoleInfo } from "@/lib/types";

export function RanksCard({ ranks }: { ranks: RankInfo[] }) {
  const t = useT();
  const f = useFormat();
  const total = Math.max(1, ranks.reduce((s, r) => s + r.members, 0));
  return (
    <Card aria-labelledby="ranks-title">
      <CardHeader id="ranks-title" title={t("members.ranks")} description={t("guild.globalHint")} icon="award" />
      <ul className="stagger grid grid-cols-2 gap-2.5 px-5 pb-5 sm:grid-cols-3">
        {ranks.map((r) => (
          <li key={r.rank} className="lift relative overflow-hidden rounded-2xl bg-surface-2 p-3.5 ring-1 ring-inset ring-line">
            <span aria-hidden className="absolute -end-4 -top-4 opacity-[0.12]">
              <RankIcon rank={r.rank} size={84} />
            </span>
            <RankIcon rank={r.rank} size={38} className="drop-shadow-[0_4px_8px_var(--color-shadow-2)]" />
            <p className={cn("font-display mt-2 text-[15px] font-semibold", RANK_TEXT[r.rank])}>{t(`members.rankName.${r.rank}`)}</p>
            <p className="tabular text-[11px] text-ink-3">{t("members.from", { n: f.n(r.minLifetimePoints) })}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="tabular font-semibold text-ink">{t("members.memberCount", { n: f.n(r.members) })}</span>
              <span className="tabular rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-ink-2 ring-1 ring-line">{t("members.cashback", { n: Math.round(r.cashbackRate * 100) })}</span>
            </div>
            <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-surface-3">
              <span className="block h-full rounded-full bg-series-1" style={{ width: `${Math.max(2, (r.members / total) * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function RolesCard({ roles }: { roles: RoleInfo[] }) {
  const t = useT();
  const f = useFormat();
  const max = Math.max(1, ...roles.filter((r) => r.members < 10_000).map((r) => r.members));
  return (
    <Card aria-labelledby="roles-title">
      <CardHeader id="roles-title" title={t("members.rolesOverview")} icon="layers" />
      <ul className="grid gap-x-5 gap-y-1.5 px-5 pb-5 sm:grid-cols-2">
        {roles.map((r) => (
          <li key={r.id} className="rounded-xl px-2 py-1.5 transition hover:bg-surface-2">
            <span className="flex items-center gap-2 text-sm">
              <span aria-hidden className="grid size-5 place-items-center rounded-md" style={{ background: `${r.color}26`, boxShadow: `inset 0 0 0 1px ${r.color}55` }}>
                <span className="size-2 rounded-full" style={{ background: r.color }} />
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                {r.name}
              </span>
              <span className="tabular text-xs text-ink-3">{f.n(r.members)}</span>
            </span>
            <span className="ms-7 mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-3">
              <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(2, (r.members / max) * 100))}%`, background: r.color, opacity: 0.7 }} />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
