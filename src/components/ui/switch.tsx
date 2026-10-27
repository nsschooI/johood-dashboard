"use client";

import { cn } from "./cn";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  tone = "accent",
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  tone?: "accent" | "bad";
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full ring-1 ring-inset transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? (tone === "bad" ? "bg-bad/80 ring-bad/40" : "bg-accent-500 ring-accent-400/50") : "bg-white/[0.08] ring-line-strong",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-[18px] rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-[22px] rtl:-translate-x-[22px]" : "translate-x-[3px] rtl:-translate-x-[3px]",
        )}
      />
    </button>
  );
}
