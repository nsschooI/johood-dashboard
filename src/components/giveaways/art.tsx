/**
 * Hand-drawn SVG art for the giveaways pages: gift boxes, parachutes and a
 * default banner. Used when the owner hasn't dropped banner images into
 * public/giveaways/ and as the floating decoration.
 */
import { useId } from "react";

type Tone = { box: string; side: string; lid: string; ribbon: string; ribbonDark: string };

const TONES: Record<string, Tone> = {
  red: { box: "#e11d48", side: "#9f1239", lid: "#f43f5e", ribbon: "#fff1e6", ribbonDark: "#f3d9c6" },
  cream: { box: "#fff1e6", side: "#ecd3bf", lid: "#fffaf5", ribbon: "#e11d48", ribbonDark: "#9f1239" },
  gold: { box: "#fbbf24", side: "#d97706", lid: "#fcd34d", ribbon: "#e11d48", ribbonDark: "#9f1239" },
  grey: { box: "#a8a29e", side: "#78716c", lid: "#d6d3d1", ribbon: "#f5f5f4", ribbonDark: "#d6d3d1" },
  greyDark: { box: "#78716c", side: "#57534e", lid: "#a8a29e", ribbon: "#e7e5e4", ribbonDark: "#a8a29e" },
};

/** A 3/4-view gift box with a bow. viewBox 0 0 100 100. */
export function GiftBox({ tone = "red", className, style }: { tone?: keyof typeof TONES; className?: string; style?: React.CSSProperties }) {
  const c = TONES[tone];
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <ellipse cx="50" cy="94" rx="34" ry="4" fill="#000" opacity="0.12" />
      {/* body: front + side */}
      <path d="M16 44 L62 50 L62 92 L16 86 Z" fill={c.box} />
      <path d="M62 50 L86 42 L86 84 L62 92 Z" fill={c.side} />
      {/* lid */}
      <path d="M12 36 L64 43 L64 53 L12 46 Z" fill={c.lid} />
      <path d="M64 43 L90 34 L90 44 L64 53 Z" fill={c.side} />
      <path d="M12 36 L38 28 L90 34 L64 43 Z" fill={c.lid} opacity="0.92" />
      {/* ribbon */}
      <path d="M34 47 L44 48.4 L44 90 L34 88.6 Z" fill={c.ribbon} />
      <path d="M31 39 L41 40.3 L41 50 L31 48.6 Z" fill={c.ribbon} />
      <path d="M71 47 L77 45 L77 87 L71 89 Z" fill={c.ribbonDark} />
      <path d="M24 31.5 L34 29 L84 35.6 L76 38.4 Z" fill={c.ribbon} opacity="0.95" />
      {/* bow */}
      <path d="M50 33 C36 14 22 22 34 33 C40 37 46 35 50 33 Z" fill={c.ribbon} />
      <path d="M50 33 C62 12 80 20 66 32 C60 36 54 35 50 33 Z" fill={c.ribbonDark} />
      <circle cx="50" cy="33" r="4.5" fill={c.ribbon} />
      {/* shine */}
      <path d="M20 50 L26 50.8 L26 70 L20 69 Z" fill="#fff" opacity="0.18" />
    </svg>
  );
}

