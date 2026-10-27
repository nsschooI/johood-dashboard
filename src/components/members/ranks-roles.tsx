"use client";

import { Award, Tags } from "lucide-react";
import { useFormat, useT } from "@/components/providers/app-provider";
import { Card, CardHeader } from "@/components/ui/card";
import type { RankInfo, RoleInfo } from "@/lib/types";
import { RankBadge } from "./member-search";

export function RanksCard({ ranks }: { ranks: RankInfo[] }) {
  const t = useT();
  const f = useFormat();
  const max = Math.max(1, ...ranks.map((r) => r.members));
  return (
    <Card aria-labelledby="ranks-title">
      <CardHeader id="ranks-title" title={t("members.ranks")} icon={<Award className="size-4" aria-hidden />} />
      <ul className="space-y-3 px-5 pb-5">
        {ranks.map((r) => (
          <li key={r.rank} className="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3">
            <RankBadge rank={r.rank} />
            <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]" title={t("members.from", { n: f.n(r.minLifetimePoints) })}>
              <span className="block h-full rounded-full bg-accent-500" style={{ width: `${(r.members / max) * 100}%` }} />
            </span>
            <span className="tabular text-end text-xs text-ink-2">
              {f.n(r.members)} · <span className="text-ink-3">{t("members.cashback", { n: Math.round(r.cashbackRate * 100) })}</span>
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
  return (
    <Card aria-labelledby="roles-title">
      <CardHeader id="roles-title" title={t("members.rolesOverview")} icon={<Tags className="size-4" aria-hidden />} />
      <ul className="grid gap-x-4 gap-y-1 px-5 pb-5 sm:grid-cols-2">
        {roles.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded-lg py-1.5 text-sm">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: r.color }} />
            <span className="min-w-0 flex-1 truncate text-ink-2">{r.name}</span>
            <span className="tabular text-xs text-ink-3">{f.n(r.members)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
