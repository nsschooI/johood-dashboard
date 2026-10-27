/**
 * Generated artwork for `mock:` image URLs (mock provider only). Every piece
 * is deterministic from its seed, so the same member always gets the same
 * face. Real mode never produces `mock:` URLs.
 */
import { createElement } from "react";
import {
  Backpack,
  Bird,
  Crown,
  Footprints,
  Gem,
  HardHat,
  Link2,
  Music2,
  Package,
  Shirt,
  Sparkles,
  Ticket,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { GuildKey } from "@/lib/types";

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = <T,>(h: number, list: readonly T[], salt = 0) => list[(Math.imul(h ^ Math.imul(salt + 1, 0x9e3779b9), 2654435761) >>> 0) % list.length];

const BG = [
  ["#7c3aed", "#f472b6"],
  ["#0ea5e9", "#6366f1"],
  ["#10b981", "#0ea5e9"],
  ["#f59e0b", "#ef4444"],
  ["#a855f7", "#6366f1"],
  ["#14b8a6", "#84cc16"],
  ["#ec4899", "#f97316"],
  ["#3b82f6", "#22d3ee"],
] as const;
const SKIN = ["#f6d3b3", "#e8b48f", "#c98d63", "#a8704a", "#7d4f33", "#f2c9a0"] as const;
const HAIR = ["#1f1a24", "#3b2a20", "#5b3a29", "#111827", "#7c2d12", "#e5e7eb"] as const;

/** Discord-style avatar: a friendly character on a gradient. */
export function FaceArt({ seed, className }: { seed: string; className?: string }) {
  const h = hash(seed);
  const [a, b] = pick(h, BG);
  const skin = pick(h, SKIN, 3);
  const hair = pick(h, HAIR, 5);
  const style = h % 5;
  const happy = (h >> 7) % 3 !== 0;
  const id = `f${h.toString(36)}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${id}g)`} />
      <circle cx="50" cy="12" r="14" fill="#fff" opacity=".12" />
      {/* shoulders */}
      <path d="M10 64c2-12 11-18 22-18s20 6 22 18z" fill="#0b0a10" opacity=".55" />
      {/* head */}
      <circle cx="32" cy="30" r="13" fill={skin} />
      {style === 0 && <path d="M18 27c0-9 6-14 14-14s14 5 14 14c-4-4-9-5-14-5s-10 1-14 5z" fill={hair} />}
      {style === 1 && (
        <>
          <path d="M17 26c1-9 7-13 15-13s14 4 15 13H17z" fill={hair} />
          <rect x="14" y="24" width="27" height="4" rx="2" fill={hair} />
        </>
      )}
      {style === 2 && <path d="M18 30c-2-11 5-18 14-18s16 7 14 18c-1-6-4-9-7-10-2 3-7 4-14 3-3 1-6 3-7 7z" fill={hair} />}
      {style === 3 && (
        <>
          <path d="M15 33c0-12 7-19 17-19s17 7 17 19v14H15z" fill={hair} opacity=".95" />
          <circle cx="32" cy="31" r="11" fill={skin} />
        </>
      )}
      {style === 4 && (
        <>
          <path d="M19 25c2-7 7-10 13-10s11 3 13 10" stroke={hair} strokeWidth="5" fill="none" strokeLinecap="round" />
          <rect x="15" y="26" width="6" height="10" rx="3" fill="#0b0a10" opacity=".7" />
          <rect x="43" y="26" width="6" height="10" rx="3" fill="#0b0a10" opacity=".7" />
        </>
      )}
      {/* face */}
      {happy ? (
        <>
          <path d="M26 30q2-2.5 4 0M34 30q2-2.5 4 0" stroke="#1f1a24" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M27 35q5 4 10 0" stroke="#1f1a24" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="28" cy="30" r="1.7" fill="#1f1a24" />
          <circle cx="36" cy="30" r="1.7" fill="#1f1a24" />
          <path d="M29 36h6" stroke="#1f1a24" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
      <circle cx="24.5" cy="33.5" r="1.8" fill="#f472b6" opacity=".35" />
      <circle cx="39.5" cy="33.5" r="1.8" fill="#f472b6" opacity=".35" />
    </svg>
  );
}

const ROBLOX_BG = [
  ["#3b3550", "#24202f"],
  ["#2f3d55", "#1d2433"],
  ["#3d3346", "#231d2a"],
  ["#2c4442", "#1b2828"],
] as const;
const SHIRT = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#111827", "#ec4899", "#14b8a6"] as const;

/** Roblox-style headshot: a blocky head with the classic face. */
export function RobloxHeadArt({ seed, className }: { seed: string; className?: string }) {
  const h = hash(`rbx${seed}`);
  const [a, b] = pick(h, ROBLOX_BG);
  const skin = pick(h, ["#f5cd30", "#f2c49b", "#d29a6e", "#a0663f", "#ffe0bd", "#f5cd30"] as const, 2);
  const shirt = pick(h, SHIRT, 4);
  const hat = h % 6;
  const hair = pick(h, HAIR, 6);
  const id = `r${h.toString(36)}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}g`} cx=".5" cy=".35" r=".8">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </radialGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".25" />
          <stop offset="1" stopColor="#000" stopOpacity=".15" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${id}g)`} />
      {/* torso */}
      <rect x="14" y="48" width="36" height="20" rx="3" fill={shirt} />
      <rect x="26" y="44" width="12" height="6" fill={skin} />
      {/* head */}
      <rect x="17" y="17" width="30" height="29" rx="9" fill={skin} />
      <rect x="17" y="17" width="30" height="29" rx="9" fill={`url(#${id}s)`} />
      {/* classic face */}
      <ellipse cx="27" cy="29" rx="2.2" ry="3.2" fill="#1b1b1b" />
      <ellipse cx="37" cy="29" rx="2.2" ry="3.2" fill="#1b1b1b" />
      <path d="M25 36q7 6 14 0" stroke="#1b1b1b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {hat === 0 && (
        <>
          <rect x="15" y="12" width="34" height="9" rx="4" fill={hair} />
          <rect x="30" y="17" width="22" height="4" rx="2" fill={hair} />
        </>
      )}
      {hat === 1 && <path d="M15 24c0-9 7-14 17-14s17 5 17 14l-4-3-4 3-5-4-4 4-5-4-4 4-4-3z" fill={hair} />}
      {hat === 2 && (
        <>
          <path d="M18 18q14-14 28 0z" fill={shirt} />
          <circle cx="32" cy="8" r="3" fill="#fff" opacity=".85" />
        </>
      )}
      {hat === 3 && (
        <>
          <path d="M16 22c2-9 8-12 16-12s14 3 16 12" stroke="#111" strokeWidth="3" fill="none" />
          <rect x="12" y="22" width="7" height="12" rx="3" fill="#111" />
          <rect x="45" y="22" width="7" height="12" rx="3" fill="#111" />
        </>
      )}
      {hat === 4 && <path d="M14 21h36l-5-9H19z" fill={hair} />}
    </svg>
  );
}

