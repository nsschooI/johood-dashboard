"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/components/providers/app-provider";
import { cn } from "@/components/ui/cn";
import { splitDuration, useNow } from "@/lib/giveaways/client";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Ticking d/h/m/s countdown with flip digits. The visible digits are hidden
 * from screen readers; a polite live region announces the time left once a
 * minute instead (`live`, used on the detail page only).
 */
export function Countdown({
  endsAt,
  serverNow,
  size = "hero",
  live,
  onEnd,
}: {
  endsAt: string;
  serverNow: number;
  size?: "hero" | "card";
  live?: boolean;
  onEnd?: () => void;
}) {
  const t = useT();
  const now = useNow(serverNow);
  const left = Date.parse(endsAt) - now;
  const { d, h, m, s } = splitDuration(left);
  const done = left <= 0;

  const fired = useRef(false);
  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true;
      onEnd?.();
    }
  }, [done, onEnd]);

  const spoken = done ? t("gw.endingNow") : t("gw.timeLeft", { d, h, m });
  const units = [
    { v: d, label: t("gw.units.days") },
    { v: h, label: t("gw.units.hours") },
    { v: m, label: t("gw.units.minutes") },
    { v: s, label: t("gw.units.seconds") },
  ];

  return (
    <div className={cn(done && "opacity-70")}>
      {live ? (
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {spoken}
        </span>
      ) : (
        <span className="sr-only">{spoken}</span>
      )}
      {/* Digits read left-to-right in both languages, like a clock. */}
      <div aria-hidden dir="ltr" className={cn("inline-flex items-start", size === "hero" ? "gap-2 sm:gap-3" : "gap-1.5")}>
        {units.map((u, i) => (
          <div key={i} className="flex flex-col items-center">
            <span
              className={cn(
                "tabular relative grid place-items-center overflow-hidden font-bold [perspective:300px]",
                size === "hero"
                  ? "h-16 w-14 rounded-2xl bg-[var(--gw-tile)] text-3xl text-white shadow-[0_10px_24px_-14px_rgb(0_0_0/0.7)] sm:h-20 sm:w-[4.5rem] sm:text-4xl"
                  : "h-9 w-9 rounded-xl bg-accent-500/10 text-base text-accent-300 ring-1 ring-accent-500/15 ring-inset",
              )}
            >
              {size === "hero" && <span className="absolute inset-x-0 top-1/2 h-px bg-white/10" />}
              <span key={u.v} className="gw-flip">
                {pad(u.v)}
              </span>
            </span>
            <span className={cn("mt-1 font-medium text-ink-3", size === "hero" ? "text-xs" : "text-[10px]")}>
              {u.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
