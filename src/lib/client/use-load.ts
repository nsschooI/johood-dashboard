"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface LoadState<T> {
  key: string | null;
  nonce: number;
  data?: T;
  error?: boolean;
}

/**
 * Load data for a key (null = idle). Results are tagged with the key they
 * belong to, so a key change shows the loading state without resetting
 * state inside the effect. `setData` lets live events patch the result.
 */
export function useLoad<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<LoadState<T>>({ key: null, nonce: 0 });
  const loader = useRef(load);
  useEffect(() => {
    loader.current = load;
  });

  useEffect(() => {
    if (key === null) return;
    const ctrl = new AbortController();
    loader
      .current(ctrl.signal)
      .then((data) => setState({ key, nonce, data }))
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.error(err);
        setState({ key, nonce, error: true });
      });
    return () => ctrl.abort();
  }, [key, nonce]);

  const current = key !== null && state.key === key && state.nonce === nonce;
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((fn: (cur: T) => T) => setState((s) => (s.data === undefined ? s : { ...s, data: fn(s.data) })), []);

  return {
    data: current ? state.data : undefined,
    error: current && Boolean(state.error),
    loading: key !== null && !current,
    reload,
    setData,
  };
}
