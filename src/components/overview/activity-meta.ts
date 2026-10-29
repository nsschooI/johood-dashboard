import type { IconName } from "@/components/icons/icon";
import type { ActivityItem, ActivityKind } from "@/lib/types";

export const ACTIVITY_ICON: Record<ActivityKind, IconName> = {
  purchase: "bag",
  transfer: "transfer",
  redeem: "sparkles",
  points_adjust: "coin",
  bot: "bots",
  assistant: "headphones",
  member_join: "userPlus",
  ticket: "tickets",
  protection: "safety",
};

export const ACTIVITY_TONE: Record<ActivityItem["tone"], string> = {
  neutral: "bg-surface-3 text-ink-2",
  success: "bg-good/12 text-good",
  warning: "bg-warn/14 text-warn",
  danger: "bg-bad/12 text-bad",
};
