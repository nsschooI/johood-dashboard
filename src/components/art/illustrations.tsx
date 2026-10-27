/**
 * Hand-built SVG illustration set for empty states, errors, login and 404.
 * One visual language: soft orchid/teal glow, a glass "card" object, small
 * sparkles. All decorative (aria-hidden); the text next to them carries meaning.
 */
import type { ReactNode } from "react";

export type IllustrationName = "inbox" | "search" | "tickets" | "purchases" | "chart" | "error" | "lock" | "lost" | "plug" | "people" | "bell" | "shield";

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden fill="none">
      <defs>
        <radialGradient id="il-glow" cx=".5" cy=".55" r=".5">
          <stop offset="0" stopColor="#b06ef2" stopOpacity=".35" />
          <stop offset="1" stopColor="#b06ef2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="il-glow2" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#14a08f" stopOpacity=".28" />
          <stop offset="1" stopColor="#14a08f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="il-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2338" />
          <stop offset="1" stopColor="#1a1624" />
        </linearGradient>
        <linearGradient id="il-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9b3ff" />
          <stop offset="1" stopColor="#9a52e0" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="66" rx="70" ry="50" fill="url(#il-glow)" />
      <ellipse cx="118" cy="40" rx="34" ry="26" fill="url(#il-glow2)" />
      <ellipse cx="80" cy="104" rx="42" ry="5" fill="#000" opacity=".35" />
      {children}
      <path d="M30 26l1.4 3.2 3.2 1.4-3.2 1.4L30 35.2l-1.4-3.2-3.2-1.4 3.2-1.4z" fill="#d9b3ff" opacity=".8" />
      <path d="M134 78l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1z" fill="#5eead4" opacity=".8" />
      <circle cx="122" cy="20" r="1.6" fill="#f0abfc" opacity=".8" />
      <circle cx="40" cy="88" r="1.4" fill="#5eead4" opacity=".7" />
    </svg>
  );
}

const card = { fill: "url(#il-card)", stroke: "#ffffff", strokeOpacity: 0.12 } as const;
const line = { stroke: "#ffffff", strokeOpacity: 0.16, strokeWidth: 3, strokeLinecap: "round" as const };

