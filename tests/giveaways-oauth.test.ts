import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { authorizeUrl, decodeState, encodeState, newState, sameState } from "@/lib/server/giveaways-oauth";

describe("giveaways oauth state", () => {
  it("round-trips a state through the cookie value", () => {
    const state = newState("authorize", "/giveaways/3");
    expect(decodeState(encodeState(state))).toEqual(state);
  });

  it("refuses anything that is not our own shape", () => {
    expect(decodeState(undefined)).toBeNull();
    expect(decodeState("not-base64-json")).toBeNull();
    const bad = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    expect(decodeState(bad({ s: "short", mode: "login", next: "/giveaways" }))).toBeNull();
    expect(decodeState(bad({ s: "x".repeat(32), mode: "admin", next: "/giveaways" }))).toBeNull();
    expect(decodeState(bad({ s: "x".repeat(32), mode: "login", next: "https://evil.example" }))).toBeNull();
    expect(decodeState(bad({ s: "x".repeat(32), mode: "login", next: "/overview" }))).toBeNull();
  });

  it("compares states without accepting a different or empty one", () => {
    expect(sameState("abc", "abc")).toBe(true);
    expect(sameState("abc", "abd")).toBe(false);
    expect(sameState("", "")).toBe(false);
    expect(sameState("abc", "abcd")).toBe(false);
  });

  it("builds the Discord URL with the right scope per mode", () => {
    process.env.GIVEAWAYS_CLIENT_ID = "1563581474614026410";
    process.env.APP_URL = "https://example.test";
    const login = new URL(authorizeUrl(newState("login", "/giveaways")));
    expect(login.origin + login.pathname).toBe("https://discord.com/oauth2/authorize");
    expect(login.searchParams.get("scope")).toBe("identify");
    expect(login.searchParams.get("prompt")).toBeNull();
    expect(login.searchParams.get("redirect_uri")).toBe("https://example.test/api/giveaways/callback");
    const authorize = new URL(authorizeUrl(newState("authorize", "/giveaways")));
    expect(authorize.searchParams.get("scope")).toBe("identify guilds.join");
    expect(authorize.searchParams.get("prompt")).toBe("consent");
    expect(authorize.searchParams.get("client_secret")).toBeNull();
  });
});
