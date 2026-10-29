"use client";

import Link from "next/link";
import { useState } from "react";
import { BotTile } from "@/components/art/bot-tile";
import { Icon } from "@/components/icons/icon";
import { useApp } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { PersonAvatar } from "@/components/people/person";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Since } from "@/components/ui/time-ago";
import type { Assistant } from "@/lib/types";

/** Compact list: which voice assistant is where, called by whom, for how long. */
export function AssistantsList({ initial }: { initial: Assistant[] }) {
  const { t } = useApp();
  const { href } = useGuild();
  const [list, setList] = useState(initial);
  useLiveEvent("assistant", (e) => setList((cur) => cur.map((a) => (a.bot === e.data.bot ? e.data : a))));
  return (
    <Card aria-labelledby="as-title">
      <CardHeader
        id="as-title"
        icon="headphones"
        title={t("home.assistants.title")}
        actions={
          <Link href={href("/bots")} className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-3 transition hover:bg-surface-2 hover:text-ink">
            <Icon name="chevronRight" size={16} mirror label={t("home.bots.open")} />
          </Link>
        }
      />
      <ul className="space-y-1 px-2 pb-3">
        {list.map((a) => {
          const busy = a.state === "busy";
          return (
            <li key={a.bot} className={cn("flex items-center gap-3 rounded-xl px-3 py-2", busy && "bg-[color-mix(in_oklab,var(--color-accent-500)_6%,transparent)]")}>
              <BotTile name={a.bot} avatarUrl={a.avatarUrl} size={34} badge={false} className={cn(a.state === "offline" && "grayscale")} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{a.displayName}</p>
                <p className="truncate text-xs text-ink-3">
                  {busy && a.room ? (
                    <>
                      <Icon name="mic" size={12} className="me-1 inline align-[-2px] text-accent-400" />
                      <bdi>{a.room.name}</bdi>
                    </>
                  ) : (
                    t(`assistant.${a.state}`)
                  )}
                </p>
              </div>
              {busy && a.calledBy && <PersonAvatar person={a.calledBy} size={24} />}
              {busy && a.since ? (
                <span className="tabular rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">
                  <Since from={a.since} />
                </span>
              ) : (
                <span className={cn("size-2 rounded-full", a.state === "free" ? "bg-good" : "bg-bad")} aria-hidden />
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
