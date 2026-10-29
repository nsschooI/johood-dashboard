"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "@/components/icons/icon";
import { useApp, useCan, useFormat } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { LinkedChip, MemberBadge } from "@/components/people/member-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { usePagedList } from "@/lib/client/use-paged";
import type { MemberRow, MemberSort } from "@/lib/types";

/** Debounce a text input for list queries. */
export function useDebounced(value: string, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value.trim()), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Every member of the selected server: search, sort and load more. */
export function MemberDirectory({ selectedId, onSelect }: { selectedId: string | null; onSelect: (m: MemberRow) => void }) {
  const { t } = useApp();
  const f = useFormat();
  const can = useCan();
  const { guild } = useGuild();
  const id = useId();
  const full = can("members.view_full");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<MemberSort>(full ? "points" : "joined");
  const query = useDebounced(q);
  const list = usePagedList<MemberRow>("/api/members/directory", { q: query, sort, guild }, 30);

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="sr-only">
        {t("dir.search")}
      </label>
      <Input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("dir.search")}
        leading={<Icon name="search" size={16} />}
        autoComplete="off"
        maxLength={64}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          size="sm"
          label={t("dir.sortBy")}
          value={sort}
          onChange={setSort}
          options={[
            ...(full ? [{ value: "points" as MemberSort, label: t("dir.sort.points") }] : []),
            { value: "joined" as MemberSort, label: t("dir.sort.joined") },
            { value: "name" as MemberSort, label: t("dir.sort.name") },
          ]}
        />
        {list.total !== null && (
          <span className="ms-auto text-xs text-ink-3" aria-live="polite">
            {query ? t("dir.found", { n: f.n(list.total) }) : t("dir.showing", { shown: f.n(list.items?.length ?? 0), total: f.n(list.total) })}
          </span>
        )}
      </div>

      {list.error ? (
        <ErrorState title={t("common.error")} action={<Button onClick={list.reload}>{t("common.retry")}</Button>} />
      ) : list.items === null ? (
        <ul className="space-y-1" aria-busy>
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-2 py-2.5">
              <Skeleton className="size-10 rounded-full" />
              <span className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2.5 w-1/3" />
              </span>
              <Skeleton className="h-4 w-12" />
            </li>
          ))}
        </ul>
      ) : list.items.length === 0 ? (
        <EmptyState art="search" title={t("dir.noMatch")} hint={t("dir.noMatchHint")} compact />
      ) : (
        <ul className="-mx-1 space-y-0.5" aria-label={t("nav.members")}>
          {list.items.map((m) => (
            <li key={m.discordId}>
              <button
                type="button"
                onClick={() => onSelect(m)}
                aria-current={selectedId === m.discordId ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-start transition active:scale-[0.99]",
                  selectedId === m.discordId ? "bg-[color-mix(in_oklab,var(--color-accent-500)_9%,var(--color-surface))] ring-1 ring-inset ring-accent-500/25" : "hover:bg-surface-2",
                )}
              >
                <Avatar name={m.displayName} src={m.avatarUrl} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <bdi className="truncate text-sm font-semibold text-ink">{m.displayName}</bdi>
                    <MemberBadge badge={m.badge} className="shrink-0" />
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-3">
                    <span className="truncate" dir="ltr">
                      @{m.username}
                    </span>
                    <LinkedChip linked={m.linked} className="shrink-0" />
                  </span>
                </span>
                {m.points !== null && (
                  <span className="shrink-0 text-end">
                    <span className="font-display tabular block text-sm font-bold text-ink">{f.compact(m.points)}</span>
                    <span className="block text-[10px] text-ink-3">{t("dir.pts")}</span>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {list.hasMore && (
        <Button variant="ghost" size="sm" onClick={list.loadMore} loading={list.loadingMore} className="self-center">
          {list.moreError ? t("common.retry") : t("common.loadMore")}
        </Button>
      )}
    </div>
  );
}
