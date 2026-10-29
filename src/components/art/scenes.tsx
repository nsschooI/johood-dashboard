/**
 * JoHood staff illustrations.
 *
 * One kit, one style: rounded shapes, soft two-tone shading, the brand red /
 * cream / charcoal, a little gold. The cast:
 *   - "Hoodie", the staff mascot: a friendly red robot with a gift-bow antenna
 *     (the bots are its siblings), with moods for every situation;
 *   - props shared with the public giveaways pages: gift box, parachute;
 *   - staff props: shield, coin stack, ticket stubs, chat bubble, plug.
 *
 * Object colours are fixed (a red box is red in both themes); the backdrop
 * blob and ground shadow use theme tokens so scenes sit well on cream and
 * on charcoal. Decorative: always aria-hidden, the text next to it carries
 * the meaning.
 */
import { useId, type ReactNode } from "react";

const RED = { top: "#fb4d6d", base: "#e11d48", deep: "#9f1239" };
const CREAM = { light: "#fffaf5", base: "#fdeee2", deep: "#f0d6c4" };
const GOLD = { light: "#fde68a", base: "#fbbf24", deep: "#d97706" };
const INK = "#2b1f24";

export type Mood = "happy" | "calm" | "sleep" | "worried" | "search" | "wink" | "dizzy";

function Eyes({ mood }: { mood: Mood }) {
  switch (mood) {
    case "happy":
      return (
        <g stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none">
          <path d="M-20 -12q7 -9 14 0" />
          <path d="M6 -12q7 -9 14 0" />
        </g>
      );
    case "wink":
      return (
        <g>
          <ellipse cx="-13" cy="-12" rx="5" ry="7" fill={INK} />
          <circle cx="-11" cy="-15" r="1.8" fill="#fff" />
          <path d="M6 -11q7 -8 14 0" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </g>
      );
    case "sleep":
      return (
        <g stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none">
          <path d="M-20 -10q7 6 14 0" />
          <path d="M6 -10q7 6 14 0" />
        </g>
      );
    case "worried":
      return (
        <g>
          <ellipse cx="-13" cy="-10" rx="5" ry="6.5" fill={INK} />
          <ellipse cx="13" cy="-10" rx="5" ry="6.5" fill={INK} />
          <circle cx="-11" cy="-12.5" r="1.7" fill="#fff" />
          <circle cx="15" cy="-12.5" r="1.7" fill="#fff" />
          <g stroke={INK} strokeWidth="3.5" strokeLinecap="round">
            <path d="M-21 -22l10 -4" />
            <path d="M21 -22l-10 -4" />
          </g>
        </g>
      );
    case "dizzy":
      return (
        <g stroke={INK} strokeWidth="3.8" strokeLinecap="round">
          <path d="M-18 -16l9 9M-9 -16l-9 9" />
          <path d="M9 -16l9 9M18 -16l-9 9" />
        </g>
      );
    case "search":
      return (
        <g>
          <ellipse cx="-13" cy="-11" rx="5" ry="7" fill={INK} />
          <ellipse cx="13" cy="-11" rx="5" ry="7" fill={INK} />
          <circle cx="-10.5" cy="-14" r="1.8" fill="#fff" />
          <circle cx="15.5" cy="-14" r="1.8" fill="#fff" />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx="-13" cy="-11" rx="5" ry="7" fill={INK} />
          <ellipse cx="13" cy="-11" rx="5" ry="7" fill={INK} />
          <circle cx="-11" cy="-14" r="1.8" fill="#fff" />
          <circle cx="15" cy="-14" r="1.8" fill="#fff" />
        </g>
      );
  }
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === "worried" || mood === "dizzy") return <path d="M-6 8q6 -5 12 0" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />;
  if (mood === "sleep") return <ellipse cx="0" cy="7" rx="3.5" ry="2.5" fill={INK} />;
  if (mood === "search") return <path d="M-4 7h8" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />;
  return <path d="M-7 4q7 8 14 0" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />;
}

