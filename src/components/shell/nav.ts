import type { IconName } from "@/components/icons/icon";
import type { MessageKey } from "@/lib/i18n";
import type { PageKey } from "@/lib/permissions";

export type NavGroup = "today" | "community" | "system";

export interface NavItem {
  key: PageKey;
  href: string;
  label: MessageKey;
  hint: MessageKey;
  icon: IconName;
  /** "g" then this key jumps to the page. */
  shortcut: string;
  group: NavGroup;
  /** Same data in both servers (economy). */
  global?: boolean;
}

/** The staff navigation, in reading order. Visibility comes from PAGE_ACCESS. */
export const NAV: NavItem[] = [
  { key: "overview", href: "/overview", label: "nav.overview", hint: "nav.hint.overview", icon: "overview", shortcut: "o", group: "today" },
  { key: "tickets", href: "/tickets", label: "nav.tickets", hint: "nav.hint.tickets", icon: "tickets", shortcut: "t", group: "today" },
  { key: "activity", href: "/activity", label: "nav.activity", hint: "nav.hint.activity", icon: "activity", shortcut: "y", group: "today", global: true },
  { key: "members", href: "/members", label: "nav.members", hint: "nav.hint.members", icon: "members", shortcut: "m", group: "community" },
  { key: "points", href: "/points", label: "nav.points", hint: "nav.hint.points", icon: "coin", shortcut: "p", group: "community", global: true },
  { key: "giveaways", href: "/giveaways-admin", label: "nav.giveaways", hint: "nav.hint.giveaways", icon: "giveaways", shortcut: "v", group: "community", global: true },
  { key: "bots", href: "/bots", label: "nav.bots", hint: "nav.hint.bots", icon: "bots", shortcut: "b", group: "system", global: true },
  { key: "safety", href: "/safety", label: "nav.safety", hint: "nav.hint.safety", icon: "safety", shortcut: "s", group: "system", global: true },
  { key: "access", href: "/access", label: "nav.access", hint: "nav.hint.access", icon: "access", shortcut: "a", group: "system" },
];

export const NAV_GROUPS: NavGroup[] = ["today", "community", "system"];

export function navFor(path: string) {
  return NAV.find((n) => path === n.href || path.startsWith(`${n.href}/`)) ?? null;
}
