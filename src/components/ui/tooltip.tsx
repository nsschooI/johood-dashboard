"use client";

import { cloneElement, isValidElement, useId, useRef, type ReactElement, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Lightweight tooltip: shows on hover and keyboard focus, wired with
 * aria-describedby. Wrap exactly one element. Works on disabled buttons
 * (the wrapper catches the hover) so "why can't I?" reasons are reachable.
 * Nudges itself back inside the viewport near screen edges.
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
  const tip = useRef<HTMLSpanElement>(null);
  if (!content) return children;
  const child = isValidElement(children) ? cloneElement(children, { "aria-describedby": id }) : children;

  const fit = () => {
    const el = tip.current;
    if (!el) return;
    el.style.setProperty("--tip-nudge", "0px");
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const nudge = r.left < 8 ? 8 - r.left : r.right > vw - 8 ? vw - 8 - r.right : 0;
    el.style.setProperty("--tip-nudge", `${nudge}px`);
  };

  return (
    <span className={cn("group/tip relative inline-flex", className)} onPointerEnter={fit} onFocus={fit}>
      {child}
      <span
        ref={tip}
        id={id}
        role="tooltip"
        style={{ translate: "calc(-50% + var(--tip-nudge, 0px)) 0" }}
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-64 rounded-lg bg-charcoal px-2.5 py-1.5 text-xs leading-snug font-medium text-[#fbf2ee] opacity-0 shadow-[var(--shadow-pop)] dark:bg-[#3a3135] dark:ring-1 dark:ring-white/10 transition-[opacity,transform] duration-[var(--dur-fast)]",
          "group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 group-hover/tip:delay-300",
          side === "top" ? "bottom-full mb-2 translate-y-1 group-hover/tip:translate-y-0" : "top-full mt-2 -translate-y-1 group-hover/tip:translate-y-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
