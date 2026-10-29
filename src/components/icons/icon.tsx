/**
 * The JoHood icon set: one family, one 24px grid, round caps and joins.
 *
 * - Stroke weight is optical, not geometric: thicker in the grid at small
 *   sizes so every icon renders at ~1.5px on screen (16 / 20 / 24 px).
 * - `duo` adds a soft filled layer (currentColor at 18%) under the strokes:
 *   used for active navigation items and selected states.
 * - Brand glyphs (Robux, JoHood points, parachute) are drawn on the same grid.
 *
 * Geometry for the standard glyphs comes from Lucide (ISC) via
 * scripts/gen-icons.mjs; the duotone fills below are hand-drawn.
 */
import { createElement, type CSSProperties, type SVGProps } from "react";
import { PATHS, type IconNode } from "./paths";

type El = readonly [string, Readonly<Record<string, string | number>>];

/** Hand-drawn glyphs that aren't in the generated set. */
const BRAND = {
  robux: [
    ["path", { d: "M12 2.6 20.1 7.3v9.4L12 21.4l-8.1-4.7V7.3z" }],
    ["path", { d: "M12 8.2l3.3 1.9v3.8L12 15.8l-3.3-1.9v-3.8z" }],
  ],
  coin: [
    ["circle", { cx: "12", cy: "12", r: "9" }],
    ["path", { d: "M14 8v5.2a2.6 2.6 0 0 1-5.2.2" }],
  ],
  parachute: [
    ["path", { d: "M3 11a9 9 0 0 1 18 0c-1.5-.9-3-.9-4.5 0-1.5-.9-3-.9-4.5 0-1.5-.9-3-.9-4.5 0-1.5-.9-3-.9-4.5 0z" }],
    ["path", { d: "m3.5 11.5 6.5 6" }],
    ["path", { d: "m20.5 11.5-6.5 6" }],
    ["path", { d: "M12 11v6" }],
    ["rect", { x: "9", y: "17", width: "6", height: "4.5", rx: "1.2" }],
  ],
} as const satisfies Record<string, IconNode>;

/** Duotone fill shapes for glyphs whose outline isn't a single closed shape. */
const FILLS: Partial<Record<IconName, IconNode>> = {
  members: [
    ["circle", { cx: "10", cy: "8", r: "5" }],
    ["path", { d: "M18 21a8 8 0 0 0-16 0z" }],
  ],
  user: [
    ["circle", { cx: "12", cy: "8", r: "5" }],
    ["path", { d: "M20 21a8 8 0 0 0-16 0z" }],
  ],
  points: [
    ["circle", { cx: "16", cy: "8", r: "6" }],
    ["circle", { cx: "8", cy: "16", r: "6" }],
  ],
  giveaways: [
    ["path", { d: "M4 11h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" }],
    ["rect", { x: "3", y: "7", width: "18", height: "4", rx: "1" }],
  ],
  audit: [["path", { d: "M6 5a2 2 0 0 0-2-2h13a2 2 0 0 1 2 2v12H10v2a2 2 0 1 1-4 0z" }]],
  bell: [["path", { d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326z" }]],
  headphones: [
    ["path", { d: "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }],
    ["path", { d: "M21 14h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2z" }],
  ],
  gauge: [["path", { d: "M3.34 19a10 10 0 1 1 17.32 0z" }]],
  wallet: [["path", { d: "M3 5a2 2 0 0 0 2 2h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2z" }]],
  activity: [["path", { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" }]],
  bots: [["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2" }]],
  overview: [
    ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1" }],
    ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1" }],
  ],
  parachute: [
    ["path", { d: "M3 11a9 9 0 0 1 18 0c-1.5-.9-3-.9-4.5 0-1.5-.9-3-.9-4.5 0-1.5-.9-3-.9-4.5 0-1.5-.9-3-.9-4.5 0z" }],
    ["rect", { x: "9", y: "17", width: "6", height: "4.5", rx: "1.2" }],
  ],
  robux: [["path", { d: "M12 2.6 20.1 7.3v9.4L12 21.4l-8.1-4.7V7.3z" }]],
  coin: [["circle", { cx: "12", cy: "12", r: "9" }]],
};

const ALL = { ...PATHS, ...BRAND } as Record<string, IconNode>;
export type IconName = keyof typeof PATHS | keyof typeof BRAND;
export const ICON_NAMES = Object.keys(ALL) as IconName[];

/** Closed shapes are filled automatically when no hand-drawn fill exists. */
function autoFill(node: IconNode): IconNode {
  return node.filter(([tag, a]) => {
    if (tag === "rect" || tag === "circle" || tag === "ellipse" || tag === "polygon") return Number(a.r ?? 2) > 1;
    if (tag === "path") return /z\s*$/i.test(String(a.d));
    return false;
  });
}

/** Rendered stroke ≈ 1.5px at every size (grid units scale with the icon). */
export function strokeFor(size: number) {
  if (size <= 14) return 2.4;
  if (size <= 16) return 2.2;
  if (size <= 20) return 1.9;
  return 1.75;
}

function draw(node: IconNode, extra?: Record<string, string | number>) {
  return node.map(([tag, attrs]: El, i) => createElement(tag, { key: i, ...attrs, ...extra }));
}

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  /** Rendered size in px (also drives the optical stroke weight). */
  size?: number;
  /** Soft filled layer under the strokes (active / selected). */
  duo?: boolean;
  /** Accessible label; without one the icon is decorative. */
  label?: string;
  /** Flip in RTL (arrows, "log out"…). */
  mirror?: boolean;
  style?: CSSProperties;
}

export function Icon({ name, size = 20, duo, label, mirror, className, style, ...rest }: IconProps) {
  const node = ALL[name];
  if (!node) return null;
  const fill = duo ? (FILLS[name] ?? autoFill(node)) : null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeFor(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      className={[mirror ? "rtl:-scale-x-100" : "", "shrink-0", className].filter(Boolean).join(" ")}
      style={style}
      {...rest}
    >
      {fill && fill.length > 0 && (
        <g fill="currentColor" stroke="none" opacity={0.18}>
          {draw(fill)}
        </g>
      )}
      {draw(node)}
    </svg>
  );
}
