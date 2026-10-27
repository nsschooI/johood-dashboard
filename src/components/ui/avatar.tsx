import Image from "next/image";
import { cn } from "./cn";

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

export function Avatar({ name, src, size = 32, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = [...name.replace(/[^\p{L}\p{N} ]/gu, "").trim()].slice(0, 2).join("").toUpperCase() || "?";
  if (src) {
    return <Image src={src} alt="" width={size} height={size} className={cn("shrink-0 rounded-full ring-1 ring-line", className)} />;
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      className={cn("grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white/95 ring-1 ring-white/10", GRADIENTS[hash(name) % GRADIENTS.length], className)}
    >
      {initials}
    </span>
  );
}
