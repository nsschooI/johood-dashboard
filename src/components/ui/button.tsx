"use client";

import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./cn";
import { Spinner } from "./spinner";
import { Tooltip } from "./tooltip";

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const VARIANT: Record<Variant, string> = {
  /** The one main action of a view: brand red. */
  primary:
    "bg-[linear-gradient(180deg,#ec2a55,#d01843)] text-white shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_8px_20px_-10px_rgb(225_29_72/0.9)] enabled:hover:brightness-[1.06] aria-[disabled=true]:!bg-none aria-[disabled=true]:!bg-surface-3 aria-[disabled=true]:!text-ink-3 aria-[disabled=true]:shadow-none",
  /** Everyday actions: a quiet surface button. */
  secondary: "bg-surface text-ink shadow-[0_1px_2px_var(--color-shadow-1)] ring-1 ring-inset ring-line-strong enabled:hover:bg-surface-2 enabled:hover:ring-ink-4",
  /** Tinted with the brand: secondary actions that still belong to the brand. */
  soft: "bg-accent-500/10 text-accent-300 ring-1 ring-inset ring-accent-500/20 enabled:hover:bg-accent-500/16",
  ghost: "text-ink-2 enabled:hover:bg-surface-3/70 enabled:hover:text-ink",
  /** Destructive, always behind a confirm step. */
  danger: "bg-bad text-white shadow-[0_8px_20px_-12px_var(--color-bad)] enabled:hover:brightness-110 dark:text-[#2a0a12]",
};
const SIZE: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2.5 rounded-2xl px-6 text-base",
  icon: "size-10 rounded-xl",
  "icon-sm": "size-8 rounded-lg",
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

  // A reasoned disable stays focusable/hoverable (aria-disabled) so the "why" tooltip is reachable.
  const reasoned = Boolean(disabledReason) && !disabled;
  const isDisabled = disabled || Boolean(disabledReason);
  const { onClick, ...restProps } = rest;
  const button = (
    <button
      ref={(node) => {
        inner.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      type={type}
      disabled={(isDisabled && !reasoned) || loading}
      aria-disabled={reasoned || undefined}
      aria-busy={loading || undefined}
      onClick={reasoned ? (e) => e.preventDefault() : onClick}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-[background-color,box-shadow,color,transform,filter,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)] select-none",
        "enabled:active:scale-[0.96] enabled:active:duration-[var(--dur-instant)] disabled:opacity-50 aria-disabled:opacity-60 aria-disabled:active:scale-100",
        VARIANT[variant],
        SIZE[size],
        attention && "needs-attention",
        attention === "warning" && "[--attention-rgb:217_119_6]",
        className,
      )}
      {...restProps}
    >
      {loading && <Spinner size={size === "sm" || size === "icon-sm" ? 14 : 16} />}
      {children}
      {attention && (
        <span aria-hidden className={cn("absolute -end-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-surface", attention === "critical" ? "bg-bad" : "bg-warn")} />
      )}
    </button>
  );
  const label = isDisabled && disabledReason ? disabledReason : tip;
  return label ? <Tooltip content={label}>{button}</Tooltip> : button;
});
