import "server-only";
import { getProvider } from "../provider";
import type { MockGiveaways } from "../giveaways/mock";

/** The mock giveaways backend, or null in real mode (mock-only helpers). */
export function mockGiveaways(): MockGiveaways | null {
  const p = getProvider();
  return p.kind === "mock" ? (p.giveaways as MockGiveaways) : null;
}

/** Append a query flag to a validated relative path. */
export function withFlag(path: string, key: string, value = "1") {
  const u = new URL(path, "https://johood.invalid");
  u.searchParams.set(key, value);
  return u.pathname + u.search + u.hash;
}