const ITEM_ICONS: [RegExp, LucideIcon][] = [
  [/wings/i, Wind],
  [/pet|falcon|bird/i, Bird],
  [/crown/i, Crown],
  [/pass|vip/i, Ticket],
  [/sneaker|shoe/i, Footprints],
  [/cap|hat/i, HardHat],
  [/chain|necklace/i, Link2],
  [/backpack|bag/i, Backpack],
  [/aura|diamond|gem/i, Gem],
  [/emote|oud|dance/i, Music2],
  [/hoodie|jacket|set|shirt|scarf|cape|camo/i, Shirt],
  [/.*/, Package],
];

export function itemIcon(item: string): LucideIcon {
  return ITEM_ICONS.find(([re]) => re.test(item))![1];
}

/** Catalog item thumbnail: duotone glyph on a lit tile. */
export function ItemArt({ seed, item, className }: { seed: string; item?: string; className?: string }) {
  const h = hash(`item${seed}${item ?? ""}`);
  const [a, b] = pick(h, BG, 1);
  const id = `i${h.toString(36)}`;
  return (
    <span className={className} style={{ position: "relative", display: "block" }} aria-hidden>
      <svg viewBox="0 0 64 64" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <radialGradient id={`${id}g`} cx=".3" cy=".25" r="1">
            <stop offset="0" stopColor={a} stopOpacity=".9" />
            <stop offset="1" stopColor={b} stopOpacity=".55" />
          </radialGradient>
        </defs>
        <rect width="64" height="64" fill="#15121d" />
        <rect width="64" height="64" fill={`url(#${id}g)`} />
        <ellipse cx="32" cy="52" rx="16" ry="3" fill="#000" opacity=".25" />
        <path d="M0 0h64v22C44 14 20 14 0 26z" fill="#fff" opacity=".08" />
      </svg>
      {createElement(itemIcon(item ?? ""), {
        style: { position: "absolute", inset: "22%", width: "56%", height: "56%", color: "#fff", filter: "drop-shadow(0 2px 4px rgb(0 0 0 / .35))" },
        fill: "rgb(255 255 255 / .22)",
        strokeWidth: 1.6,
      })}
    </span>
  );
}

