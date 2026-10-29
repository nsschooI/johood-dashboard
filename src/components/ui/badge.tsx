import type { ReactNode } from "react";
import { cn } from "./cn";

export type Tone = "neutral" | "accent" | "good" | "warn" | "bad" | "info";

const TONE: Record<Tone, string> = {
  neutral: "bg-surface-3/80 text-ink-2",
  accent: "bg-accent-500/12 text-accent-300",
  good: "bg-good/12 text-good",
  warn: "bg-warn/14 text-warn",
  bad: "bg-bad/12 text-bad",
  info: "bg-info/12 text-info",
};

/** Small status label. Pair colour with words (and an icon where it helps). */
export function Badge({ tone = "neutral", children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] leading-4 font-semibold whitespace-nowrap", TONE[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

const DOT: Record<Tone, string> = {
  neutral: "bg-ink-4 text-ink-4",
  accent: "bg-accent-500 text-accent-500",
  good: "bg-good text-good",
  warn: "bg-warn text-warn",
  bad: "bg-bad text-bad",
  info: "bg-info text-info",
};

/** Status dot; `pulse` adds a soft live ring (disabled under reduced motion). */
export function Dot({ tone, pulse, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex size-2 shrink-0", className)}>
      {pulse && <span className={cn("absolute inset-0 rounded-full motion-safe:animate-pulse-ring", DOT[tone])} />}
      <span className={cn("relative inline-flex size-2 rounded-full", DOT[tone])} />
    </span>
  );
}

/** Rounded filter/selection chip (toggle with aria-pressed). */
export function Chip({
  children,
  active,
  onClick,
  icon,
  count,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  count?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-[background-color,color,box-shadow,transform] duration-[var(--dur-fast)] active:scale-95",
        active ? "bg-ink text-bg shadow-[0_6px_14px_-8px_var(--color-shadow-2)]" : "bg-surface text-ink-2 ring-1 ring-inset ring-line-strong hover:text-ink hover:ring-ink-4",
        className,
      )}
    >
      {icon}
      {children}
      {count !== undefined && <span className={cn("tabular rounded-full px-1.5 text-[10px] leading-4", active ? "bg-bg/20" : "bg-surface-3")}>{count}</span>}
    </button>
  );
}
