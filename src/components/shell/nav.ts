import { Activity, Coins, KeyRound, ShieldCheck, type LucideIcon } from "lucide-react";
import type { MessageKey } from "@/lib/i18n";
import type { PageKey } from "@/lib/permissions";

export const NAV: { key: PageKey; href: string; label: MessageKey; icon: LucideIcon; shortcut: string; global?: boolean }[] = [
  { key: "overview", href: "/overview", label: "nav.overview", icon: Activity, shortcut: "o" },
  { key: "points", href: "/points", label: "nav.points", icon: Coins, shortcut: "p", global: true },
  { key: "members", href: "/members", label: "nav.members", icon: ShieldCheck, shortcut: "m" },
  { key: "access", href: "/access", label: "nav.access", icon: KeyRound, shortcut: "a" },
];
