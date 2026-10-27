import { Activity, Coins, ShieldCheck, type LucideIcon } from "lucide-react";
import type { MessageKey } from "@/lib/i18n";
import type { PageKey } from "@/lib/permissions";

export const NAV: { key: PageKey; href: string; label: MessageKey; icon: LucideIcon }[] = [
  { key: "overview", href: "/overview", label: "nav.overview", icon: Activity },
  { key: "points", href: "/points", label: "nav.points", icon: Coins },
  { key: "members", href: "/members", label: "nav.members", icon: ShieldCheck },
];
