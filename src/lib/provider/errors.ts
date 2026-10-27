export type ProviderErrorCode = "not_found" | "conflict" | "invalid" | "unavailable" | "upstream" | "not_implemented";

const STATUS: Record<ProviderErrorCode, number> = {
  not_found: 404,
  conflict: 409,
  invalid: 400,
  unavailable: 503,
  upstream: 502,
  /** The backend knows the action but hasn't built it yet. Nothing changed. */
  not_implemented: 501,
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
