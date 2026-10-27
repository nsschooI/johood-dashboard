/** Motion tokens for JavaScript — keep in sync with the @theme block in globals.css. */
export const MOTION = {
  instant: 90,
  fast: 160,
  base: 240,
  slow: 420,
  count: 900,
  stagger: 45,
} as const;

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** easeOutCubic, used by the count-up. */
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
