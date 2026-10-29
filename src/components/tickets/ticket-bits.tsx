"use client";

import { Icon, type IconName } from "@/components/icons/icon";
import { useT } from "@/components/providers/app-provider";
import { cn } from "@/components/ui/cn";
import type { TicketCategory, TicketStatus } from "@/lib/types";

export const CATEGORY_ICON: Record<TicketCategory, IconName> = {
  conversion: "transfer",
  purchase: "bag",
  report: "flag",
  support: "message",
  partnership: "hand",
};

export function CategoryChip({ category, className }: { category: TicketCategory; className?: string }) {
  const t = useT();
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md bg-surface-3/80 px-1.5 py-px text-[11px] font-semibold text-ink-2", className)}>
      <Icon name={CATEGORY_ICON[category]} size={12} />
      {t(`tickets.category.${category}`)}
    </span>
  );
}

export const STATUS_STYLE: Record<TicketStatus, string> = {
  open: "bg-warn/14 text-warn",
  claimed: "bg-info/12 text-info",
  closed: "bg-surface-3 text-ink-3",
};

export function StatusPill({ status }: { status: TicketStatus }) {
  const t = useT();
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLE[status])}>{t(`tickets.status.${status}`)}</span>;
}
