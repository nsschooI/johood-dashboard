import { useId } from "react";
import type { Rank } from "@/lib/types";

const RANK_COLORS: Record<Rank, [string, string]> = {
  newcomer: ["#a1a1aa", "#52525b"],
  bronze: ["#f0a868", "#9a4d1c"],
  silver: ["#f1f5f9", "#7c8798"],
  gold: ["#fde68a", "#d48806"],
  diamond: ["#a5f3fc", "#2563eb"],
  legend: ["#f5b6ff", "#8b2fd6"],
};

export const RANK_TEXT: Record<Rank, string> = {
  newcomer: "text-zinc-600 dark:text-zinc-300",
  bronze: "text-orange-800 dark:text-orange-300",
  silver: "text-slate-600 dark:text-slate-200",
  gold: "text-amber-800 dark:text-amber-200",
  diamond: "text-cyan-800 dark:text-cyan-200",
  legend: "text-fuchsia-800 dark:text-fuchsia-200",
};

/** Rank badge artwork: a shield that gains detail as the rank rises. */
export function RankIcon({ rank, size = 20, className }: { rank: Rank; size?: number; className?: string }) {
  const [a, b] = RANK_COLORS[rank];
  const id = `rk-${rank}${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        {rank === "legend" && (
          <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#f0abfc" stopOpacity=".7" />
            <stop offset="1" stopColor="#f0abfc" stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      {rank === "legend" && <circle cx="16" cy="16" r="16" fill={`url(#${id}-glow)`} />}
      {rank === "diamond" ? (
        <>
          <path d="M8 11l4-5h8l4 5-8 15z" fill={`url(#${id}-f)`} />
          <path d="M8 11h16M12 6l4 5 4-5M16 11v15" stroke="#fff" strokeOpacity=".55" strokeWidth=".9" fill="none" />
        </>
      ) : rank === "newcomer" ? (
        <>
          <circle cx="16" cy="16" r="10" fill={`url(#${id}-f)`} />
          <path d="M16 22v-6m0 0c0-3 2-5 5-5 0 3-2 5-5 5zm0 0c0-2.4-1.6-4-4-4 0 2.4 1.6 4 4 4z" stroke="#18181b" strokeWidth="1.4" fill="#fff" fillOpacity=".7" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d="M16 3l10 4v8c0 7-4.4 11.3-10 14-5.6-2.7-10-7-10-14V7z" fill={`url(#${id}-f)`} />
          <path d="M16 3l10 4v8c0 7-4.4 11.3-10 14" fill="#000" opacity=".12" />
          <path d="M16 6l7.5 3v6c0 5.3-3.2 8.6-7.5 10.8" stroke="#fff" strokeOpacity=".35" strokeWidth=".9" fill="none" />
          {rank === "bronze" && <circle cx="16" cy="15" r="3.4" fill="#fff" fillOpacity=".75" />}
          {rank === "silver" && <path d="M16 10.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#fff" fillOpacity=".9" />}
          {(rank === "gold" || rank === "legend") && (
            <path d="M10.5 18.5l1.2-7 2.8 3 1.5-4.2 1.5 4.2 2.8-3 1.2 7z" fill="#fff" fillOpacity=".92" stroke="#000" strokeOpacity=".15" strokeWidth=".6" />
          )}
        </>
      )}
      {rank === "legend" && <path d="M25 5l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="#fff" />}
    </svg>
  );
}
