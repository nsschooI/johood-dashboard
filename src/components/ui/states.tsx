import type { ReactNode } from "react";
import { Scene, type SceneName } from "@/components/art/scenes";
import { cn } from "./cn";

/** Older illustration names, kept so callers read naturally. */
const ALIAS: Record<string, SceneName> = {
  inbox: "allClear",
  purchases: "points",
  chart: "quiet",
  error: "crash",
  lock: "locked",
  plug: "crash",
  bell: "quiet",
  shield: "safety",
};
export type ArtName = SceneName | keyof typeof ALIAS;
const scene = (a: ArtName): SceneName => (ALIAS[a] ?? a) as SceneName;

/** Empty state: illustration, what it means, and what to do next. */
export function EmptyState({
  title,
  hint,
  art = "allClear",
  action,
  className,
  compact,
}: {
  title: string;
  hint?: string;
  art?: ArtName;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1 px-6 text-center animate-fade-in", compact ? "py-5" : "py-10", className)}>
      <Scene name={scene(art)} className={compact ? "mb-1 h-24 w-auto" : "mb-2 h-36 w-auto"} />
      <p className="font-display text-[15px] font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm leading-relaxed text-ink-3">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, hint, action, className, art = "crash" }: { title: string; hint?: string; action?: ReactNode; className?: string; art?: ArtName }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-1 px-6 py-10 text-center animate-fade-in", className)}>
      <Scene name={scene(art)} className="mb-2 h-36 w-auto" />
      <p className="font-display text-[15px] font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-xs text-sm text-ink-3">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
