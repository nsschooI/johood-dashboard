import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { cn } from "./cn";

export function EmptyState({ title, hint, icon, className }: { title: string; hint?: string; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-10 text-center", className)}>
      <span className="grid size-10 place-items-center rounded-xl bg-white/[0.04] text-ink-3 ring-1 ring-line">{icon ?? <Inbox className="size-5" aria-hidden />}</span>
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {hint && <p className="max-w-xs text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function ErrorState({ title, hint, action, className }: { title: string; hint?: string; action?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-2 px-6 py-10 text-center", className)}>
      <span className="grid size-10 place-items-center rounded-xl bg-bad/10 text-bad ring-1 ring-bad/20">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="max-w-xs text-xs text-ink-3">{hint}</p>}
      {action}
    </div>
  );
}