/** Hoodie, the mascot. Local origin = centre of the face; ~110 × 150 units. */
export function Mascot({ mood = "calm", x = 0, y = 0, scale = 1, body = true, wave }: { mood?: Mood; x?: number; y?: number; scale?: number; body?: boolean; wave?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <defs>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={RED.top} />
          <stop offset="1" stopColor={RED.base} />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={CREAM.light} />
          <stop offset="1" stopColor={CREAM.deep} />
        </linearGradient>
      </defs>
      {body && (
        <g>
          {/* arms */}
          <rect x="-44" y="38" width="14" height="30" rx="7" fill={RED.deep} transform={wave ? "rotate(28 -37 40)" : "rotate(12 -37 40)"} />
          <rect x="30" y="38" width="14" height="30" rx="7" fill={RED.deep} transform={wave ? "rotate(-150 37 40)" : "rotate(-12 37 40)"} />
          {/* torso */}
          <rect x="-32" y="30" width="64" height="48" rx="20" fill={`url(#${id}b)`} />
          <path d="M-32 52h64" stroke={CREAM.deep} strokeWidth="2" />
          {/* chest badge: the gift */}
          <rect x="-10" y="42" width="20" height="18" rx="4" fill={RED.base} />
          <rect x="-2" y="42" width="4" height="18" fill={CREAM.light} />
          <rect x="-10" y="48" width="20" height="3.5" fill={CREAM.light} opacity="0.9" />
        </g>
      )}
      {/* antenna with a bow */}
      <path d="M0 -44v-12" stroke={RED.deep} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M0 -58c-10 -12 -20 -4 -12 2 4 3 9 0 12 -2zM0 -58c10 -12 20 -4 12 2 -4 3 -9 0 -12 -2z" fill={GOLD.base} stroke={GOLD.deep} strokeWidth="1.5" />
      <circle cx="0" cy="-58" r="3.5" fill={GOLD.deep} />
      {/* ears */}
      <rect x="-56" y="-18" width="14" height="26" rx="6" fill={RED.deep} />
      <rect x="42" y="-18" width="14" height="26" rx="6" fill={RED.deep} />
      {/* head */}
      <rect x="-48" y="-46" width="96" height="76" rx="26" fill={`url(#${id}h)`} />
      <ellipse cx="-24" cy="-36" rx="14" ry="5" fill="#fff" opacity="0.28" />
      {/* face screen */}
      <rect x="-36" y="-34" width="72" height="52" rx="18" fill={CREAM.light} />
      <Eyes mood={mood} />
      <Mouth mood={mood} />
      {mood !== "worried" && mood !== "dizzy" && (
        <g fill="#fb7185" opacity="0.45">
          <ellipse cx="-25" cy="1" rx="5" ry="3" />
          <ellipse cx="25" cy="1" rx="5" ry="3" />
        </g>
      )}
    </g>
  );
}

/** 3/4-view gift box. Origin = bottom centre; ~80 × 76 units at scale 1. */
export function Gift({ x = 0, y = 0, scale = 1, tone = "red", rotate = 0, open }: { x?: number; y?: number; scale?: number; tone?: "red" | "cream" | "gold"; rotate?: number; open?: boolean }) {
  const c =
    tone === "red"
      ? { box: RED.base, side: RED.deep, lid: RED.top, ribbon: CREAM.light, ribbonDeep: CREAM.deep }
      : tone === "gold"
        ? { box: GOLD.base, side: GOLD.deep, lid: GOLD.light, ribbon: RED.base, ribbonDeep: RED.deep }
        : { box: CREAM.base, side: CREAM.deep, lid: CREAM.light, ribbon: RED.base, ribbonDeep: RED.deep };
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path d="M-38 -44 L8 -38 L8 0 L-38 -6 Z" fill={c.box} />
      <path d="M8 -38 L38 -48 L38 -10 L8 0 Z" fill={c.side} />
      <path d="M-16 -41 L-6 -39.8 L-6 -2 L-16 -3.2 Z" fill={c.ribbon} />
      <path d="M22 -43 L28 -45 L28 -7 L22 -5 Z" fill={c.ribbonDeep} />
      <g transform={open ? "translate(-6 -22) rotate(-18)" : undefined}>
        <path d="M-42 -54 L10 -47 L10 -37 L-42 -44 Z" fill={c.lid} />
        <path d="M10 -47 L42 -58 L42 -48 L10 -37 Z" fill={c.side} />
        <path d="M-42 -54 L-10 -64 L42 -58 L10 -47 Z" fill={c.lid} opacity="0.92" />
        <path d="M-26 -58 L-16 -61 L28 -55 L20 -52 Z" fill={c.ribbon} />
        {!open && (
          <>
            <path d="M0 -58c-14 -18 -30 -8 -18 1 6 4 13 1 18 -1z" fill={c.ribbon} />
            <path d="M0 -58c14 -20 32 -10 18 0 -6 4 -12 2 -18 0z" fill={c.ribbonDeep} />
            <circle cx="0" cy="-58" r="4.5" fill={c.ribbon} />
          </>
        )}
      </g>
      <path d="M-34 -36 L-29 -35.4 L-29 -12 L-34 -12.6 Z" fill="#fff" opacity="0.2" />
    </g>
  );
}

