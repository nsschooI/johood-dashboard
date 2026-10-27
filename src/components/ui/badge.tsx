import type { ReactNode } from "react";
import { cn } from "./cn";

export type Tone = "neutral" | "accent" | "good" | "warn" | "bad" | "info";

const TONE: Record<Tone, string> = {
  neutral: "bg-white/[0.06] text-ink-2 ring-white/10",
  accent: "bg-accent-500/15 text-accent-200 ring-accent-400/25",
  good: "bg-good/12 text-good ring-good/25",
  warn: "bg-warn/12 text-warn ring-warn/25",
  bad: "bg-bad/12 text-bad ring-bad/25",
  info: "bg-info/12 text-info ring-info/25",
};

export function Badge({ tone = "neutral", children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset", TONE[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

const DOT: Record<Tone, string> = {
  neutral: "bg-ink-3 text-ink-3",
  accent: "bg-accent-400 text-accent-400",
  good: "bg-good text-good",
  warn: "bg-warn text-warn",
  bad: "bg-bad text-bad",
  info: "bg-info text-info",
};

/** Status dot; `pulse` adds a soft live ring (disabled under reduced motion). */
export function Dot({ tone, pulse }: { tone: Tone; pulse?: boolean }) {
  return (
    <span aria-hidden className="relative inline-flex size-2">
      {pulse && <span className={cn("absolute inset-0 rounded-full motion-safe:animate-pulse-ring", DOT[tone])} />}
      <span className={cn("relative inline-flex size-2 rounded-full", DOT[tone])} />
    </span>
  );
}
