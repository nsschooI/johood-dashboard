"use client";

let csrfToken = "";

/** Set once by AppProvider from the server-rendered session. */
export function setCsrfToken(token: string) {
  csrfToken = token;
}

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
  }
  get needsConfirm() {
    return this.status === 428;
  }
}

/**
 * fetch wrapper for the dashboard API: JSON in/out, CSRF header on
 * mutations, typed errors, and a redirect to /login when the session ends.
 */
export async function api<T>(path: string, opts: { method?: "GET" | "POST" | "PUT" | "PATCH"; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const res = await fetch(path, {
    method,
    headers: {
      Accept: "application/json",
      ...(method !== "GET" ? { "Content-Type": "application/json", "X-CSRF-Token": csrfToken } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : method !== "GET" ? "{}" : undefined,
    credentials: "same-origin",
    cache: "no-store",
    signal: opts.signal,
  });
  if (res.ok) return (await res.json()) as T;
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    // non-JSON error
  }
  if (res.status === 401 && typeof window !== "undefined") {
    // Called outside React (no router); a full reload also drops stale state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login?error=expired");
  }
  throw new ApiClientError(res.status, String(body.error ?? "error"), String(body.message ?? res.statusText), body);
}

export function qs(params: Record<string, string | number | undefined | null>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}