const GUILD_COLORS: Record<GuildKey, [string, string, string]> = {
  main: ["#c58cf9", "#9a52e0", "#f08bd0"],
  catalog: ["#38bdf8", "#6366f1", "#14b8a6"],
};

/** Server icon artwork (mock). */
export function GuildIconArt({ guild, className }: { guild: GuildKey; className?: string }) {
  const [a, b, c] = GUILD_COLORS[guild];
  const id = `g${guild}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset=".55" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${id}a)`} />
      <circle cx="50" cy="10" r="18" fill="#fff" opacity=".14" />
      {guild === "main" ? (
        <>
          <path d="M37 15v22.5c0 6.4-4 10.5-10.2 10.5-3.3 0-6.1-1.1-8.3-3.3l3.4-4.3c1.4 1.4 3 2.2 4.7 2.2 2.6 0 4-1.6 4-4.9V15z" fill="#fff" />
          <path d="M46 20a8 8 0 1 1-7 12 6.5 6.5 0 1 0 7-12z" fill="#fff" opacity=".9" />
        </>
      ) : (
        <>
          <path d="M18 24h28l-2.5 24a3 3 0 0 1-3 2.7H23.5a3 3 0 0 1-3-2.7z" fill="#fff" />
          <path d="M25 24v-3a7 7 0 0 1 14 0v3" stroke="#fff" strokeWidth="3.5" fill="none" />
          <path d="M34 30v10.5c0 3-1.9 4.9-4.8 4.9-1.5 0-2.8-.5-3.8-1.5l1.6-2c.6.6 1.4 1 2.2 1 1.2 0 1.9-.8 1.9-2.3V30z" fill={b} />
        </>
      )}
    </svg>
  );
}

/** Server banner artwork (mock): aurora blobs over a geometric pattern. */
export function GuildBannerArt({ guild, className }: { guild: GuildKey; className?: string }) {
  const [a, b, c] = GUILD_COLORS[guild];
  const id = `b${guild}`;
  return (
    <svg viewBox="0 0 400 140" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <pattern id={`${id}p`} width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 11h22M11 0v22" stroke="#fff" strokeOpacity=".06" strokeWidth="1" />
          <rect x="8" y="8" width="6" height="6" fill="#fff" fillOpacity=".05" />
        </pattern>
        <filter id={`${id}f`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>
      <rect width="400" height="140" fill="#110e18" />
      <g filter={`url(#${id}f)`}>
        <ellipse cx="80" cy="30" rx="120" ry="60" fill={a} opacity=".75" />
        <ellipse cx="260" cy="110" rx="140" ry="55" fill={b} opacity=".7" />
        <ellipse cx="360" cy="20" rx="90" ry="45" fill={c} opacity=".6" />
      </g>
      <rect width="400" height="140" fill={`url(#${id}p)`} />
    </svg>
  );
}
