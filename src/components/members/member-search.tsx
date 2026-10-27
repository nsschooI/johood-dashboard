"use client";

import { useEffect, useId, useState } from "react";
import { Search } from "lucide-react";
import { useT } from "@/components/providers/app-provider";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { api, qs } from "@/lib/client/api";
import type { MemberSummary } from "@/lib/types";

/** Debounced member search with a result list. */
export function MemberSearch({
  onSelect,
  selectedId,
  initial,
  limit = 8,
  className,
}: {
  onSelect: (m: MemberSummary) => void;
  selectedId?: string | null;
  initial?: MemberSummary[] | null;
  limit?: number;
  className?: string;
}) {
  const t = useT();
  const id = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MemberSummary[] | null>(initial ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q && initial) {
      setResults(initial);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      api<MemberSummary[]>(`/api/members${qs({ q, limit })}`, { signal: ctrl.signal })
        .then(setResults)
        .catch(() => !ctrl.signal.aborted && setResults([]))
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, limit, initial]);

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
        {results === null || (loading && !results.length)
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
                      <span className="block truncate text-xs text-ink-3" dir="ltr">
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
  newcomer: "text-ink-3 ring-line",
  bronze: "text-amber-500 ring-amber-500/30",
  silver: "text-slate-300 ring-slate-300/30",
  gold: "text-yellow-300 ring-yellow-300/30",
  diamond: "text-sky-300 ring-sky-300/30",
  legend: "text-accent-300 ring-accent-400/40 bg-accent-500/10",
};

export function RankBadge({ rank }: { rank: MemberSummary["rank"] }) {
  const t = useT();
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset", RANK_STYLE[rank])}>{t(`members.rankName.${rank}`)}</span>;
}
