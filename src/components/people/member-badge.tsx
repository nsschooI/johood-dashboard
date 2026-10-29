"use client";

import { Icon } from "@/components/icons/icon";
import { useT } from "@/components/providers/app-provider";
import { cn } from "@/components/ui/cn";
import type { Badge } from "@/lib/types";

/**
 * The one badge next to a member: their server rank, or their staff role
 * for staff. The backend decides which and sends the label and colour;
 * nothing is shown when it sends none.
 */
export function MemberBadge({ badge, size = "sm", className }: { badge: Badge | null | undefined; size?: "sm" | "md"; className?: string }) {
  const t = useT();
  if (!badge) return null;
  const color = badge.color ?? "var(--color-accent-500)";
  return (
    <span
      title={badge.kind === "staff" ? t("dir.badge.staff") : t("dir.badge.rank")}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full font-semibold whitespace-nowrap ring-1 ring-inset",
        size === "md" ? "py-0.5 ps-1.5 pe-2.5 text-xs" : "py-px ps-1 pe-2 text-[11px]",
        className,
      )}
      style={{
        color: `color-mix(in oklab, ${color} 62%, var(--color-ink))`,
        background: `color-mix(in oklab, ${color} 13%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 38%, transparent)`,
      }}
    >
      <Icon name={badge.kind === "staff" ? "shield" : "star"} size={size === "md" ? 14 : 12} duo />
      <span className="truncate">{badge.label}</span>
    </span>
  );
}

/** Linked / not linked — the only Roblox fact the Members page shows. */
export function LinkedChip({ linked, className }: { linked: boolean; className?: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10.5px] font-semibold whitespace-nowrap ring-1 ring-inset",
        linked ? "bg-good/10 text-good ring-good/25" : "bg-surface-2 text-ink-3 ring-line",
        className,
      )}
    >
      <Icon name={linked ? "link" : "linkOff"} size={12} />
      {linked ? t("members.linked") : t("dir.notLinked")}
    </span>
  );
}
