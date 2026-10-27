"use client";

import { Headphones, LogOut, Mic2 } from "lucide-react";
import { useCan, useFormat, useT } from "@/components/providers/app-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { TimeAgo } from "@/components/ui/time-ago";
import { api } from "@/lib/client/api";
import { useAction } from "@/lib/client/use-action";
import type { Assistant, BotStatus } from "@/lib/types";
import { BotControls } from "./bot-card";

export function AssistantCard({ assistant, bot }: { assistant: Assistant; bot?: BotStatus }) {
  const t = useT();
  const f = useFormat();
  const can = useCan();
  const { pending, run } = useAction();
  const busy = assistant.state === "busy";
  const tone = busy ? "accent" : assistant.state === "free" ? "good" : "bad";

  return (
    <article
      aria-label={assistant.displayName}
      className={cn(
        "glass relative flex flex-col gap-4 overflow-hidden rounded-2xl p-4",
        busy && "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(28rem_10rem_at_0%_0%,rgb(176_110_242/0.14),transparent)] rtl:before:bg-[radial-gradient(28rem_10rem_at_100%_0%,rgb(176_110_242/0.14),transparent)]",
      )}
    >
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={cn("grid size-9 place-items-center rounded-xl ring-1", busy ? "bg-accent-500/15 text-accent-300 ring-accent-400/25" : "bg-white/[0.04] text-ink-3 ring-line")}>
            <Headphones aria-hidden className="size-[18px]" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">{assistant.displayName}</h3>
            {bot && (
              <p className="rtl:text-right tabular text-[11px] text-ink-3" dir="ltr">
                {bot.pingMs !== null ? `${bot.pingMs} ms` : "—"} · {f.n(bot.memoryMb)} MB
              </p>
            )}
          </div>
        </div>
        <Badge tone={tone} icon={<Dot tone={tone} pulse={busy} />}>
          {t(`assistant.${assistant.state}`)}
        </Badge>
      </div>

      <div className="relative min-h-[4.5rem] rounded-xl bg-white/[0.025] px-3 py-2.5 ring-1 ring-inset ring-line">
        {busy && assistant.room ? (
          <dl className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Mic2 aria-hidden className="size-3.5 shrink-0 text-accent-300" />
              <dt className="sr-only">{t("assistant.in")}</dt>
              <dd className="min-w-0 flex-1 truncate font-medium text-ink">{assistant.room.name}</dd>
              <dd className="shrink-0 text-ink-3">{t("assistant.listeners", { n: assistant.room.listeners })}</dd>
            </div>
            {assistant.calledBy && (
              <div className="flex items-center gap-2">
                <Avatar name={assistant.calledBy.name} src={assistant.calledBy.avatarUrl} size={16} />
                <dt className="sr-only">{t("assistant.calledBy")}</dt>
                <dd className="min-w-0 flex-1 truncate text-ink-2" title={`${t("assistant.calledBy")} ${assistant.calledBy.name}`}>
                  {assistant.calledBy.name}
                </dd>
                {assistant.since && (
                  <dd className="shrink-0 text-ink-3">
                    <TimeAgo at={assistant.since} />
                  </dd>
                )}
              </div>
            )}
          </dl>
        ) : (
          <p className="grid h-full place-items-center py-3 text-xs text-ink-3">{assistant.state === "offline" ? t("assistant.offline") : t("assistant.idle")}</p>
        )}
      </div>

      <div className="relative flex flex-wrap items-center gap-1.5">
        {can("assistants.control") && busy && (
          <Button
            size="sm"
            loading={pending === "disconnect"}
            onClick={() =>
              run("disconnect", () => api(`/api/assistants/${assistant.bot}/disconnect`, { method: "POST" }), t("assistant.disconnected", { bot: assistant.displayName }))
            }
          >
            <LogOut aria-hidden className="size-3.5 rtl:-scale-x-100" />
            {t("assistant.disconnect")}
          </Button>
        )}
        {bot && <BotControls bot={bot} compact />}
      </div>
    </article>
  );
}
