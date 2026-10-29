"use client";

import { Icon, type IconName } from "@/components/icons/icon";
import { Img } from "@/components/ui/img";
import { cn } from "@/components/ui/cn";
import type { BotName } from "@/lib/types";

/**
 * Each bot is a little robot from Hoodie's family: its own head colour and
 * a role badge. Used until (or instead of) the bot's Discord avatar.
 */
export const BOT_STYLE: Record<BotName, { icon: IconName; head: string; deep: string }> = {
  ops: { icon: "shield", head: "#e11d48", deep: "#9f1239" },
  tickets: { icon: "tickets", head: "#f59e0b", deep: "#b45309" },
  welcome: { icon: "party", head: "#fb7185", deep: "#be123c" },
  system: { icon: "cpu", head: "#57534e", deep: "#292524" },
  tempvoice: { icon: "mic", head: "#0ea5e9", deep: "#0369a1" },
  network: { icon: "globe", head: "#14b8a6", deep: "#0f766e" },
  "assistant-1": { icon: "headphones", head: "#e11d48", deep: "#881337" },
  "assistant-2": { icon: "headphones", head: "#d97706", deep: "#92400e" },
  "assistant-3": { icon: "headphones", head: "#7c3aed", deep: "#4c1d95" },
};

function RobotFace({ head, deep }: { head: string; deep: string }) {
  return (
    <svg viewBox="0 0 48 48" className="absolute inset-0 size-full" aria-hidden>
      <rect width="48" height="48" fill={head} />
      <path d="M0 0h48v20C34 26 14 26 0 20z" fill="#fff" opacity="0.14" />
      <path d="M24 9v-4" stroke={deep} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="24" cy="4.5" r="2.6" fill="#fbbf24" />
      <rect x="9" y="13" width="30" height="24" rx="9" fill="#fffaf5" />
      <ellipse cx="18.5" cy="23.5" rx="2.6" ry="3.4" fill="#2b1f24" />
      <ellipse cx="29.5" cy="23.5" rx="2.6" ry="3.4" fill="#2b1f24" />
      <path d="M20.5 30q3.5 3 7 0" stroke="#2b1f24" strokeWidth="2" strokeLinecap="round" fill="none" />
      <rect x="0" y="41" width="48" height="7" fill={deep} opacity="0.55" />
    </svg>
  );
}

export function BotTile({ name, avatarUrl, size = 40, className, badge = true }: { name: BotName; avatarUrl?: string | null; size?: number; className?: string; badge?: boolean }) {
  const style = BOT_STYLE[name] ?? { icon: "bots" as IconName, head: "#57534e", deep: "#292524" };
  const b = Math.max(16, Math.round(size * 0.42));
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <Img src={avatarUrl} sizes={`${size}px`} className="size-full rounded-[30%] shadow-[0_6px_14px_-8px_var(--color-shadow-2)] ring-1 ring-line" fallback={<RobotFace head={style.head} deep={style.deep} />} />
      {badge && (
        <span
          aria-hidden
          className="absolute -end-1 -bottom-1 grid place-items-center rounded-full bg-surface text-ink-2 shadow-[0_1px_3px_var(--color-shadow-1)] ring-1 ring-line"
          style={{ width: b, height: b }}
        >
          <Icon name={style.icon} size={Math.max(12, b - 6)} />
        </span>
      )}
    </span>
  );
}
