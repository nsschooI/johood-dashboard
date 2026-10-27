"use client";

import { Fragment, useCallback, useEffect, useId, useState } from "react";
import { ChevronDown, RefreshCw, ScrollText, Search } from "lucide-react";
import { useFormat, useT } from "@/components/providers/app-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Input, Select } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, Td, Th } from "@/components/points/tables";
import { api, qs } from "@/lib/client/api";
import { primaryRole } from "@/lib/permissions";
import type { AuditEntry } from "@/lib/types";

interface AuditPage {
  items: AuditEntry[];
  nextCursor: number | null;
  facets?: { actors: { id: string; name: string }[]; actions: string[] };
}

export function AuditCard() {
  const t = useT();
  const f = useFormat();
  const id = useId();
  const [filters, setFilters] = useState({ q: "", actorId: "", action: "", from: "", to: "" });
  const [applied, setApplied] = useState(filters);
  const [items, setItems] = useState<AuditEntry[] | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [facets, setFacets] = useState<AuditPage["facets"]>();
  const [error, setError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [reload, setReload] = useState(0);

  const query = useCallback(
    (beforeId?: number) =>
      qs({
        q: applied.q,
        actorId: applied.actorId,
        action: applied.action,
        from: applied.from ? new Date(`${applied.from}T00:00:00`).toISOString() : "",
        to: applied.to ? new Date(`${applied.to}T23:59:59.999`).toISOString() : "",
        limit: 30,
        beforeId,
        facets: beforeId ? undefined : "1",
      }),
    [applied],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setItems(null);
    setError(false);
    api<AuditPage>(`/api/audit${query()}`, { signal: ctrl.signal })
      .then((p) => {
        setItems(p.items);
        setCursor(p.nextCursor);
        setFacets(p.facets);
      })
      .catch(() => !ctrl.signal.aborted && setError(true));
    return () => ctrl.abort();
  }, [query, reload]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const p = await api<AuditPage>(`/api/audit${query(cursor)}`);
      setItems((cur) => [...(cur ?? []), ...p.items]);
      setCursor(p.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const set = (k: keyof typeof filters) => (e: { target: { value: string } }) => setFilters((x) => ({ ...x, [k]: e.target.value }));

  return (
    <Card aria-labelledby="audit-title" className="overflow-hidden">
      <CardHeader
        id="audit-title"
        title={t("audit.title")}
        icon={<ScrollText className="size-4" aria-hidden />}
        actions={
          <Button size="sm" variant="ghost" onClick={() => setReload((n) => n + 1)} aria-label={t("common.refresh")}>
            <RefreshCw aria-hidden className="size-3.5" />
            {t("common.refresh")}
          </Button>
        }
      />
      <form
        className="grid gap-2 px-5 pb-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
        }}
      >
        <label className="sr-only" htmlFor={`${id}-q`}>
          {t("common.search")}
        </label>
        <Input id={`${id}-q`} value={filters.q} onChange={set("q")} placeholder={t("common.search")} leading={<Search className="size-4" aria-hidden />} maxLength={64} />
        <label className="sr-only" htmlFor={`${id}-actor`}>
          {t("audit.actor")}
        </label>
        <Select id={`${id}-actor`} value={filters.actorId} onChange={set("actorId")}>
          <option value="">{t("audit.anyActor")}</option>
          {facets?.actors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <label className="sr-only" htmlFor={`${id}-action`}>
          {t("audit.action")}
        </label>
        <Select id={`${id}-action`} value={filters.action} onChange={set("action")}>
          <option value="">{t("audit.anyAction")}</option>
          {facets?.actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <label className="sr-only" htmlFor={`${id}-from`}>
          {t("audit.from")}
        </label>
        <Input id={`${id}-from`} type="date" value={filters.from} onChange={set("from")} title={t("audit.from")} />
        <label className="sr-only" htmlFor={`${id}-to`}>
          {t("audit.to")}
        </label>
        <Input id={`${id}-to`} type="date" value={filters.to} onChange={set("to")} title={t("audit.to")} />
        <Button type="submit" variant="primary">
          {t("audit.filter")}
        </Button>
      </form>

      {error ? (
        <ErrorState title={t("common.error")} action={<Button onClick={() => setReload((n) => n + 1)}>{t("common.retry")}</Button>} />
      ) : items === null ? (
        <div className="space-y-2 px-5 pb-5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={t("audit.empty")} />
      ) : (
        <Table label={t("audit.title")} className="max-h-[32rem]">
          <thead>
            <tr>
              <Th>{t("audit.when")}</Th>
              <Th>{t("audit.actor")}</Th>
              <Th>{t("audit.action")}</Th>
              <Th>{t("audit.target")}</Th>
              <Th>{t("common.reason")}</Th>
              <Th>{t("audit.result")}</Th>
              <Th>
                <span className="sr-only">{t("audit.details")}</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => {
              const role = primaryRole(e.actorRoles);
              const expanded = open === e.id;
              const hasDiff = e.before !== null || e.after !== null;
              return (
                <Fragment key={e.id}>
                  <tr className="hover:bg-white/[0.02]">
                    <Td className="text-xs whitespace-nowrap text-ink-3">{f.dateTime(e.at)}</Td>
                    <Td>
                      <span className="block text-sm text-ink">{e.actorName}</span>
                      {role && <span className="text-[11px] text-ink-3">{t(`roles.${role}`)}</span>}
                    </Td>
                    <Td>
                      <code className="text-xs text-accent-200" dir="ltr">
                        {e.action}
                      </code>
                    </Td>
                    <Td className="text-xs text-ink-2">
                      <span dir="ltr">{e.target ?? "—"}</span>
                    </Td>
                    <Td className="max-w-64 text-xs text-ink-2">
                      <span className="block truncate" title={e.reason ?? ""}>
                        {e.reason ?? "—"}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone={e.ok ? "good" : "bad"}>{e.ok ? t("audit.ok") : t("audit.denied")}</Badge>
                    </Td>
                    <Td>
                      {hasDiff && (
                        <Button size="sm" variant="ghost" onClick={() => setOpen(expanded ? null : e.id)} aria-expanded={expanded} aria-label={t("audit.details")}>
                          <ChevronDown aria-hidden className={cn("size-4 transition", expanded && "rotate-180")} />
                        </Button>
                      )}
                    </Td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={7} className="border-b border-line bg-white/[0.02] px-5 py-3">
                        <div className="grid gap-3 sm:grid-cols-2" dir="ltr">
                          <Diff label={t("audit.before")} value={e.before} />
                          <Diff label={t("audit.after")} value={e.after} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      )}
      {cursor && items && (
        <div className="border-t border-line p-3 text-center">
          <Button size="sm" variant="ghost" onClick={loadMore} loading={loadingMore}>
            {t("common.loadMore")}
          </Button>
        </div>
      )}
    </Card>
  );
}

function Diff({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium tracking-wide text-ink-3 uppercase">{label}</p>
      <pre className="overflow-x-auto rounded-xl bg-bg/60 p-3 font-mono text-[11px] leading-relaxed text-ink-2 ring-1 ring-inset ring-line">
        {value === null || value === undefined ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
