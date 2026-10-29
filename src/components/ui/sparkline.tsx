"use client";

import { useId } from "react";
import { cn } from "./cn";

/** Tiny trend line (no axes). `values` oldest → newest. */
export function Sparkline({ values, max, color = "var(--color-accent-400)", className, label }: { values: number[]; max?: number; color?: string; className?: string; label: string }) {
  const id = useId().replace(/:/g, "");
  const w = 100;
  const h = 28;
  if (values.length < 2)
    return (
      <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={cn("h-7 w-full", className)} role="img" aria-label={label}>
        <path d="M0 22H100" stroke="var(--color-line-strong)" strokeWidth="1.5" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  const top = max ?? Math.max(...values) * 1.15;
  const min = max !== undefined ? 0 : Math.min(...values) * 0.85;
  const span = Math.max(1e-6, top - min);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - min) / span) * (h - 3) - 1.5] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-7 w-full overflow-visible", className)} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${w},${h}L0,${h}Z`} fill={`url(#${id}f)`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
