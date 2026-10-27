"use client";

import { Globe2 } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { Tooltip } from "@/components/ui/tooltip";
import { GuildIcon } from "./guild-mark";

/** Page eyebrow: which server the page shows, or "Global" for economy pages. */
export function ServerChip({ global }: { global?: boolean }) {
  const { t } = useApp();
  const { guild, current } = useGuild();
  if (global) {
    return (
      <Tooltip content={t("guild.globalHint")}>
        <span tabIndex={0} className="inline-flex items-center gap-1.5 rounded-full bg-info/10 px-2.5 py-1 text-xs font-medium text-info ring-1 ring-inset ring-info/25">
          <Globe2 aria-hidden className="size-3.5" />
          {t("guild.global")}
        </span>
      </Tooltip>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] py-1 ps-1 pe-3 text-xs font-medium text-ink-2 ring-1 ring-inset ring-line">
      <GuildIcon guild={guild} info={current} size={20} />
      {current?.name ?? "JoHood"}
    </span>
  );
}
