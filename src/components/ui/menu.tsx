"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons/icon";
import { cn } from "./cn";

export interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  hint?: ReactNode;
  onSelect?: () => void;
  /** Disabled with a reason shown in place ("Needs Manager role"). */
  disabledReason?: string | null;
  danger?: boolean;
  /** Pulses when the item needs attention. */
  attention?: "critical" | "warning" | null;
  /** Radio-style item (e.g. the selected server). */
  checked?: boolean;
}

export type MenuSection = { title?: string; items: MenuItem[] };

interface Anchor {
  x: number;
  y: number;
  /** Trigger height, to open below it. */
  h: number;
  /** Align the menu's end edge to x (for buttons at the inline end). */
  alignEnd?: boolean;
}

/**
 * Accessible menu rendered in a portal: arrow keys, Home/End, Esc, click
 * outside. Opened from a button or at the pointer (right-click).
 */
export function MenuPopover({
  anchor,
  onClose,
  sections,
  label,
  width = 248,
}: {
  anchor: Anchor | null;
  onClose: () => void;
  sections: MenuSection[];
  label: string;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchor.alignEnd ? anchor.x - width : anchor.x;
    left = Math.max(8, Math.min(left, vw - width - 8));
    let top = anchor.y + anchor.h + 6;
    if (top + rect.height > vh - 8) top = Math.max(8, anchor.y - rect.height - 6);
    setPos({ left, top });
  }, [anchor, width]);

  const focusItem = useCallback((dir: 1 | -1 | "first" | "last") => {
    const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? [])];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = dir === "first" ? 0 : dir === "last" ? items.length - 1 : (i + dir + items.length) % items.length;
    items[next].focus();
  }, []);

  useEffect(() => {
    if (!anchor) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    requestAnimationFrame(() => focusItem("first"));
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
    };
  }, [anchor, onClose, focusItem]);

  if (!anchor || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, width }}
      className="glass fixed z-[70] max-h-[70vh] overflow-y-auto rounded-2xl p-1.5 shadow-[var(--shadow-pop)] animate-pop"
      onKeyDown={(e) => {
        const move = { ArrowDown: 1, ArrowUp: -1, Home: "first", End: "last" } as const;
        if (e.key in move) {
          e.preventDefault();
          focusItem(move[e.key as keyof typeof move]);
        } else if (e.key === "Tab") onClose();
      }}
    >
      {sections.map((sec, si) => (
        <div key={si} role="group" aria-label={sec.title} className={cn(si > 0 && "mt-1 border-t border-line pt-1")}>
          {sec.title && <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold text-ink-3">{sec.title}</p>}
          {sec.items.map((it) => {
            const disabled = Boolean(it.disabledReason);
            return (
              <div
                key={it.key}
                role={it.checked === undefined ? "menuitem" : "menuitemradio"}
                aria-checked={it.checked}
                tabIndex={-1}
                aria-disabled={disabled || undefined}
                onClick={() => {
                  if (disabled) return;
                  onClose();
                  it.onSelect?.();
                }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !disabled) {
                    e.preventDefault();
                    onClose();
                    it.onSelect?.();
                  }
                }}
                className={cn(
                  "group flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-sm outline-none transition-colors duration-[var(--dur-fast)]",
                  disabled ? "text-ink-3" : it.danger ? "text-bad hover:bg-bad/10 focus:bg-bad/10" : "text-ink hover:bg-surface-2 focus:bg-surface-2",
                )}
              >
                {it.icon && <span className={cn("mt-0.5 shrink-0 [&>svg]:size-[18px]", disabled ? "opacity-50" : it.danger ? "" : "text-ink-2")}>{it.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cn("truncate", disabled && "opacity-70")}>{it.label}</span>
                    {it.attention && <span aria-hidden className={cn("size-2 rounded-full", it.attention === "critical" ? "bg-bad" : "bg-warn", "motion-safe:animate-pulse")} />}
                  </span>
                  {disabled ? (
                    <span className="mt-0.5 block text-[11px] text-ink-3">{it.disabledReason}</span>
                  ) : (
                    it.hint && <span className="mt-0.5 block text-[11px] text-ink-3">{it.hint}</span>
                  )}
                </span>
                {it.checked && <Icon name="check" size={16} className="mt-0.5 text-accent-400" />}
              </div>
            );
          })}
        </div>
      ))}
    </div>,
    document.body,
  );
}

/** State helper: open from a button (below it) or at the pointer (context menu). */
export function useMenu() {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const close = useCallback(() => setAnchor(null), []);
  const openFromButton = useCallback((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const rtl = getComputedStyle(el).direction === "rtl";
    setAnchor(rtl ? { x: r.left, y: r.top, h: r.height } : { x: r.right, y: r.top, h: r.height, alignEnd: true });
  }, []);
  const openAt = useCallback((x: number, y: number) => setAnchor({ x, y, h: 0 }), []);
  return { anchor, open: anchor !== null, close, openFromButton, openAt };
}
