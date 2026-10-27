import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "icon";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-accent-400 to-accent-600 text-white shadow-[0_8px_24px_-12px_rgb(176_110_242/0.8)] hover:from-accent-300 hover:to-accent-500 disabled:from-accent-700 disabled:to-accent-700",
  secondary: "bg-white/[0.06] text-ink ring-1 ring-inset ring-line-strong hover:bg-white/[0.1]",
  ghost: "text-ink-2 hover:bg-white/[0.06] hover:text-ink",
  danger: "bg-bad/15 text-bad ring-1 ring-inset ring-bad/30 hover:bg-bad/25",
};
const SIZE: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  icon: "size-9 rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition duration-150 select-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
});
