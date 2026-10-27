"use client";

import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";
import { Tooltip } from "./tooltip";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "icon" | "icon-sm";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-accent-400 to-accent-600 text-white shadow-[0_8px_24px_-12px_var(--color-accent-500)] hover:from-accent-300 hover:to-accent-500 hover:shadow-[0_10px_28px_-10px_var(--color-accent-500)]",
  secondary: "bg-white/[0.06] text-ink ring-1 ring-inset ring-line-strong hover:bg-white/[0.11] hover:ring-white/20",
  ghost: "text-ink-2 hover:bg-white/[0.07] hover:text-ink",
  danger: "bg-bad/15 text-bad ring-1 ring-inset ring-bad/30 hover:bg-bad/25 hover:ring-bad/50",
};
const SIZE: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  icon: "size-9 rounded-xl",
  "icon-sm": "size-7 rounded-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Plays a success flash or an error shake when it changes. */
  feedback?: { kind: "success" | "error"; at: number } | null;
  /** Why the button is disabled ("Needs Manager role"): shown as a tooltip. */
  disabledReason?: string | null;
  /** Tooltip for icon-only buttons. */
  tip?: string;
  /** Pulsing ring when this control needs attention. */
  attention?: "critical" | "warning" | null;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, className, children, disabled, type = "button", feedback, disabledReason, tip, attention, ...rest },
  ref,
) {
  const inner = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const el = inner.current;
    if (!el || !feedback) return;
    const cls = feedback.kind === "success" ? "animate-flash" : "animate-shake";
    el.classList.remove("animate-flash", "animate-shake");
    void el.offsetWidth; // restart the animation
    el.classList.add(cls);
    const t = setTimeout(() => el.classList.remove(cls), 1000);
    return () => clearTimeout(t);
  }, [feedback]);

  const isDisabled = disabled || Boolean(disabledReason);
  const button = (
    <button
      ref={(node) => {
        inner.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      type={type}
      disabled={isDisabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-[background-color,box-shadow,color,transform,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)] select-none",
        "enabled:active:scale-[0.97] enabled:active:duration-[var(--dur-instant)] disabled:opacity-45",
        VARIANT[variant],
        SIZE[size],
        attention && "needs-attention",
        attention === "warning" && "[--attention-rgb:251_191_36]",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
      {attention && (
        <span aria-hidden className={cn("absolute -end-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-surface", attention === "critical" ? "bg-bad" : "bg-warn")} />
      )}
    </button>
  );
  const label = isDisabled && disabledReason ? disabledReason : tip;
  return label ? <Tooltip content={label}>{button}</Tooltip> : button;
});
