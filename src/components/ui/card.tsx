import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, interactive, ...rest }: HTMLAttributes<HTMLElement> & { interactive?: boolean }) {
  return <section className={cn("glass rounded-[var(--radius-card)]", interactive && "lift", className)} {...rest} />;
}

export function CardHeader({
  title,
  description,
  icon,
  actions,
  className,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-center gap-3 px-5 pt-5 pb-3", className)}>
      {icon && (
        <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-accent-400/25 to-accent-600/10 text-accent-200 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] ring-1 ring-accent-400/25 [&>svg]:fill-accent-400/20">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-sm font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="bg-gradient-to-br from-white via-ink to-accent-200 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-[1.8rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