export function Illustration({ name, className }: { name: IllustrationName; className?: string }) {
  switch (name) {
    case "inbox":
      return (
        <Frame className={className}>
          <rect x="48" y="30" width="64" height="44" rx="8" {...card} />
          <path d="M48 62h18l5 8h18l5-8h18v14a8 8 0 0 1-8 8H56a8 8 0 0 1-8-8z" fill="#221c2e" stroke="#fff" strokeOpacity=".12" />
          <path d="M60 42h40M60 50h28" {...line} />
        </Frame>
      );
    case "search":
      return (
        <Frame className={className}>
          <rect x="42" y="32" width="58" height="56" rx="9" {...card} />
          <path d="M54 46h34M54 56h24M54 66h30" {...line} />
          <circle cx="104" cy="74" r="15" fill="#1a1624" stroke="url(#il-accent)" strokeWidth="5" />
          <path d="M115 85l10 10" stroke="url(#il-accent)" strokeWidth="6" strokeLinecap="round" />
        </Frame>
      );
    case "tickets":
      return (
        <Frame className={className}>
          <g transform="rotate(-8 80 60)">
            <path d="M44 38h72v12a8 8 0 0 0 0 16v12H44V66a8 8 0 0 0 0-16z" {...card} />
            <path d="M92 40v36" stroke="#fff" strokeOpacity=".18" strokeDasharray="3 4" />
            <path d="M56 52h24M56 62h16" {...line} />
          </g>
          <circle cx="112" cy="34" r="9" fill="url(#il-accent)" />
          <path d="M108 34l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Frame>
      );
    case "purchases":
      return (
        <Frame className={className}>
          <path d="M50 44h60l-5 42a6 6 0 0 1-6 5H61a6 6 0 0 1-6-5z" {...card} />
          <path d="M66 44v-5a14 14 0 0 1 28 0v5" stroke="url(#il-accent)" strokeWidth="5" strokeLinecap="round" />
          <circle cx="80" cy="66" r="11" fill="#1a1624" stroke="#5eead4" strokeOpacity=".7" strokeWidth="2.5" />
          <path d="M76 66h8M80 62v8" stroke="#5eead4" strokeWidth="2.5" strokeLinecap="round" />
        </Frame>
      );
    case "chart":
      return (
        <Frame className={className}>
          <rect x="40" y="30" width="80" height="58" rx="9" {...card} />
          <path d="M50 76l14-14 10 7 18-20 18 12" stroke="url(#il-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M50 76l14-14 10 7 18-20 18 12V80H50z" fill="#b06ef2" opacity=".14" />
        </Frame>
      );
    case "error":
      return (
        <Frame className={className}>
          <rect x="44" y="30" width="72" height="54" rx="10" {...card} />
          <path d="M80 44l16 28H64z" fill="#fb7185" fillOpacity=".18" stroke="#fb7185" strokeWidth="3" strokeLinejoin="round" />
          <path d="M80 54v8" stroke="#fb7185" strokeWidth="3" strokeLinecap="round" />
          <circle cx="80" cy="67" r="1.8" fill="#fb7185" />
        </Frame>
      );
    case "plug":
      return (
        <Frame className={className}>
          <path d="M30 70h26" stroke="#fff" strokeOpacity=".2" strokeWidth="4" strokeLinecap="round" />
          <rect x="54" y="58" width="22" height="24" rx="6" {...card} />
          <path d="M76 64h8M76 76h8" stroke="#fff" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round" />
          <rect x="94" y="56" width="22" height="28" rx="6" fill="url(#il-accent)" opacity=".85" />
          <path d="M116 70h18" stroke="#fff" strokeOpacity=".2" strokeWidth="4" strokeLinecap="round" />
          <path d="M86 50l-3 6h5l-3 6" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </Frame>
      );
    case "lock":
      return (
        <Frame className={className}>
          <path d="M66 52v-8a14 14 0 0 1 28 0v8" stroke="url(#il-accent)" strokeWidth="6" strokeLinecap="round" />
          <rect x="54" y="50" width="52" height="40" rx="10" {...card} />
          <circle cx="80" cy="66" r="5" fill="url(#il-accent)" />
          <path d="M80 70v8" stroke="url(#il-accent)" strokeWidth="4" strokeLinecap="round" />
        </Frame>
      );
    case "lost":
      return (
        <Frame className={className}>
          <circle cx="78" cy="60" r="26" fill="url(#il-card)" stroke="#fff" strokeOpacity=".12" />
          <ellipse cx="78" cy="60" rx="44" ry="10" stroke="url(#il-accent)" strokeWidth="3" transform="rotate(-16 78 60)" />
          <circle cx="70" cy="52" r="4" fill="#fff" opacity=".1" />
          <circle cx="86" cy="66" r="6" fill="#fff" opacity=".08" />
          <circle cx="118" cy="44" r="4" fill="#5eead4" />
        </Frame>
      );
    case "people":
      return (
        <Frame className={className}>
          <circle cx="62" cy="54" r="12" fill="#c58cf9" opacity=".9" />
          <path d="M44 86c2-12 9-18 18-18s16 6 18 18z" fill="#9a52e0" opacity=".9" />
          <circle cx="98" cy="50" r="14" fill="#5eead4" opacity=".9" />
          <path d="M78 86c2-14 10-20 20-20s18 6 20 20z" fill="#0f766e" opacity=".95" />
        </Frame>
      );
    case "bell":
      return (
        <Frame className={className}>
          <path d="M62 78V60a18 18 0 0 1 36 0v18l6 6H56z" {...card} />
          <path d="M74 88a6 6 0 0 0 12 0" stroke="url(#il-accent)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="98" cy="44" r="6" fill="url(#il-accent)" />
        </Frame>
      );
    case "shield":
      return (
        <Frame className={className}>
          <path d="M80 26l28 11v20c0 18-12 29-28 36-16-7-28-18-28-36V37z" {...card} />
          <path d="M68 60l8 8 16-17" stroke="#34d399" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </Frame>
      );
  }
}
