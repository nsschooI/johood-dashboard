import { useId } from "react";
import { cn } from "@/components/ui/cn";

/** JoHood mark: a red gift tile with a gold bow and the J. */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  // Unique per instance: a hidden copy (desktop sidebar) must not own the gradient.
  const id = `jh-mark${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fb4d6d" />
          <stop offset="1" stopColor="#d01843" />
        </linearGradient>
      </defs>
      <rect x="2" y="5" width="36" height="33" rx="11" fill={`url(#${id})`} />
      <path d="M8 10.5c2-2 5-3 7-3" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M23.5 13v12.2a5.6 5.6 0 0 1-11.2.4" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" fill="none" />
      <path d="M28 6.5c-4-5.5-9-3-6 0 1.6 1.4 4 .8 6 0zM28 6.5c4-5.5 9-3 6 0-1.6 1.4-4 .8-6 0z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
      <circle cx="28" cy="6.5" r="1.8" fill="#d97706" />
    </svg>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="leading-none">
          <span className="font-display block text-[19px] font-bold text-ink">JoHood</span>
        </span>
      )}
    </span>
  );
}
