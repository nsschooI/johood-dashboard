"use client";

import { cn } from "./cn";
import { Tooltip } from "./tooltip";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  tone = "accent",
  id,
  disabledReason,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  tone?: "accent" | "bad";
  id?: string;
  /** Disabled with a reason shown as a tooltip ("Needs Manager role"). */
  disabledReason?: string | null;
}) {
  const isDisabled = disabled || Boolean(disabledReason);
  const el = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={isDisabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full ring-1 ring-inset transition-[background-color,box-shadow] duration-[var(--dur-base)] enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? (tone === "bad" ? "bg-bad ring-bad/40" : "bg-accent-500 ring-accent-600/40") : "bg-surface-3 ring-line-strong",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-[18px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-[var(--dur-slow)] ease-[var(--ease-spring)]",
          checked ? "translate-x-[22px] rtl:-translate-x-[22px]" : "translate-x-[3px] rtl:-translate-x-[3px]",
        )}
      />
    </button>
  );
  return disabledReason && isDisabled ? <Tooltip content={disabledReason}>{el}</Tooltip> : el;
}
