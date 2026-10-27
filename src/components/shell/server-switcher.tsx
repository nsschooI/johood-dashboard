"use client";

import { ChevronsUpDown } from "lucide-react";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { Img } from "@/components/ui/img";
import { MenuPopover, useMenu } from "@/components/ui/menu";
import { cn } from "@/components/ui/cn";
import { GuildBannerArt } from "@/components/art/mock-art";
import { GuildIcon } from "./guild-mark";

/** Sidebar server card: banner, icon, name, counts; click to switch. */
export function ServerSwitcher({ compact }: { compact?: boolean }) {
  const { t } = useApp();
  const f = useFormat();
  const { guild, guilds, current, setGuild } = useGuild();
  const menu = useMenu();

  const sections = [
    {
      title: t("guild.switch"),
      items: guilds.map((g) => ({
        key: g.key,
        label: g.name,
        icon: <GuildIcon guild={g.key} info={g} size={18} />,
        hint: `${t("guild.members", { n: f.n(g.members) })} · ${t("guild.online", { n: f.n(g.online) })}`,
        onSelect: () => setGuild(g.key),
        checked: g.key === guild,
      })),
    },
  ];

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => menu.openFromButton(e.currentTarget)}
          aria-haspopup="menu"
          aria-expanded={menu.open}
          aria-label={`${t("guild.switch")}: ${current?.name ?? ""}`}
          className="flex items-center gap-1.5 rounded-xl p-1 transition hover:bg-white/[0.06] active:scale-95"
        >
          <GuildIcon guild={guild} info={current} size={30} />
          <ChevronsUpDown aria-hidden className="size-3.5 text-ink-3" />
        </button>
        <MenuPopover anchor={menu.anchor} onClose={menu.close} sections={sections} label={t("guild.switch")} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => menu.openFromButton(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        className="group relative block w-full overflow-hidden rounded-2xl text-start ring-1 ring-line transition duration-[var(--dur-base)] hover:ring-line-strong active:scale-[0.99]"
      >
        <span aria-hidden className="absolute inset-0">
          <Img src={current?.bannerUrl} sizes="240px" className="size-full opacity-70 transition duration-[var(--dur-slow)] group-hover:scale-105 group-hover:opacity-90" fallback={<GuildBannerArt guild={guild} className="absolute inset-0 size-full" />} />
          <span className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/10" />
        </span>
        <span className="relative flex items-center gap-3 px-3 pt-8 pb-3">
          <GuildIcon guild={guild} info={current} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{current?.name ?? "JoHood"}</span>
            {current && (
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-2">
                <span className="tabular">{f.compact(current.members)}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden className="size-1.5 rounded-full bg-good" />
                  <span className="tabular">{f.compact(current.online)}</span>
                </span>
                {current.boostLevel > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="text-blush">Lv {current.boostLevel}</span>
                  </>
                )}
              </span>
            )}
          </span>
          <ChevronsUpDown aria-hidden className={cn("size-4 text-ink-3 transition group-hover:text-ink-2")} />
        </span>
        <span className="sr-only">{t("guild.switch")}</span>
      </button>
      <MenuPopover anchor={menu.anchor} onClose={menu.close} sections={sections} label={t("guild.switch")} width={260} />
    </>
  );
}
