"use client";

import { cn } from "./cn";
import { Img } from "./img";

const GRADIENTS = [
  "from-accent-400 to-blush",
  "from-sky-400 to-accent-500",
  "from-emerald-400 to-teal-600",
  "from-amber-300 to-rose-400",
  "from-fuchsia-400 to-indigo-500",
  "from-rose-400 to-accent-600",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Initials({ name, size }: { name: string; size: number }) {
  const initials = [...name.replace(/[^\p{L}\p{N} ]/gu, "").trim()].slice(0, 2).join("").toUpperCase() || "?";
  return (
    <span
      aria-hidden
      style={{ fontSize: Math.max(9, size * 0.36) }}
      className={cn("absolute inset-0 grid place-items-center bg-gradient-to-br font-semibold text-white", GRADIENTS[hash(name) % GRADIENTS.length])}
    >
      {initials}
    </span>
  );
}

/**
 * Person picture: Discord avatar (any CDN URL or mock art) with a
 * gradient-initials fallback. `ring` draws a role-coloured ring, `status`
 * an online dot.
 */
export function Avatar({
  name,
  src,
  size = 32,
  className,
  ring,
  status,
  square,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  ring?: string | null;
  status?: "online" | "idle" | "offline";
  square?: boolean;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <Img
        src={src}
        sizes={`${size}px`}
        className={cn("size-full ring-1 ring-line", square ? "rounded-[28%]" : "rounded-full")}
        fallback={<Initials name={name} size={size} />}
      />
      {ring && <span aria-hidden className={cn("pointer-events-none absolute -inset-[3px] border-2", square ? "rounded-[32%]" : "rounded-full")} style={{ borderColor: ring }} />}
      {status && (
        <span
          aria-hidden
          className={cn(
            "absolute end-0 bottom-0 size-[30%] max-h-3 max-w-3 min-h-2 min-w-2 rounded-full ring-2 ring-bg",
            status === "online" ? "bg-good" : status === "idle" ? "bg-warn" : "bg-ink-3",
          )}
        />
      )}
    </span>
  );
}
