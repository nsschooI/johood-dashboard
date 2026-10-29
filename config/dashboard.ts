/**
 * Tunable limits for the dashboard. Safe to commit: no secrets here.
 */
export const DASHBOARD_CONFIG = {
  /** Adjustments with |delta| above this need an explicit confirm step. */
  pointsConfirmThreshold: 1000,
  /** Largest single adjustment a role with only `points.adjust_limited` may make. */
  limitedAdjustMax: 500,
  /** A purchase at or above this many Robux raises a "big purchase" alert. */
  bigPurchaseRobux: 400,
  /** Minimum length of the written reason on a point adjustment. */
  minReasonLength: 5,
  /** Session lifetime. Roles are re-read from Discord on every new login. */
  sessionTtlHours: 12,
  /** Sliding-window rate limits for sensitive endpoints (per user). */
  rateLimits: {
    /** Bot / assistant control. */
    control: { limit: 10, windowMs: 60_000 },
    /** Point adjustments. */
    points: { limit: 20, windowMs: 60_000 },
    /** Protection & permission changes. */
    settings: { limit: 15, windowMs: 60_000 },
    /** Ticket actions. */
    tickets: { limit: 60, windowMs: 60_000 },
    /** Login attempts (per IP). */
    login: { limit: 20, windowMs: 5 * 60_000 },
  },
} as const;
