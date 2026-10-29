"use client";

import { Icon } from "@/components/icons/icon";
import { useApp } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { Tooltip } from "@/components/ui/tooltip";
import { GuildIcon } from "./guild-mark";

/** Page eyebrow: which server the page shows, or "Both servers" for global data. */
export function ServerChip({ global }: { global?: boolean }) {
  const { t } = useApp();
  const { guild, current } = useGuild();
  if (global) {
    return (
      <Tooltip content={t("guild.globalHint")}>
        <span tabIndex={0} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink-2 ring-1 ring-inset ring-line">
          <Icon name="globe" size={14} className="text-info" />
          {t("shell.global")}
        </span>
      </Tooltip>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface py-1 ps-1 pe-3 text-xs font-semibold text-ink-2 ring-1 ring-inset ring-line">
      <GuildIcon guild={guild} info={current} size={20} />
      {current?.name ?? "JoHood"}
      <span aria-hidden className="size-1.5 rounded-full bg-guild" />
    </span>
  );
}
