"use client";

import { useEffect, useId, useState } from "react";
import { Search } from "lucide-react";
import { useT } from "@/components/providers/app-provider";
import { Avatar } from "@/components/ui/avatar";
import { RANK_TEXT, RankIcon } from "@/components/art/rank-icon";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { api, qs } from "@/lib/client/api";
import { useLoad } from "@/lib/client/use-load";
import { useGuild } from "@/components/providers/guild-provider";
import type { GuildKey } from "@/lib/types";
import type { MemberSummary } from "@/lib/types";

/** Debounced member search with a result list. */
export function MemberSearch({
  onSelect,
  selectedId,
  initial,
  limit = 8,
  className,
  guild,
}: {
  onSelect: (m: MemberSummary) => void;
  selectedId?: string | null;
  initial?: MemberSummary[] | null;
  limit?: number;
  className?: string;
  /** Which server to search (defaults to the selected one). */
  guild?: GuildKey;
}) {
  const selected = useGuild().guild;
  const g = guild ?? selected;
  const t = useT();
  const id = useId();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(timer);
  }, [q]);
  const useInitial = !debounced && initial;
  const url = useInitial ? null : `/api/members${qs({ q: debounced, limit, guild: g })}`;
  const { data, error, loading } = useLoad(url, (signal) => api<MemberSummary[]>(url!, { signal }));
  const results = useInitial ? initial : error ? [] : (data ?? null);

  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {t("members.search")}
      </label>
      <Input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("members.searchPlaceholder")}
        leading={<Search className="size-4" aria-hidden />}
        autoComplete="off"
        maxLength={64}
      />
      <ul className="mt-2 space-y-0.5" aria-busy={loading}>
        {results === null
          ? Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-3 flex-1" />
              </li>
            ))
          : results.length === 0
            ? <li className="px-2 py-4 text-center text-xs text-ink-3">{t("common.noResults")}</li>
            : results.map((m) => (
                <li key={m.discordId}>
                  <button
                    type="button"
                    onClick={() => onSelect(m)}
                    aria-pressed={selectedId === m.discordId}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start transition",
                      selectedId === m.discordId ? "bg-accent-500/12 ring-1 ring-inset ring-accent-400/30" : "hover:bg-white/[0.04]",
                    )}
                  >
                    <Avatar name={m.displayName} src={m.avatarUrl} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{m.displayName}</span>
                      <span className="rtl:text-right block truncate text-xs text-ink-3" dir="ltr">
                        {m.robloxName ?? m.username}
                      </span>
                    </span>
                    <RankBadge rank={m.rank} />
                  </button>
                </li>
              ))}
      </ul>
    </div>
  );
}

const RANK_STYLE: Record<MemberSummary["rank"], string> = {
  newcomer: "ring-line",
  bronze: "ring-orange-400/30 bg-orange-400/[0.06]",
  silver: "ring-slate-300/30 bg-slate-300/[0.05]",
  gold: "ring-amber-300/35 bg-amber-300/[0.07]",
  diamond: "ring-cyan-300/35 bg-cyan-300/[0.07]",
  legend: "ring-fuchsia-300/40 bg-fuchsia-400/10",
};

export function RankBadge({ rank, size = "sm" }: { rank: MemberSummary["rank"]; size?: "sm" | "md" }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap ring-1 ring-inset",
        size === "md" ? "py-0.5 ps-1 pe-2.5 text-xs" : "py-px ps-0.5 pe-2 text-[11px]",
        RANK_STYLE[rank],
        RANK_TEXT[rank],
      )}
    >
      <RankIcon rank={rank} size={size === "md" ? 20 : 16} />
      {t(`members.rankName.${rank}`)}
    </span>
  );
}
