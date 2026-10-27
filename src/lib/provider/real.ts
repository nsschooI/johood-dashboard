/**
 * Real provider: HTTP client for the JoHood bot backend on the Oracle server.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ STUB — NOT YET WIRED. Every method below is a thin call to the       │
 * │ endpoint documented in docs/provider-api.md. None of it has been     │
 * │ run against the real backend. Wiring checklist:                      │
 * │   1. Implement the endpoints on the bot server (see the doc).        │
 * │   2. Set PROVIDER=real, PROVIDER_API_URL, PROVIDER_API_TOKEN.        │
 * │   3. Search this file for "TODO(wire)" and confirm each mapping.     │
 * │   4. Run `npm test` — the contract tests run against any provider.   │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * The backend must never be exposed publicly: bind it to localhost or a
 * private network and authenticate with the shared bearer token.
 */
import type {
  ActivityItem,
  Assistant,
  AssistantAction,
  BotAction,
  BotLogLine,
  BotName,
  BotStatus,
  DataProvider,
  LedgerEntry,
  ListQuery,
  LiveEvent,
  LogLevel,
  MemberProfile,
  MemberSummary,
  Page,
  PointsAdjustInput,
  PointsSummary,
  ProtectionPatch,
  ProtectionSettings,
  PurchaseEvent,
  RankInfo,
  Redemption,
  RoleInfo,
  ServerStats,
  StaffMember,
  Ticket,
  TicketAction,
  TicketQuery,
  TicketSummary,
  Transfer,
  TransferStatus,
} from "../types";
import { ProviderError } from "./errors";

