import type { ReactNode } from "react";
import { Illustration, type IllustrationName } from "@/components/art/illustrations";
import { cn } from "./cn";

/** Empty state with an illustration, a title and what to do next. */
export function EmptyState({
  title,
  hint,
  art = "inbox",
  action,
  className,
  compact,
}: {
  title: string;
  hint?: string;
  art?: IllustrationName;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1.5 px-6 text-center animate-fade-in", compact ? "py-6" : "py-10", className)}>
      <Illustration name={art} className={compact ? "mb-1 h-16 w-auto" : "mb-2 h-24 w-auto"} />
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {hint && <p className="max-w-sm text-xs leading-relaxed text-ink-3">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, hint, action, className, art = "error" }: { title: string; hint?: string; action?: ReactNode; className?: string; art?: IllustrationName }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-1.5 px-6 py-10 text-center animate-fade-in", className)}>
      <Illustration name={art} className="mb-2 h-24 w-auto" />
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="max-w-xs text-xs text-ink-3">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
