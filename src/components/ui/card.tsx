import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons/icon";
import { cn } from "./cn";

export function Card({ className, interactive, ...rest }: HTMLAttributes<HTMLElement> & { interactive?: boolean }) {
  return <section className={cn("glass rounded-[var(--radius-card)]", interactive && "lift", className)} {...rest} />;
}

/** Rounded tinted square holding a duotone icon (card headers, list leads). */
export function IconTile({ name, tone = "accent", size = "md", className }: { name: IconName; tone?: "accent" | "guild" | "good" | "warn" | "bad" | "info" | "neutral"; size?: "sm" | "md" | "lg"; className?: string }) {
  const tones = {
    accent: "bg-accent-500/10 text-accent-400",
    guild: "bg-[color-mix(in_oklab,var(--color-guild)_14%,transparent)] text-guild-ink",
    good: "bg-good/12 text-good",
    warn: "bg-warn/14 text-warn",
    bad: "bg-bad/12 text-bad",
    info: "bg-info/12 text-info",
    neutral: "bg-surface-3 text-ink-2",
  } as const;
  const box = size === "sm" ? "size-7 rounded-lg" : size === "lg" ? "size-11 rounded-2xl" : "size-9 rounded-xl";
  const px = size === "sm" ? 16 : size === "lg" ? 24 : 20;
  return (
    <span className={cn("grid shrink-0 place-items-center", box, tones[tone], className)}>
      <Icon name={name} size={px} duo />
    </span>
  );
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
  icon?: ReactNode | IconName;
  actions?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-center gap-3 px-5 pt-5 pb-3", className)}>
      {icon && (typeof icon === "string" ? <IconTile name={icon as IconName} /> : <span className="grid size-9 place-items-center rounded-xl bg-accent-500/10 text-accent-400">{icon}</span>)}
      <div className="min-w-0 flex-1 basis-44">
        <h2 id={id} className="font-display text-[15px] font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2 overflow-x-auto">{actions}</div>}
    </header>
  );
}

/** Page title block: eyebrow (server chip), big Rubik title, one line of context, actions. */
export function PageHeader({ title, subtitle, actions, eyebrow, art }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; art?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 animate-rise">
      <div className="flex min-w-0 items-center gap-4">
        {art && <div className="hidden shrink-0 sm:block">{art}</div>}
        <div className="min-w-0">
          {eyebrow && <div className="mb-2">{eyebrow}</div>}
          <h1 className="font-display text-[1.75rem] leading-tight font-bold text-ink sm:text-[2rem]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2 overflow-x-auto">{actions}</div>}
    </div>
  );
}

/** Small uppercase-free section label with an optional count and trailing link. */
export function SectionTitle({ id, icon, children, count, action }: { id?: string; icon?: IconName; children: ReactNode; count?: number; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon && <Icon name={icon} size={18} duo className="text-accent-400" />}
      <h2 id={id} className="font-display text-base font-semibold text-ink">
        {children}
      </h2>
      {count !== undefined && <span className="tabular rounded-full bg-surface-3 px-2 text-xs font-semibold text-ink-2">{count}</span>}
      {action && <div className="ms-auto">{action}</div>}
    </div>
  );
}
