"use client";

import { Bot, Cpu, Headphones, LifeBuoy, Mic2, Network, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { Img } from "@/components/ui/img";
import { cn } from "@/components/ui/cn";
import type { BotName } from "@/lib/types";

/** One distinct colour + glyph per bot, used until the bot's Discord avatar arrives. */
export const BOT_STYLE: Record<BotName, { icon: LucideIcon; from: string; to: string }> = {
  ops: { icon: ShieldCheck, from: "#a855f7", to: "#6366f1" },
  tickets: { icon: LifeBuoy, from: "#10b981", to: "#0e7490" },
  welcome: { icon: Sparkles, from: "#f472b6", to: "#f59e0b" },
  system: { icon: Cpu, from: "#64748b", to: "#334155" },
  tempvoice: { icon: Mic2, from: "#22d3ee", to: "#2563eb" },
  network: { icon: Network, from: "#f97316", to: "#dc2626" },
  "assistant-1": { icon: Headphones, from: "#c084fc", to: "#7c3aed" },
  "assistant-2": { icon: Headphones, from: "#60a5fa", to: "#4338ca" },
  "assistant-3": { icon: Headphones, from: "#2dd4bf", to: "#047857" },
};

export function BotTile({ name, avatarUrl, size = 40, className }: { name: BotName; avatarUrl?: string | null; size?: number; className?: string }) {
  const style = BOT_STYLE[name] ?? { icon: Bot, from: "#64748b", to: "#334155" };
  const Icon = style.icon;
  const glyph = (
    <span className="absolute inset-0 grid place-items-center" style={{ background: `linear-gradient(135deg, ${style.from}, ${style.to})` }}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-white/15" style={{ clipPath: "ellipse(80% 60% at 50% 0%)" }} />
      <Icon aria-hidden className="relative text-white drop-shadow" style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={1.9} />
    </span>
  );
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <Img src={avatarUrl} sizes={`${size}px`} className="size-full rounded-[30%] shadow-lg ring-1 ring-white/15" fallback={glyph} />
    </span>
  );
}
