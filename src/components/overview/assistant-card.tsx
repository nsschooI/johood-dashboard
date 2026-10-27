"use client";

import { LogOut, Mic2, Radio } from "lucide-react";
import { useFormat, useT, useWhyNot } from "@/components/providers/app-provider";
import { useAttentionFor } from "@/components/providers/attention-provider";
import { BotTile } from "@/components/art/bot-tile";
import { PersonAvatar } from "@/components/people/person";
import { ActionMenuButton, useContextMenu } from "@/components/ui/action-menu";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Since } from "@/components/ui/time-ago";
import { api } from "@/lib/client/api";
import { useAction } from "@/lib/client/use-action";
import type { Assistant, BotStatus } from "@/lib/types";
import { BotControlsView, useBotActions } from "./bot-card";

export function AssistantCard({ assistant, bot }: { assistant: Assistant; bot: BotStatus }) {
  const t = useT();
  const f = useFormat();
  const why = useWhyNot();
  const { pending, run, feedbackFor } = useAction();
  const a = useBotActions(bot);
  const attention = useAttentionFor(`bot:${assistant.bot}`);
  const busy = assistant.state === "busy";
  const tone = busy ? "accent" : assistant.state === "free" ? "good" : "bad";

  const disconnect = () =>
    run("disconnect", () => api(`/api/assistants/${assistant.bot}/disconnect`, { method: "POST" }), t("assistant.disconnected", { bot: assistant.displayName }));

  const sections = [
    {
      ...a.sections[0],
      items: [
        { key: "disconnect", label: t("assistant.disconnect"), icon: <LogOut className="rtl:-scale-x-100" />, onSelect: () => void disconnect(), disabledReason: why("assistants.control") ?? (busy ? null : t("assistant.idle")) },
        ...a.sections[0].items,
      ],
    },
  ];
  const ctx = useContextMenu(assistant.displayName, sections);

  return (
    <article
      id={`t-bot-${assistant.bot}`}
      aria-label={assistant.displayName}
      onContextMenu={ctx.onContextMenu}
      className={cn(
        "glass lift relative flex scroll-mt-24 flex-col gap-4 overflow-hidden rounded-2xl p-4",
        busy && "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(28rem_12rem_at_0%_0%,color-mix(in_oklab,var(--color-accent-500)_16%,transparent),transparent)] rtl:before:bg-[radial-gradient(28rem_12rem_at_100%_0%,color-mix(in_oklab,var(--color-accent-500)_16%,transparent),transparent)]",
        attention && "border-warn/40",
      )}
    >
      <div className="relative flex items-center gap-3">
        <span className="relative">
          <BotTile name={assistant.bot} avatarUrl={assistant.avatarUrl ?? bot.avatarUrl} size={42} />
          {busy && (
            <span aria-hidden className="absolute -end-1 -bottom-1 grid size-5 place-items-center rounded-full bg-accent-500 text-white ring-2 ring-surface">
              <Radio className="size-3 motion-safe:animate-pulse" />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{assistant.displayName}</h3>
          <p className="tabular text-[11px] text-ink-3" dir="ltr">
            {bot.pingMs !== null ? `${bot.pingMs} ms` : "—"} · {f.n(bot.memoryMb)} MB
          </p>
        </div>
        <Badge tone={tone} icon={<Dot tone={tone} pulse={busy} />}>
          {t(`assistant.${assistant.state}`)}
        </Badge>
        <ActionMenuButton label={assistant.displayName} sections={sections} />
      </div>

      <div className="relative min-h-[5.25rem] rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-inset ring-line">
        {busy && assistant.room ? (
          <dl className="space-y-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Mic2 aria-hidden className="size-3.5 shrink-0 text-accent-300" />
              <dt className="sr-only">{t("assistant.in")}</dt>
              <dd className="min-w-0 flex-1 truncate font-medium text-ink">{assistant.room.name}</dd>
              <dd className="shrink-0 text-ink-3">{t("assistant.listeners", { n: assistant.room.listeners })}</dd>
            </div>
            {assistant.calledBy && (
              <div className="flex items-center gap-2">
                <PersonAvatar person={assistant.calledBy} size={24} />
                <dt className="sr-only">{t("assistant.calledBy")}</dt>
                <dd className="min-w-0 flex-1">
                  <span className="block text-[10px] text-ink-3">{t("assistant.calledBy")}</span>
                  <bdi className="block truncate text-ink">{assistant.calledBy.name}</bdi>
                </dd>
                {assistant.since && (
                  <dd className="tabular shrink-0 rounded-md bg-white/[0.05] px-1.5 py-0.5 text-ink-2">
                    <Since from={assistant.since} />
                  </dd>
                )}
              </div>
            )}
          </dl>
        ) : (
          <p className="grid h-full place-items-center py-4 text-xs text-ink-3">{assistant.state === "offline" ? t("assistant.offline") : t("assistant.idle")}</p>
        )}
      </div>

      <div className="relative flex flex-wrap items-center gap-1.5">
        {busy && (
          <Button size="sm" loading={pending === "disconnect"} onClick={() => void disconnect()} disabledReason={why("assistants.control")} feedback={feedbackFor("disconnect")}>
            <LogOut aria-hidden className="size-3.5 rtl:-scale-x-100" />
            {t("assistant.disconnect")}
          </Button>
        )}
        <BotControlsView bot={bot} a={a} compact />
      </div>
      {a.dialog}
      {ctx.popover}
    </article>
  );
}
