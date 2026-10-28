/**
 * Validate a `next` redirect target for the public giveaway flows: only a
 * relative path inside /giveaways is allowed. Anything else (absolute URLs,
 * protocol-relative `//evil`, backslashes, control characters, staff pages)
 * falls back to /giveaways.
 */
export const DEFAULT_NEXT = "/giveaways";

export function safeNext(next: unknown): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 200) return DEFAULT_NEXT;
  if (!next.startsWith("/giveaways")) return DEFAULT_NEXT;
  if (/[\\\u0000-\u001f\u007f]/.test(next) || next.startsWith("//") || next.includes("/../") || next.endsWith("/..")) return DEFAULT_NEXT;
  let url: URL;
  try {
    url = new URL(next, "https://johood.invalid");
  } catch {
    return DEFAULT_NEXT;
  }
  if (url.origin !== "https://johood.invalid") return DEFAULT_NEXT;
  const path = url.pathname;
  if (path !== "/giveaways" && !path.startsWith("/giveaways/")) return DEFAULT_NEXT;
  return path + url.search + url.hash;
}
