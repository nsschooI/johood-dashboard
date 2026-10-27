"use client";

import { Award, Tags } from "lucide-react";
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
      <CardHeader id="ranks-title" title={t("members.ranks")} description={t("guild.globalHint")} icon={<Award className="size-4" aria-hidden />} />
      <ul className="stagger grid grid-cols-2 gap-2.5 px-5 pb-5 sm:grid-cols-3">
        {ranks.map((r) => (
          <li key={r.rank} className="lift relative overflow-hidden rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-line">
            <span aria-hidden className="absolute -end-4 -top-4 opacity-[0.12]">
              <RankIcon rank={r.rank} size={84} />
            </span>
            <RankIcon rank={r.rank} size={34} className="drop-shadow-[0_4px_10px_rgb(0_0_0/0.4)]" />
            <p className={cn("mt-2 text-sm font-semibold", RANK_TEXT[r.rank])}>{t(`members.rankName.${r.rank}`)}</p>
            <p className="tabular text-[11px] text-ink-3">{t("members.from", { n: f.n(r.minLifetimePoints) })}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="tabular font-medium text-ink">{t("members.memberCount", { n: f.n(r.members) })}</span>
              <span className="tabular rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-ink-2">{t("members.cashback", { n: Math.round(r.cashbackRate * 100) })}</span>
            </div>
            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <span className="block h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-300 rtl:bg-gradient-to-l" style={{ width: `${Math.max(2, (r.members / total) * 100)}%` }} />
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
      <CardHeader id="roles-title" title={t("members.rolesOverview")} icon={<Tags className="size-4" aria-hidden />} />
      <ul className="grid gap-x-5 gap-y-1.5 px-5 pb-5 sm:grid-cols-2">
        {roles.map((r) => (
          <li key={r.id} className="rounded-xl px-2 py-1.5 transition hover:bg-white/[0.03]">
            <span className="flex items-center gap-2 text-sm">
              <span aria-hidden className="grid size-5 place-items-center rounded-md" style={{ background: `${r.color}26`, boxShadow: `inset 0 0 0 1px ${r.color}55` }}>
                <span className="size-2 rounded-full" style={{ background: r.color }} />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium" style={{ color: r.color }}>
                {r.name}
              </span>
              <span className="tabular text-xs text-ink-3">{f.n(r.members)}</span>
            </span>
            <span className="ms-7 mt-1 block h-1 overflow-hidden rounded-full bg-white/[0.05]">
              <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(2, (r.members / max) * 100))}%`, background: r.color, opacity: 0.7 }} />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
