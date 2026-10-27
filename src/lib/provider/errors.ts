export type ProviderErrorCode = "not_found" | "conflict" | "invalid" | "unavailable" | "upstream";

const STATUS: Record<ProviderErrorCode, number> = {
  not_found: 404,
  conflict: 409,
  invalid: 400,
  unavailable: 503,
  upstream: 502,
};

/** Errors a provider may throw; API routes turn them into JSON responses. */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly status: number;

  constructor(code: ProviderErrorCode, message: string) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.status = STATUS[code];
  }
}
