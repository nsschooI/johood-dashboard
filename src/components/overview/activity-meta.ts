import { ArrowLeftRight, Bot, Coins, Headphones, LifeBuoy, ShieldAlert, ShoppingBag, Sparkles, UserPlus, type LucideIcon } from "lucide-react";
import type { ActivityItem, ActivityKind } from "@/lib/types";

export const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  purchase: ShoppingBag,
  transfer: ArrowLeftRight,
  redeem: Sparkles,
  points_adjust: Coins,
  bot: Bot,
  assistant: Headphones,
  member_join: UserPlus,
  ticket: LifeBuoy,
  protection: ShieldAlert,
};

export const ACTIVITY_TONE: Record<ActivityItem["tone"], string> = {
  neutral: "bg-white/[0.05] text-ink-2 ring-line",
  success: "bg-good/10 text-good ring-good/20",
  warning: "bg-warn/10 text-warn ring-warn/20",
  danger: "bg-bad/10 text-bad ring-bad/20",
};