/** A striped parachute carrying a small gift. viewBox 0 0 100 130. */
export function Parachute({ className, style, muted }: { className?: string; style?: React.CSSProperties; muted?: boolean }) {
  const id = useId();
  const red = muted ? "#a8a29e" : "#e11d48";
  const white = muted ? "#e7e5e4" : "#fff7ef";
  return (
    <svg viewBox="0 0 100 130" className={className} style={style} aria-hidden>
      <defs>
        <clipPath id={`${id}-canopy`}>
          <path d="M6 48 C6 18 28 4 50 4 C72 4 94 18 94 48 C86 42 78 42 72 48 C66 42 56 42 50 48 C44 42 34 42 28 48 C22 42 14 42 6 48 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-canopy)`}>
        <rect x="0" y="0" width="100" height="60" fill={white} />
        <path d="M28 0 L22 60 L36 60 L40 0 Z" fill={red} />
        <path d="M60 0 L64 60 L78 60 L72 0 Z" fill={red} />
        <path d="M0 0 L0 60 L8 60 L10 0 Z" fill={red} />
        <path d="M90 0 L92 60 L100 60 L100 0 Z" fill={red} />
        <ellipse cx="38" cy="18" rx="22" ry="8" fill="#fff" opacity="0.25" />
      </g>
      <g stroke={muted ? "#a8a29e" : "#9f1239"} strokeWidth="1" opacity="0.7" fill="none">
        <path d="M7 48 L42 98" />
        <path d="M28 47 L45 98" />
        <path d="M72 47 L55 98" />
        <path d="M93 48 L58 98" />
      </g>
      <g transform="translate(36 94) scale(0.3)">
        <GiftShape tone={muted ? "grey" : "red"} />
      </g>
    </svg>
  );
}

function GiftShape({ tone }: { tone: keyof typeof TONES }) {
  const c = TONES[tone];
  return (
    <>
      <rect x="2" y="18" width="88" height="64" rx="6" fill={c.box} />
      <rect x="0" y="8" width="92" height="18" rx="5" fill={c.lid} />
      <rect x="38" y="8" width="16" height="74" fill={c.ribbon} />
      <path d="M46 8 C30 -12 14 0 30 8 Z M46 8 C62 -12 78 0 62 8 Z" fill={c.ribbon} />
    </>
  );
}

/** Small confetti speck used in the banner. */
function Specks({ muted }: { muted?: boolean }) {
  const colors = muted ? ["#a8a29e", "#d6d3d1", "#78716c"] : ["#e11d48", "#fbbf24", "#fb7185", "#f59e0b"];
  const pts = [
    [8, 14, 0], [22, 70, 20], [36, 22, 60], [58, 12, 110], [70, 78, 30], [84, 20, 80], [92, 64, 140], [48, 86, 10], [14, 44, 45], [78, 46, 95],
  ];
  return (
    <g>
      {pts.map(([x, y, r], i) => (
        <rect key={i} x={`${x}%`} y={`${y}%`} width="7" height="3" rx="1.5" fill={colors[i % colors.length]} opacity="0.75" transform={`rotate(${r} 0 0)`} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
      ))}
    </g>
  );
}

/**
 * Default banner background: cream with red 3D gift boxes on both sides (or
 * a grey version once the giveaway ended). The prize text is laid over it in
 * HTML so Arabic shapes and wraps correctly.
 */
export function BannerArt({ ended, className }: { ended?: boolean; className?: string }) {
  const id = useId();
  return (
    <span className={className} aria-hidden>
      <svg viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <defs>
          <radialGradient id={`${id}-bg`} cx="50%" cy="40%" r="75%">
            <stop offset="0" stopColor={ended ? "#f5f5f4" : "#fffaf5"} />
            <stop offset="1" stopColor={ended ? "#d6d3d1" : "#fde3cf"} />
          </radialGradient>
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={ended ? "#fff" : "#fff"} stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="300" fill={`url(#${id}-bg)`} />
        <ellipse cx="400" cy="150" rx="260" ry="120" fill={`url(#${id}-glow)`} />
        <Specks muted={ended} />
      </svg>
      <GiftBox tone={ended ? "grey" : "red"} className="absolute -start-[8%] bottom-[-6%] h-[60%] w-auto rotate-[-8deg] sm:-start-[4%] sm:h-[78%]" />
      <GiftBox tone={ended ? "greyDark" : "gold"} className="absolute start-[13%] bottom-[-10%] h-[44%] w-auto rotate-[10deg] max-sm:hidden" />
      <GiftBox tone={ended ? "grey" : "cream"} className="absolute -end-[7%] bottom-[-4%] h-[54%] w-auto rotate-[7deg] sm:-end-[3%] sm:h-[70%]" />
      <Parachute muted={ended} className="absolute end-[14%] top-[6%] h-[52%] w-auto rotate-[8deg] max-sm:hidden" />
    </span>
  );
}
