"use client";

import { Icon } from "@/components/icons/icon";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { Img } from "@/components/ui/img";
import { MenuPopover, useMenu } from "@/components/ui/menu";
import { GuildBannerArt } from "@/components/art/mock-art";
import { GuildIcon } from "./guild-mark";

/**
 * The server switcher: always in view, tinted with the server's accent
 * (JoHood red, Catalog amber) so staff always know where they are.
 */
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
        icon: <GuildIcon guild={g.key} info={g} size={20} />,
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
          className="flex min-w-0 items-center gap-2 rounded-full bg-surface py-1 ps-1 pe-2.5 shadow-[0_1px_2px_var(--color-shadow-1)] ring-1 ring-line transition active:scale-95"
        >
          <span className="relative">
            <GuildIcon guild={guild} info={current} size={28} />
            <span aria-hidden className="absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full bg-guild ring-2 ring-surface" />
          </span>
          <span className="max-w-28 truncate text-[13px] font-semibold">{current?.name ?? "JoHood"}</span>
          <Icon name="chevronsUpDown" size={14} className="text-ink-3" />
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
        className="group relative block w-full overflow-hidden rounded-2xl bg-surface-2 text-start ring-1 ring-line transition duration-[var(--dur-base)] hover:ring-[color-mix(in_oklab,var(--color-guild)_45%,transparent)] active:scale-[0.99]"
      >
        <span aria-hidden className="relative block h-14 overflow-hidden">
          <Img src={current?.bannerUrl} sizes="240px" className="size-full transition duration-[var(--dur-slow)] group-hover:scale-105" fallback={<GuildBannerArt guild={guild} className="absolute inset-0 size-full" />} />
          <span className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-guild)_30%,transparent),var(--color-surface-2))]" />
        </span>
        <span className="relative -mt-5 flex items-end gap-3 px-3 pb-3">
          <span className="rounded-[34%] bg-surface-2 p-0.5">
            <GuildIcon guild={guild} info={current} size={40} />
          </span>
          <span className="min-w-0 flex-1 pb-0.5">
            <span className="font-display block truncate text-[15px] font-semibold text-ink">{current?.name ?? "JoHood"}</span>
            {current && (
              <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">
                <span className="tabular">{t("guild.members", { n: f.compact(current.members) })}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden className="size-1.5 rounded-full bg-good" />
                  <span className="tabular">{f.compact(current.online)}</span>
                </span>
              </span>
            )}
          </span>
          <span className="mb-1 grid size-7 place-items-center rounded-lg bg-surface text-ink-3 ring-1 ring-line transition group-hover:text-ink">
            <Icon name="chevronsUpDown" size={16} />
          </span>
        </span>
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-guild" />
        <span className="sr-only">{t("guild.switch")}</span>
      </button>
      <MenuPopover anchor={menu.anchor} onClose={menu.close} sections={sections} label={t("guild.switch")} width={264} />
    </>
  );
}
