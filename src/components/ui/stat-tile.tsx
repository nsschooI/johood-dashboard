"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons/icon";
import { CountUp } from "./count-up";
import { cn } from "./cn";

/**
 * A number that matters: label, big Rubik figure (counts up on change),
 * optional delta and a footnote. `tone` tints the icon only — the number
 * stays in ink so it reads in both themes.
 */
export function StatTile({
  label,
  value,
  format,
  icon,
  tone = "accent",
  delta,
  foot,
  children,
  className,
  href,
}: {
  label: string;
  value: number | null;
  format: (n: number) => string;
  icon?: IconName;
  tone?: "accent" | "good" | "warn" | "bad" | "info" | "guild";
  delta?: { value: string; direction: "up" | "down" | "flat"; good?: boolean } | null;
  foot?: ReactNode;
  children?: ReactNode;
  className?: string;
  href?: string;
}) {
  const tones = {
    accent: "text-accent-400 bg-accent-500/10",
    good: "text-good bg-good/12",
    warn: "text-warn bg-warn/14",
    bad: "text-bad bg-bad/12",
    info: "text-info bg-info/12",
    guild: "text-guild-ink bg-[color-mix(in_oklab,var(--color-guild)_14%,transparent)]",
  };
  const Body = (
    <>
      <div className="flex items-center gap-2">
        {icon && (
          <span className={cn("grid size-8 place-items-center rounded-lg", tones[tone])}>
            <Icon name={icon} size={18} duo />
          </span>
        )}
        <p className="text-[13px] font-medium text-ink-3">{label}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
        <p className="font-display tabular text-[1.85rem] leading-none font-bold whitespace-nowrap text-ink">{value === null ? "—" : <CountUp value={value} format={format} />}</p>
        {delta && (
          <span
            className={cn(
              "mb-0.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
              delta.direction === "flat" ? "bg-surface-3 text-ink-3" : delta.good ? "bg-good/12 text-good" : "bg-bad/12 text-bad",
            )}
          >
            {delta.direction !== "flat" && <Icon name={delta.direction === "up" ? "trendUp" : "trendDown"} size={12} />}
            {delta.value}
          </span>
        )}
      </div>
      {foot && <div className="mt-2 text-xs text-ink-3">{foot}</div>}
      {children}
    </>
  );
  const cls = cn("glass block rounded-[var(--radius-card)] p-4", href && "lift", className);
  return href ? (
    <a href={href} className={cls}>
      {Body}
    </a>
  ) : (
    <div className={cls}>{Body}</div>
  );
}
