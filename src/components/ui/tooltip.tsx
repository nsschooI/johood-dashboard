"use client";

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Lightweight tooltip: shows on hover and keyboard focus, wired with
 * aria-describedby. Wrap exactly one element. Works on disabled buttons
 * (the wrapper catches the hover) so "why can't I?" reasons are reachable.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: ReactNode;
  children: ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom";
  className?: string;
}) {
  const id = useId();
  if (!content) return children;
  const child = isValidElement(children) ? cloneElement(children, { "aria-describedby": id }) : children;
  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      {child}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute start-1/2 z-50 w-max max-w-64 -translate-x-1/2 rounded-lg bg-[#211c2c] px-2.5 py-1.5 text-xs leading-snug font-medium text-ink opacity-0 shadow-xl ring-1 ring-line-strong transition duration-[var(--dur-fast)] rtl:translate-x-1/2",
          "group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 group-hover/tip:delay-300",
          side === "top" ? "bottom-full mb-2 translate-y-1 group-hover/tip:translate-y-0" : "top-full mt-2 -translate-y-1 group-hover/tip:translate-y-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
