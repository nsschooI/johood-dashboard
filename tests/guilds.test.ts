import { afterEach, describe, expect, it } from "vitest";
import { MockProvider } from "@/lib/provider/mock";
import { RealProvider } from "@/lib/provider/real";
import { createRng } from "@/lib/rng";
import { GUILD_KEYS, type LiveEvent } from "@/lib/types";

const made: MockProvider[] = [];
const make = () => {
  const p = new MockProvider({ seed: 11, autoTick: false, liveRng: createRng(4) });
  made.push(p);
  return p;
};
afterEach(() => made.splice(0).forEach((p) => p.stop()));

describe("multi-server mock", () => {
  it("lists both servers with distinct identity and counts", async () => {
    const p = make();
    expect((await p.getGuilds()).map((g) => g.key)).toEqual([...GUILD_KEYS]);
    const [main, catalog] = await Promise.all([p.getGuildInfo("main"), p.getGuildInfo("catalog")]);
    expect(main.name).not.toBe(catalog.name);
    expect(main.members).toBeGreaterThan(catalog.members);
    expect(main.iconUrl).toBeTruthy();
  });

  it("keeps stats per server; tickets exist only in Catalog", async () => {
    const p = make();
    const main = await p.getServerStats("main");
    const catalog = await p.getServerStats("catalog");
    expect(main.guild).toBe("main");
    expect(catalog.guild).toBe("catalog");
    expect(main.ticketsOpen).toBeNull();
    expect(catalog.ticketsOpen).toBeGreaterThan(0);
    expect((await p.getTickets({ guild: "main" })).items).toHaveLength(0);
    const t = (await p.getTickets({ guild: "catalog", limit: 5 })).items;
    expect(t.length).toBeGreaterThan(0);
    expect(t.every((x) => x.guild === "catalog")).toBe(true);
  });

  it("scopes members and roles to the server", async () => {
    const p = make();
    const main = await p.searchMembers("", 50, "main");
    const catalog = await p.searchMembers("", 50, "catalog");
    expect(main.length).toBe(50);
    expect(catalog.length).toBe(50);
    const mainRoles = (await p.getRoles("main")).map((r) => r.name);
    const catalogRoles = (await p.getRoles("catalog")).map((r) => r.name);
    expect(catalogRoles).toContain("Support Staff");
    expect(mainRoles).not.toContain("Support Staff");
    // Someone in main but not in Catalog has no Catalog profile.
    const all = await p.searchMembers("", 50, "main");
    let missing = 0;
    for (const m of all) if (!(await p.getMember(m.discordId, "catalog"))) missing++;
    expect(missing).toBeGreaterThan(0);
  });

  it("tags server-specific live events with their server", () => {
    const p = make();
    const events: LiveEvent[] = [];
    p.subscribe((e) => events.push(e));
    let t = Date.now();
    for (let i = 0; i < 300; i++) p.tick((t += 1000));
    const stats = events.filter((e) => e.type === "stats");
    expect(new Set(stats.map((e) => (e.type === "stats" ? e.data.guild : null)))).toEqual(new Set(["main", "catalog"]));
    for (const e of events) {
      if (e.type === "ticket") expect(e.data.guild).toBe("catalog");
      if (e.type === "activity" && e.data.kind === "member_join") expect(e.data.guild).toBeDefined();
    }
  });

  it("gives purchases an asset id and members avatars", async () => {
    const p = make();
    const { items } = await p.getPurchases({ limit: 20 });
    expect(items.every((x) => typeof x.assetId === "string")).toBe(true);
    const members = await p.searchMembers("", 30);
    expect(members.some((m) => m.avatarUrl)).toBe(true);
  });
});

describe("real provider guild paths", () => {
  it("calls /server/list, /server/info and appends ?guild=", async () => {
    const urls: string[] = [];
    const fn = (async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return new Response("[]", { status: 200 });
    }) as typeof fetch;
    const p = new RealProvider({ baseUrl: "http://x", token: "t", fetchImpl: fn });
    await p.getGuilds();
    await p.getGuildInfo("catalog");
    await p.getServerStats("main");
    await p.searchMembers("nour", 5, "catalog");
    await p.getMember("42", "catalog");
    await p.getRoles("main");
    await p.getTickets({ guild: "catalog", status: "active" });
    expect(urls).toEqual([
      "http://x/server/list",
      "http://x/server/info?guild=catalog",
      "http://x/server/stats?guild=main",
      "http://x/members/search?q=nour&limit=5&guild=catalog",
      "http://x/members/42?guild=catalog",
      "http://x/roles?guild=main",
      "http://x/tickets?status=active&guild=catalog",
    ]);
  });

  it("maps 501 to not_implemented", async () => {
    const fn = (async () => new Response(JSON.stringify({ error: "not implemented" }), { status: 501 })) as typeof fetch;
    const p = new RealProvider({ baseUrl: "http://x", token: "t", fetchImpl: fn });
    await expect(p.botAction("ops", "restart")).rejects.toMatchObject({ code: "not_implemented", status: 501 });
  });
});