export interface RealProviderOptions {
  baseUrl: string;
  token: string;
  /** Per-request timeout. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

type Query = Record<string, string | number | undefined>;

export class RealProvider implements DataProvider {
  readonly kind = "real" as const;
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private listeners = new Set<(e: LiveEvent) => void>();
  private stream: AbortController | null = null;

  constructor(opts: RealProviderOptions) {
    if (!opts.baseUrl) throw new Error("PROVIDER_API_URL is required when PROVIDER=real");
    if (!opts.token) throw new Error("PROVIDER_API_TOKEN is required when PROVIDER=real");
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.token = opts.token;
    this.timeoutMs = opts.timeoutMs ?? 8000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  // -------------------------------------------------------------------------
  // Transport
  // -------------------------------------------------------------------------

  private url(path: string, query?: Query) {
    const u = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== "") u.searchParams.set(k, String(v));
    return u.toString();
  }

  private async request<T>(method: "GET" | "POST" | "PATCH", path: string, opts: { query?: Query; body?: unknown } = {}): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(this.url(path, opts.query), {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
          ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
        cache: "no-store",
      });
    } catch (err) {
      throw new ProviderError("unavailable", `Bot backend unreachable: ${(err as Error).message}`);
    }
    if (res.status === 404) throw new ProviderError("not_found", await errorText(res));
    if (res.status === 409) throw new ProviderError("conflict", await errorText(res));
    if (res.status === 400 || res.status === 422) throw new ProviderError("invalid", await errorText(res));
    if (!res.ok) throw new ProviderError("upstream", `Bot backend ${res.status}: ${await errorText(res)}`);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private get<T>(path: string, query?: Query) {
    return this.request<T>("GET", path, { query });
  }

  private list(q: ListQuery = {}): Query {
    return { limit: q.limit, cursor: q.cursor, discordId: q.discordId, search: q.search };
  }

  // -------------------------------------------------------------------------
  // Endpoints — TODO(wire): confirm each path & payload with the backend.
  // -------------------------------------------------------------------------

  getBots() {
    return this.get<BotStatus[]>("/bots");
  }

  getBotLogs(name: BotName, opts: { limit?: number; level?: LogLevel } = {}) {
    return this.get<BotLogLine[]>(`/bots/${encodeURIComponent(name)}/logs`, { limit: opts.limit, level: opts.level });
  }

  botAction(name: BotName, action: BotAction) {
    return this.request<BotStatus>("POST", `/bots/${encodeURIComponent(name)}/${action}`);
  }

  getAssistants() {
    return this.get<Assistant[]>("/assistants");
  }

  assistantAction(name: BotName, action: AssistantAction) {
    return this.request<Assistant>("POST", `/assistants/${encodeURIComponent(name)}/${action}`);
  }

  getServerStats() {
    return this.get<ServerStats>("/server/stats");
  }

  getActivity(limit = 50) {
    return this.get<ActivityItem[]>("/activity", { limit });
  }

  getPurchases(q?: ListQuery) {
    return this.get<Page<PurchaseEvent>>("/purchases", this.list(q));
  }

  getTransfers(q: ListQuery & { status?: TransferStatus } = {}) {
    return this.get<Page<Transfer>>("/transfers", { ...this.list(q), status: q.status });
  }

  getRedemptions(q?: ListQuery) {
    return this.get<Page<Redemption>>("/redemptions", this.list(q));
  }

  getPointsSummary() {
    return this.get<PointsSummary>("/points/summary");
  }

  getLedger(discordId: string, q?: ListQuery) {
    return this.get<Page<LedgerEntry>>(`/points/ledger/${encodeURIComponent(discordId)}`, this.list(q));
  }

  adjustPoints(input: PointsAdjustInput) {
    return this.request<LedgerEntry>("POST", "/points/adjust", { body: input });
  }

  searchMembers(query: string, limit = 20) {
    return this.get<MemberSummary[]>("/members/search", { q: query, limit });
  }

  async getMember(discordId: string) {
    try {
      return await this.get<MemberProfile>(`/members/${encodeURIComponent(discordId)}`);
    } catch (err) {
      if (err instanceof ProviderError && err.code === "not_found") return null;
      throw err;
    }
  }

  getRanks() {
    return this.get<RankInfo[]>("/ranks");
  }

  getRoles() {
    return this.get<RoleInfo[]>("/roles");
  }

  getStaff() {
    return this.get<StaffMember[]>("/staff");
  }

  getTickets(q: TicketQuery = {}) {
    return this.get<Page<TicketSummary>>("/tickets", { ...this.list(q), status: q.status });
  }

  async getTicket(id: string) {
    try {
      return await this.get<Ticket>(`/tickets/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof ProviderError && err.code === "not_found") return null;
      throw err;
    }
  }

  ticketAction(id: string, action: TicketAction) {
    return this.request<Ticket>("POST", `/tickets/${encodeURIComponent(id)}/actions`, { body: action });
  }

  getProtection() {
    return this.get<ProtectionSettings>("/protection");
  }

  setProtection(patch: ProtectionPatch) {
    return this.request<ProtectionSettings>("PATCH", "/protection", { body: patch });
  }

  // -------------------------------------------------------------------------
  // Live stream: one upstream SSE connection shared by all dashboard clients.
  // TODO(wire): confirm event names match LiveEvent["type"].
  // -------------------------------------------------------------------------

  subscribe(listener: (e: LiveEvent) => void) {
    this.listeners.add(listener);
    if (!this.stream) void this.connect();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stream?.abort();
        this.stream = null;
      }
    };
  }

  private async connect(attempt = 0): Promise<void> {
    const ctrl = new AbortController();
    this.stream = ctrl;
    try {
      const res = await this.fetchImpl(this.url("/events/stream"), {
        headers: { Authorization: `Bearer ${this.token}`, Accept: "text/event-stream" },
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
      attempt = 0;
      for await (const evt of parseSse(res.body)) {
        if (!evt.event || !evt.data) continue;
        let data: unknown;
        try {
          data = JSON.parse(evt.data);
        } catch {
          continue;
        }
        const event = { type: evt.event, data } as LiveEvent;
        for (const l of this.listeners) l(event);
      }
    } catch {
      // fall through to reconnect
    }
    if (ctrl.signal.aborted || this.listeners.size === 0) return;
    const delay = Math.min(30_000, 1000 * 2 ** attempt);
    setTimeout(() => {
      if (this.stream === ctrl && this.listeners.size > 0) void this.connect(attempt + 1);
    }, delay).unref?.();
  }
}

async function errorText(res: Response) {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error ?? body.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

/** Minimal Server-Sent Events parser over a byte stream. */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<{ event?: string; data: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.search(/\r?\n\r?\n/)) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx).replace(/^\r?\n\r?\n/, "");
      let event: string | undefined;
      const data: string[] = [];
      for (const line of raw.split(/\r?\n/)) {
        if (line.startsWith(":")) continue;
        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field === "event") event = value;
        else if (field === "data") data.push(value);
      }
      if (data.length) yield { event, data: data.join("\n") };
    }
  }
}
