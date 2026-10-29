"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "@/components/icons/icon";
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
        leading={<Icon name="search" size={16} />}
        autoComplete="off"
        maxLength={64}
      />
      <ul className="mt-2 space-y-0.5" aria-busy={loading} aria-label={t("members.search")}>
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
                      "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-start transition active:scale-[0.99]",
                      selectedId === m.discordId ? "bg-[color-mix(in_oklab,var(--color-accent-500)_9%,var(--color-surface))] ring-1 ring-inset ring-accent-500/25" : "hover:bg-surface-2",
                    )}
                  >
                    <Avatar name={m.displayName} src={m.avatarUrl} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink"><bdi>{m.displayName}</bdi></span>
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
  newcomer: "ring-line bg-surface-2",
  bronze: "ring-orange-400/35 bg-orange-400/[0.08]",
  silver: "ring-slate-400/35 bg-slate-300/[0.1]",
  gold: "ring-amber-400/40 bg-amber-300/[0.12]",
  diamond: "ring-cyan-400/40 bg-cyan-300/[0.1]",
  legend: "ring-fuchsia-400/40 bg-fuchsia-400/10",
};

export function RankBadge({ rank, size = "sm" }: { rank: MemberSummary["rank"]; size?: "sm" | "md" }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap ring-1 ring-inset",
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
