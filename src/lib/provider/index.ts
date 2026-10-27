import "server-only";
import type { DataProvider } from "../types";
import { MockProvider } from "./mock";
import { RealProvider } from "./real";

const globalForProvider = globalThis as unknown as { __johoodProvider?: DataProvider };

/**
 * The process-wide provider. Kept on globalThis so dev hot-reloads don't
 * start a second mock simulation. Selected by the PROVIDER env var.
 */
export function getProvider(): DataProvider {
  if (!globalForProvider.__johoodProvider) {
    const kind = process.env.PROVIDER ?? "mock";
    globalForProvider.__johoodProvider =
      kind === "real"
        ? new RealProvider({ baseUrl: process.env.PROVIDER_API_URL ?? "", token: process.env.PROVIDER_API_TOKEN ?? "" })
        : new MockProvider({ notImplemented: process.env.MOCK_NOT_IMPLEMENTED === "true" });
  }
  return globalForProvider.__johoodProvider;
}

export { ProviderError } from "./errors";
