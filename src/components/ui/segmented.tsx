"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "./cn";

/** Segmented control (radio group) with a springy sliding pill. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
  size?: "sm" | "md";
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!el || !wrap.current) return;
    const measure = () => setPill({ x: el.offsetLeft, w: el.offsetWidth });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [value, options.length]);

  const move = (dir: 1 | -1) => {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length];
    onChange(next.value);
    requestAnimationFrame(() => wrap.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
  };

  return (
    <div
      ref={wrap}
      role="radiogroup"
      aria-label={label}
      className="relative inline-flex rounded-xl bg-white/[0.04] p-0.5 ring-1 ring-inset ring-line"
      onKeyDown={(e) => {
        const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        move((e.key === "ArrowRight") !== rtl ? 1 : -1);
      }}
    >
      {pill && (
        <span
          aria-hidden
          className="absolute top-0.5 bottom-0.5 left-0 rounded-[10px] bg-white/[0.11] shadow-sm ring-1 ring-white/10 transition-[transform,width] duration-[var(--dur-slow)] ease-[var(--ease-spring)]"
          style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-[1] inline-flex items-center gap-1.5 rounded-[10px] font-medium transition-colors duration-[var(--dur-fast)]",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs",
              active ? "text-ink" : "text-ink-3 hover:text-ink-2",
              !pill && active && "bg-white/[0.1]",
            )}
          >
            {o.label}
            {o.count !== undefined && o.count > 0 && (
              <span className={cn("tabular rounded-full px-1.5 text-[10px] leading-4", active ? "bg-accent-500/30 text-accent-200" : "bg-white/[0.08] text-ink-2")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
