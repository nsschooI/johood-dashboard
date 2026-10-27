"use client";

import { useState } from "react";
import { Headphones, LifeBuoy, Rocket, UserPlus, Users, Wifi, type LucideIcon } from "lucide-react";
import { useFormat, useT } from "@/components/providers/app-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import type { MessageKey } from "@/lib/i18n";
import type { ServerStats } from "@/lib/types";

const TILES: { key: keyof Omit<ServerStats, "at">; label: MessageKey; icon: LucideIcon }[] = [
  { key: "members", label: "stats.members", icon: Users },
  { key: "online", label: "stats.online", icon: Wifi },
  { key: "newToday", label: "stats.newToday", icon: UserPlus },
  { key: "ticketsOpen", label: "stats.ticketsOpen", icon: LifeBuoy },
  { key: "inVoice", label: "stats.inVoice", icon: Headphones },
  { key: "boosts", label: "stats.boosts", icon: Rocket },
];

export function StatTiles({ initial }: { initial: ServerStats }) {
  const t = useT();
  const f = useFormat();
  const [stats, setStats] = useState(initial);
  useLiveEvent("stats", (e) => setStats(e.data));

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {TILES.map(({ key, label, icon: Icon }) => (
        <div key={key} className="glass rounded-2xl px-4 py-3.5">
          <dt className="flex items-center gap-1.5 text-xs text-ink-3">
            <Icon aria-hidden className="size-3.5" />
            {t(label)}
          </dt>
          <dd className="tabular mt-1.5 text-2xl font-semibold tracking-tight text-ink">{typeof stats[key] === "number" ? f.n(stats[key] as number) : "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
