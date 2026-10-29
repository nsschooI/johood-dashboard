"use client";

import { useCallback, useState } from "react";
import type { NumberedPage } from "@/lib/types";
import { api, qs } from "./api";
import { useLoad } from "./use-load";

/**
 * A numbered-page list that grows with "load more". Changing `params`
 * starts again from page 1; `patch` updates rows in place (e.g. after an
 * invitation was sent).
 */
export function usePagedList<T>(path: string | null, params: Record<string, string | number | undefined | null>, pageSize = 25) {
  const url = path ? `${path}${qs({ ...params, pageSize })}` : null;
  const { data, error, notFound, loading, reload, setData } = useLoad(url, (signal) => api<NumberedPage<T>>(`${path}${qs({ ...params, pageSize, page: 1 })}`, { signal }));
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);

  const loadMore = useCallback(async () => {
    if (!data || !path) return;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const next = await api<NumberedPage<T>>(`${path}${qs({ ...params, pageSize, page: data.page + 1 })}`);
      setData((d) => ({ ...next, items: [...d.items, ...next.items] }));
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
    // params is spread into the URL above; its identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, path, pageSize, setData, url]);

  const patch = useCallback((match: (row: T) => boolean, fn: (row: T) => T) => setData((d) => ({ ...d, items: d.items.map((r) => (match(r) ? fn(r) : r)) })), [setData]);

  return {
    items: data?.items ?? null,
    total: data?.total ?? null,
    error,
    notFound,
    loading,
    reload,
    loadMore,
    loadingMore,
    moreError,
    hasMore: data ? data.page * data.pageSize < data.total : false,
    patch,
  };
}
