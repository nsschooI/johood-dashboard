"use client";

import { useEffect, useRef, useState } from "react";
import { MOTION, easeOut, prefersReducedMotion } from "@/lib/motion";

/**
 * Animated number: counts from the previous value to the new one whenever it
 * changes (live updates). The first render shows the real value — no flash
 * of 0 before hydration.
 */
export function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (prefersReducedMotion() || start === value) {
      setShown(value);
      return;
    }
    const t0 = performance.now();
    const dur = Math.abs(value - start) < 3 ? MOTION.base : MOTION.count;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setShown(start + (value - start) * easeOut(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const rounded = Number.isInteger(value) ? Math.round(shown) : Math.round(shown * 100) / 100;
  return (
    <span className={className} aria-label={format(value)}>
      <span aria-hidden>{format(rounded)}</span>
    </span>
  );
}