/** Striped parachute carrying a gift. Origin = top centre; ~90 × 120 units. */
export function Chute({ x = 0, y = 0, scale = 1, rotate = 0, muted }: { x?: number; y?: number; scale?: number; rotate?: number; muted?: boolean }) {
  const id = useId().replace(/:/g, "");
  const red = muted ? "#a8a29e" : RED.base;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <defs>
        <clipPath id={`${id}c`}>
          <path d="M-44 40C-44 12 -22 0 0 0S44 12 44 40C36 34 28 34 22 40 16 34 6 34 0 40 -6 34 -16 34 -22 40 -28 34 -36 34 -44 40Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect x="-50" y="-2" width="100" height="50" fill={CREAM.light} />
        <path d="M-22 -2 L-28 48 L-14 48 L-10 -2Z" fill={red} />
        <path d="M10 -2 L14 48 L28 48 L22 -2Z" fill={red} />
        <path d="M-50 -2 L-50 48 L-42 48 L-40 -2Z" fill={red} />
        <path d="M40 -2 L42 48 L50 48 L50 -2Z" fill={red} />
        <ellipse cx="-12" cy="14" rx="20" ry="7" fill="#fff" opacity="0.3" />
      </g>
      <g stroke={muted ? "#a8a29e" : RED.deep} strokeWidth="1.4" opacity="0.7">
        <path d="M-43 40 L-8 88M-22 40 L-5 88M22 40 L5 88M43 40 L8 88" />
      </g>
      <Gift y={112} scale={0.36} tone={muted ? "cream" : "red"} />
    </g>
  );
}

export function Shield({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={RED.top} />
          <stop offset="1" stopColor={RED.deep} />
        </linearGradient>
      </defs>
      <path d="M0 -50C14 -40 28 -36 40 -36V-4C40 24 20 40 0 50 -20 40 -40 24 -40 -4V-36C-28 -36 -14 -40 0 -50Z" fill={`url(#${id}s)`} />
      <path d="M0 -38C10 -31 20 -28 29 -28V-4C29 16 15 29 0 37 -15 29 -29 16 -29 -4V-28C-20 -28 -10 -31 0 -38Z" fill={CREAM.light} opacity="0.95" />
      <path d="M-12 0l8 8 16 -18" stroke={RED.base} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  );
}

