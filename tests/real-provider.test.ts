import { describe, expect, it } from "vitest";
import { RealProvider, parseSse } from "@/lib/provider/real";
import { ProviderError } from "@/lib/provider/errors";
import type { LiveEvent } from "@/lib/types";

type Call = { url: string; init: RequestInit };

function fakeFetch(handler: (url: URL, init: RequestInit) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fn = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    return handler(new URL(String(input)), init);
  }) as typeof fetch;
  return { fn, calls };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("RealProvider (HTTP client stub)", () => {
  it("requires a base URL and token", () => {
    expect(() => new RealProvider({ baseUrl: "", token: "x" })).toThrow();
    expect(() => new RealProvider({ baseUrl: "http://x", token: "" })).toThrow();
  });

  it("sends the bearer token and maps endpoints from docs/provider-api.md", async () => {
    const { fn, calls } = fakeFetch(() => json([]));
    const p = new RealProvider({ baseUrl: "http://bots.internal:8080/api/", token: "t0k", fetchImpl: fn });
    await p.getBots();
    await p.getPurchases({ limit: 10, cursor: "pur_1", search: "" });
    await p.getBotLogs("ops", { level: "warn" });
    expect(calls.map((c) => c.url)).toEqual([
      "http://bots.internal:8080/api/bots",
      "http://bots.internal:8080/api/purchases?limit=10&cursor=pur_1",
      "http://bots.internal:8080/api/bots/ops/logs?level=warn",
    ]);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer t0k");
  });

  it("POSTs mutations with a JSON body", async () => {
    const { fn, calls } = fakeFetch(() => json({ id: "led_1" }));
    const p = new RealProvider({ baseUrl: "http://x", token: "t", fetchImpl: fn });
    const actor = { discordId: "a", name: "A", avatarUrl: null };
    await p.adjustPoints({ discordId: "m", delta: 5, reason: "why", actor });
    await p.botAction("tickets", "restart");
    await p.setProtection({ lockdown: true });
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ discordId: "m", delta: 5, reason: "why", actor });
    expect(calls[1].url).toBe("http://x/bots/tickets/restart");
    expect(calls[2].init.method).toBe("PATCH");
  });

  it("maps HTTP errors to ProviderError codes", async () => {
    const statuses = [404, 409, 400, 500];
    let i = 0;
    const { fn } = fakeFetch(() => json({ error: "nope" }, statuses[i++]));
    const p = new RealProvider({ baseUrl: "http://x", token: "t", fetchImpl: fn });
    for (const code of ["not_found", "conflict", "invalid", "upstream"]) {
      await expect(p.getServerStats()).rejects.toMatchObject({ code });
    }
  });

  it("returns null for a missing member or ticket", async () => {
    const { fn } = fakeFetch(() => json({ error: "missing" }, 404));
    const p = new RealProvider({ baseUrl: "http://x", token: "t", fetchImpl: fn });
    expect(await p.getMember("1")).toBeNull();
    expect(await p.getTicket("1")).toBeNull();
  });

  it("reports an unreachable backend as unavailable", async () => {
    const fn = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const p = new RealProvider({ baseUrl: "http://x", token: "t", fetchImpl: fn });
    const err = await p.getBots().catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.code).toBe("unavailable");
  });

  it("streams live events from /events/stream", async () => {
    const enc = new TextEncoder();
    const { fn } = fakeFetch(
      () =>
        new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(enc.encode(': hello\n\nevent: stats\ndata: {"members":1}\n\n'));
              c.enqueue(enc.encode('event: purchase\ndata: {"id":"p1"}\n\n'));
              c.close();
            },
          }),
        ),
    );
    const p = new RealProvider({ baseUrl: "http://x", token: "t", fetchImpl: fn });
    const got: LiveEvent[] = [];
    const off = p.subscribe((e) => got.push(e));
    await new Promise((r) => setTimeout(r, 20));
    off();
    expect(got.map((e) => e.type)).toEqual(["stats", "purchase"]);
  });
});

describe("parseSse", () => {
  it("handles split chunks, multi-line data and comments", async () => {
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode("event: a\nda"));
        c.enqueue(enc.encode("ta: 1\ndata: 2\n\n: ping\n\ndata: x\r\n\r\n"));
        c.close();
      },
    });
    const out = [];
    for await (const e of parseSse(body)) out.push(e);
    expect(out).toEqual([
      { event: "a", data: "1\n2" },
      { event: undefined, data: "x" },
    ]);
  });
});
