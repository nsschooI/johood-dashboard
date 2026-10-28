"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, Languages, LogIn, Monitor, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import { Tooltip } from "@/components/ui/tooltip";
import { loginHref } from "@/lib/giveaways/client";
import { useGw, type GwTheme } from "./gw-provider";

const NEXT_THEME: Record<GwTheme, GwTheme> = { system: "light", light: "dark", dark: "system" };
const THEME_ICON = { light: Sun, dark: Moon, system: Monitor };

function IconButton({ label, onClick, children, pressed }: { label: string; onClick: () => void; children: React.ReactNode; pressed?: boolean }) {
  return (
    <Tooltip content={label} side="bottom">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={pressed}
        className="grid size-10 place-items-center rounded-full text-ink-2 transition-[background-color,color,transform] duration-[var(--dur-fast)] hover:bg-accent-500/10 hover:text-accent-300 active:scale-90"
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function GwHeader() {
  const { t, locale, setLocale } = useApp();
  const { member, theme, setTheme, sound, toggleSound } = useGw();
  const pathname = usePathname();
  const ThemeIcon = THEME_ICON[theme];
  const links = [
    { href: "/giveaways", label: t("gw.nav.all"), active: pathname === "/giveaways" || /^\/giveaways\/\d+/.test(pathname) },
    { href: "/giveaways/me", label: t("gw.nav.me"), active: pathname === "/giveaways/me" },
  ];

  const nav = (
    <nav aria-label={t("gw.title")} className="flex items-center gap-1">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          transitionTypes={["nav"]}
          aria-current={l.active ? "page" : undefined}
          className={cn(
            "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-[var(--dur-fast)]",
            l.active ? "bg-accent-500/12 text-accent-300" : "text-ink-2 hover:bg-accent-500/8 hover:text-ink",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_oklab,var(--color-bg)_82%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link href="/giveaways" className="flex shrink-0 items-center gap-2.5 rounded-xl" aria-label={t("gw.brand")}>
          <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#fb7185] to-[#be123c] text-white shadow-[0_8px_20px_-8px_#e11d48]">
            <Gift className="size-5" />
          </span>
          <span className="leading-tight max-[380px]:hidden">
            <span className="block text-sm font-bold tracking-tight">JoHood</span>
            <span className="block text-[11px] font-medium text-ink-3">Giveaways · السحوبات</span>
          </span>
        </Link>
        <div className="ms-4 hidden sm:block">{nav}</div>
        <div className="ms-auto flex items-center gap-0.5">
          <IconButton label={locale === "ar" ? "English" : "العربية"} onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>
            <Languages aria-hidden className="size-[18px]" />
          </IconButton>
          <IconButton label={`${t("gw.theme.label")}: ${t(`gw.theme.${theme}`)}`} onClick={() => setTheme(NEXT_THEME[theme])}>
            <ThemeIcon aria-hidden className="size-[18px]" />
          </IconButton>
          <IconButton label={sound ? t("gw.sound.on") : t("gw.sound.off")} onClick={toggleSound} pressed={sound}>
            {sound ? <Volume2 aria-hidden className="size-[18px]" /> : <VolumeX aria-hidden className="size-[18px]" />}
          </IconButton>
          {member ? (
            <Link href="/giveaways/me" transitionTypes={["nav"]} className="ms-1 rounded-full p-0.5 ring-2 ring-accent-500/30 transition hover:ring-accent-500/60" aria-label={`${t("gw.me.signedInAs")} ${member.name}`}>
              <Avatar name={member.name} src={member.avatarUrl} size={34} />
            </Link>
          ) : (
            <a href={loginHref(pathname)} className="gw-cta-soft ms-1 !min-h-10 !px-3 text-sm">
              <LogIn aria-hidden className="size-4 rtl:-scale-x-100" />
              <span className="max-sm:sr-only">{t("gw.status.login")}</span>
            </a>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-2 sm:hidden">{nav}</div>
    </header>
  );
}