export function Coins({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const coin = (cy: number, k: number) => (
    <g key={k}>
      <ellipse cx="0" cy={cy + 6} rx="30" ry="10" fill={GOLD.deep} />
      <rect x="-30" y={cy - 1} width="60" height="7" fill={GOLD.deep} />
      <ellipse cx="0" cy={cy} rx="30" ry="10" fill={GOLD.base} />
      <ellipse cx="0" cy={cy} rx="20" ry="6" fill="none" stroke={GOLD.light} strokeWidth="2.5" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {[0, -10, -20, -30].map((cy, i) => coin(cy, i))}
      <g transform="translate(26 -54) rotate(18)">
        <circle r="17" fill={GOLD.base} stroke={GOLD.deep} strokeWidth="3" />
        <path d="M3 -8v10a5 5 0 0 1-10 .5" stroke={GOLD.deep} strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}

export function TicketStub({ x = 0, y = 0, scale = 1, rotate = 0, tone = "red" }: { x?: number; y?: number; scale?: number; rotate?: number; tone?: "red" | "cream" }) {
  const fill = tone === "red" ? RED.base : CREAM.light;
  const ink = tone === "red" ? CREAM.light : RED.base;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path d="M-44 -24h88v14a10 10 0 0 0 0 20v14h-88v-14a10 10 0 0 0 0-20z" fill={fill} stroke={tone === "cream" ? CREAM.deep : "none"} strokeWidth="2" />
      <path d="M14 -20v40" stroke={ink} strokeWidth="2.5" strokeDasharray="4 4" opacity="0.7" />
      <rect x="-32" y="-8" width="34" height="5" rx="2.5" fill={ink} opacity="0.85" />
      <rect x="-32" y="3" width="22" height="5" rx="2.5" fill={ink} opacity="0.55" />
    </g>
  );
}

function Bubble({ x = 0, y = 0, scale = 1, children }: { x?: number; y?: number; scale?: number; children?: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-26 -18h52a10 10 0 0 1 10 10v18a10 10 0 0 1-10 10H-6l-12 10v-10h-8a10 10 0 0 1-10-10v-18a10 10 0 0 1 10-10z" fill={CREAM.light} stroke={CREAM.deep} strokeWidth="2" />
      {children}
    </g>
  );
}

function Sparkle({ x, y, s = 1, color = GOLD.base }: { x: number; y: number; s?: number; color?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -8C1 -2 2 -1 8 0 2 1 1 2 0 8 -1 2 -2 1 -8 0 -2 -1 -1 -2 0 -8Z" fill={color} />;
}

function Backdrop() {
  return (
    <>
      <ellipse cx="120" cy="92" rx="92" ry="72" fill="var(--ill-blob)" />
      <ellipse cx="120" cy="158" rx="70" ry="8" fill="var(--ill-shadow)" />
    </>
  );
}

export type SceneName =
  | "welcome"
  | "allClear"
  | "search"
  | "quiet"
  | "locked"
  | "lost"
  | "crash"
  | "botDown"
  | "safety"
  | "points"
  | "tickets"
  | "giveaways"
  | "emptyGift"
  | "audit"
  | "people";

/** One illustration per situation; all share the 240 × 180 stage. */
export function Scene({ name, className }: { name: SceneName; className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className} aria-hidden focusable="false">
      <Backdrop />
      {SCENES[name]()}
    </svg>
  );
}

const SCENES: Record<SceneName, () => ReactNode> = {
  welcome: () => (
    <>
      <Chute x={196} y={8} scale={0.42} rotate={8} />
      <Gift x={46} y={158} scale={0.62} tone="gold" rotate={-6} />
      <Mascot x={122} y={84} scale={0.78} mood="happy" wave />
      <Sparkle x={70} y={40} />
      <Sparkle x={178} y={92} s={0.7} color={RED.top} />
    </>
  ),
  allClear: () => (
    <>
      <Mascot x={118} y={86} scale={0.78} mood="happy" />
      <g transform="translate(184 52)">
        <circle r="18" fill="#10b981" />
        <path d="M-8 0l5 5 11 -11" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      <Sparkle x={58} y={46} />
      <Sparkle x={200} y={110} s={0.6} color={RED.top} />
    </>
  ),
  search: () => (
    <>
      <Mascot x={110} y={86} scale={0.78} mood="search" />
      <g transform="translate(172 108) rotate(-20)">
        <rect x="-5" y="18" width="10" height="28" rx="5" fill={RED.deep} />
        <circle r="20" fill="rgb(255 255 255 / 0.6)" stroke={GOLD.deep} strokeWidth="7" />
        <path d="M-9 -8a12 12 0 0 1 10 -6" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </g>
      <Sparkle x={56} y={50} s={0.8} />
    </>
  ),
  quiet: () => (
    <>
      <Mascot x={116} y={88} scale={0.78} mood="sleep" />
      <g fill="var(--color-ink-3)" fontFamily="var(--font-display)" fontWeight="700">
        <text x="168" y="44" fontSize="18">z</text>
        <text x="184" y="30" fontSize="13">z</text>
        <text x="196" y="20" fontSize="9">z</text>
      </g>
    </>
  ),
  locked: () => (
    <>
      <Gift x={112} y={150} scale={1.25} tone="red" />
      <g transform="translate(150 112)">
        <path d="M-12 -10v-8a12 12 0 0 1 24 0v8" stroke={GOLD.deep} strokeWidth="6" fill="none" strokeLinecap="round" />
        <rect x="-18" y="-12" width="36" height="30" rx="8" fill={GOLD.base} stroke={GOLD.deep} strokeWidth="2.5" />
        <circle cy="1" r="4" fill={INK} />
        <rect x="-1.8" y="2" width="3.6" height="8" rx="1.8" fill={INK} />
      </g>
      <Sparkle x={52} y={48} />
    </>
  ),
  lost: () => (
    <>
      <Chute x={122} y={6} scale={0.86} rotate={-10} />
      <g fill="var(--color-ink-3)" opacity="0.6">
        <circle cx="40" cy="60" r="3" />
        <circle cx="200" cy="40" r="2.5" />
        <circle cx="210" cy="120" r="3" />
      </g>
      <Sparkle x={58} y={110} s={0.8} color={RED.top} />
      <Sparkle x={196} y={78} s={0.6} />
    </>
  ),
  crash: () => (
    <>
      <Mascot x={104} y={86} scale={0.74} mood="dizzy" />
      <g transform="translate(184 128)">
        <path d="M-40 18c10 -30 20 -10 30 -24" stroke={RED.deep} strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="-12" y="-20" width="22" height="16" rx="4" fill={GOLD.base} stroke={GOLD.deep} strokeWidth="2" />
        <path d="M-6 -20v-8M4 -20v-8" stroke={GOLD.deep} strokeWidth="4" strokeLinecap="round" />
      </g>
      <Sparkle x={168} y={48} color={GOLD.base} />
    </>
  ),
  botDown: () => (
    <>
      <Mascot x={112} y={88} scale={0.78} mood="worried" />
      <g transform="translate(184 54)">
        <path d="M0 -20 22 18H-22Z" fill={GOLD.base} stroke={GOLD.deep} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M0 -6v10" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
        <circle cy="11" r="2.6" fill={INK} />
      </g>
    </>
  ),
  safety: () => (
    <>
      <Shield x={128} y={92} scale={1.25} />
      <Mascot x={62} y={110} scale={0.42} mood="wink" />
      <Sparkle x={190} y={50} />
      <Sparkle x={184} y={130} s={0.6} color={RED.top} />
    </>
  ),
  points: () => (
    <>
      <Coins x={130} y={142} scale={1.25} />
      <Sparkle x={62} y={56} />
      <Sparkle x={196} y={44} s={0.7} color={RED.top} />
    </>
  ),
  tickets: () => (
    <>
      <TicketStub x={104} y={110} scale={1.05} rotate={-10} tone="cream" />
      <TicketStub x={136} y={86} scale={1.05} rotate={8} />
      <Bubble x={190} y={46} scale={0.8}>
        <g fill={RED.base}>
          <circle cx="-14" cy="-2" r="4" />
          <circle cx="0" cy="-2" r="4" />
          <circle cx="14" cy="-2" r="4" />
        </g>
      </Bubble>
    </>
  ),
  giveaways: () => (
    <>
      <Gift x={96} y={156} scale={1.05} tone="red" rotate={-4} />
      <Gift x={168} y={156} scale={0.62} tone="gold" rotate={8} />
      <Chute x={178} y={10} scale={0.42} rotate={10} />
      <Sparkle x={52} y={46} />
    </>
  ),
  emptyGift: () => (
    <>
      <Gift x={120} y={156} scale={1.15} tone="cream" open />
      <Mascot x={182} y={118} scale={0.36} mood="search" />
      <Sparkle x={70} y={60} s={0.8} />
    </>
  ),
  audit: () => (
    <>
      <g transform="translate(120 92)">
        <rect x="-44" y="-56" width="88" height="112" rx="12" fill={CREAM.light} stroke={CREAM.deep} strokeWidth="2.5" />
        {[-30, -12, 6, 24].map((yy, i) => (
          <g key={i}>
            <circle cx="-26" cy={yy} r="5" fill={i === 0 ? RED.base : CREAM.deep} />
            <rect x="-14" y={yy - 3} width={i % 2 ? 36 : 48} height="6" rx="3" fill={CREAM.deep} />
          </g>
        ))}
      </g>
      <Mascot x={182} y={124} scale={0.36} mood="calm" />
    </>
  ),
  people: () => (
    <>
      {[
        [84, 110, "#fb7185"],
        [156, 110, GOLD.base],
        [120, 96, RED.base],
      ].map(([cx, cy, c], i) => (
        <g key={i} transform={`translate(${cx} ${cy})`}>
          <circle cy="-22" r="18" fill={c as string} />
          <path d="M-30 36a30 30 0 0 1 60 0z" fill={c as string} opacity="0.85" />
          <circle cx="-6" cy="-24" r="2.6" fill={INK} />
          <circle cx="6" cy="-24" r="2.6" fill={INK} />
        </g>
      ))}
      <Sparkle x={52} y={50} />
    </>
  ),
};
