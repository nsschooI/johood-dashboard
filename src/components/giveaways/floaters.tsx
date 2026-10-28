"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/components/ui/cn";
import { GiftBox, Parachute } from "./art";

const ITEMS: { kind: "gift" | "chute"; tone?: "red" | "cream" | "gold"; style: React.CSSProperties; depth: number; bob: string; wide?: boolean }[] = [
  { kind: "chute", style: { insetInlineStart: "4%", top: "14%", width: 64, opacity: 0.55 }, depth: 0.25, bob: "8s", wide: true },
  { kind: "gift", tone: "red", style: { insetInlineEnd: "6%", top: "26%", width: 54, opacity: 0.45 }, depth: 0.12, bob: "6.5s" },
  { kind: "gift", tone: "gold", style: { insetInlineStart: "9%", top: "62%", width: 40, opacity: 0.4 }, depth: 0.35, bob: "7.5s" },
  { kind: "chute", style: { insetInlineEnd: "12%", top: "72%", width: 52, opacity: 0.4 }, depth: 0.2, bob: "9s", wide: true },
  { kind: "gift", tone: "cream", style: { insetInlineStart: "46%", top: "88%", width: 46, opacity: 0.35 }, depth: 0.3, bob: "7s" },
];

/**
 * Decorative gifts and parachutes drifting behind the content, with a light
 * parallax on scroll. Static when the visitor prefers reduced motion.
 */
export function Floaters() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ref.current?.style.setProperty("--gw-scroll", String(Math.round(window.scrollY))));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={ref} aria-hidden className="gw-floaters">
      {ITEMS.map((it, i) => (
        <div key={i} className={cn("gw-float max-sm:scale-75", it.wide && "max-sm:hidden")} style={{ ...it.style, ["--depth" as string]: it.depth, ["--bob" as string]: it.bob }}>
          {it.kind === "gift" ? <GiftBox tone={it.tone} className="w-full" /> : <Parachute className="w-full" />}
        </div>
      ))}
    </div>
  );
}
