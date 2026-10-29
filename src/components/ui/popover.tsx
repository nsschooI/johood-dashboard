"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons/icon";
import { cn } from "./cn";

/**
 * A small "i" button that opens a card on click or Enter (not hover, so it
 * works on phones). Esc or a click outside closes it. It stays in the DOM
 * next to its button, so it also works inside dialogs, and opens upwards
 * near the bottom of the screen.
 */
export function InfoPopover({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState<null | "down" | "up">(null);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Close the popover, not the dialog around it.
        e.stopPropagation();
        e.preventDefault();
        setOpen(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const toggle = () => {
    if (open) return setOpen(null);
    const r = ref.current?.getBoundingClientRect();
    setOpen(r && r.bottom + 240 > window.innerHeight ? "up" : "down");
  };

  return (
    <span ref={ref} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={Boolean(open)}
        aria-controls={open ? id : undefined}
        onClick={toggle}
        className="grid size-7 place-items-center rounded-full text-ink-3 transition hover:bg-surface-3 hover:text-ink active:scale-95"
      >
        <Icon name="info" size={16} duo={Boolean(open)} />
      </button>
      {open && (
        <span
          id={id}
          role="dialog"
          aria-label={label}
          className={cn(
            "absolute end-0 z-50 block w-[min(18rem,calc(100vw-3rem))] rounded-xl bg-surface p-3 text-start text-xs leading-relaxed text-ink-2 shadow-[var(--shadow-pop)] ring-1 ring-line animate-pop",
            open === "down" ? "top-full mt-1.5" : "bottom-full mb-1.5",
          )}
        >
          {children}
        </span>
      )}
    </span>
  );
}
