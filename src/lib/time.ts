/** Time helpers shared by server and client. */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** IANA zone used for "today" and daily/weekly buckets. */
export const DASHBOARD_TIMEZONE = process.env.NEXT_PUBLIC_DASHBOARD_TIMEZONE || "Asia/Amman";

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

/** Local calendar date ("YYYY-MM-DD") of an instant in the given zone. */
export function dayKey(at: string | number | Date, timeZone = DASHBOARD_TIMEZONE): string {
  let fmt = dayFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    dayFormatters.set(timeZone, fmt);
  }
  return fmt.format(new Date(at));
}

/** Monday of the ISO week containing the given day key, as a day key. */
export function weekKey(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** Day keys for the last `n` days ending today, oldest first. */
export function lastDays(n: number, now = Date.now(), timeZone = DASHBOARD_TIMEZONE): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(now - i * DAY, timeZone));
  return [...new Set(out)];
}

/** Week keys for the last `n` ISO weeks ending this week, oldest first. */
export function lastWeeks(n: number, now = Date.now(), timeZone = DASHBOARD_TIMEZONE): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(weekKey(dayKey(now - i * 7 * DAY, timeZone)));
  return [...new Set(out)];
}
