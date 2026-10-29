"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/icon";
import { useApp, useFormat, useT, useWhyNot } from "@/components/providers/app-provider";
import { useAttentionFor } from "@/components/providers/attention-provider";
import { BotTile } from "@/components/art/bot-tile";
import { ActionMenuButton, useContextMenu } from "@/components/ui/action-menu";
import { Badge, Dot, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import type { MenuSection } from "@/components/ui/menu";
import { Sparkline } from "@/components/ui/sparkline";
import { Since, TimeAgo } from "@/components/ui/time-ago";
import { cn } from "@/components/ui/cn";
import { api } from "@/lib/client/api";
import { useBotSamples } from "@/lib/client/bot-samples";
import { useAction } from "@/lib/client/use-action";
import type { BotAction, BotState, BotStatus } from "@/lib/types";

export const STATE_TONE: Record<BotState, Tone> = { online: "good", degraded: "warn", restarting: "info", offline: "bad", stopped: "neutral" };

export function BotStateBadge({ state }: { state: BotState }) {
  const t = useT();
  return (
    <Badge tone={STATE_TONE[state]} icon={<Dot tone={STATE_TONE[state]} pulse={state === "online" || state === "restarting"} />}>
      {t(`bot.state.${state}`)}
    </Badge>
  );
}

/**
 * Everything you can do to a bot: run an action (with confirm + undo for
 * stop), the menu sections (allowed and disallowed-with-reason), and the
 * confirm dialog element to render.
 */
export function useBotActions(bot: BotStatus, onLogs?: () => void) {
  const { t } = useApp();
  const why = useWhyNot();
  const { pending, run, feedbackFor } = useAction();
  const [confirm, setConfirm] = useState<BotAction | null>(null);
  const up = bot.state === "online" || bot.state === "degraded";
  const name = bot.displayName;

  const exec = async (action: BotAction) => {
    await run(
      action,
      () => api(`/api/bots/${bot.name}/${action}`, { method: "POST", body: { confirm: action === "stop" } }),
      t(action === "stop" ? "bot.stopped" : action === "start" ? "bot.started" : "bot.restarted", { bot: name }),
      action === "stop" ? { undo: () => api(`/api/bots/${bot.name}/start`, { method: "POST", body: {} }) } : undefined,
    );
    setConfirm(null);
  };

  const sections: MenuSection[] = [
    {
      title: name,
      items: [
        { key: "restart", label: t("bot.restart"), icon: <Icon name="restart" size={18} />, onSelect: () => setConfirm("restart"), disabledReason: why("bots.restart") ?? (up ? null : t("bot.state.stopped")) },
        up
          ? { key: "stop", label: t("bot.stop"), icon: <Icon name="stop" size={18} />, danger: true, onSelect: () => setConfirm("stop"), disabledReason: why("bots.stop") }
          : { key: "start", label: t("bot.start"), icon: <Icon name="play" size={18} />, onSelect: () => void exec("start"), disabledReason: why("bots.stop") },
        { key: "logs", label: t("bot.logs"), icon: <Icon name="file" size={18} />, onSelect: onLogs, disabledReason: why("bots.logs") ?? (onLogs ? null : t("menu.notAvailable")) },
        { key: "copy", label: "pm2: " + bot.name, icon: <Icon name="copy" size={18} />, onSelect: () => void navigator.clipboard?.writeText(bot.name) },
      ],
    },
  ];

  const dialog = (
    <ConfirmDialog
      open={confirm !== null}
      title={t(confirm === "stop" ? "bot.confirmStopTitle" : "bot.confirmRestartTitle", { bot: name })}
      body={t(confirm === "stop" ? "bot.confirmStopBody" : "bot.confirmRestartBody", { bot: name })}
      confirmLabel={t(confirm === "stop" ? "bot.stop" : "bot.restart")}
      danger={confirm === "stop"}
      loading={pending !== null}
      onCancel={() => setConfirm(null)}
      onConfirm={() => confirm && exec(confirm)}
    />
  );

  return { up, pending, feedbackFor, setConfirm, exec, sections, dialog, why };
}

/** Restart / Stop / Start buttons. Visible to everyone who sees the bot; disabled ones explain why. */
export function BotControls({ bot, onLogs, compact }: { bot: BotStatus; onLogs?: () => void; compact?: boolean }) {
  const a = useBotActions(bot, onLogs);
  return (
    <>
      <BotControlsView bot={bot} a={a} onLogs={onLogs} compact={compact} />
      {a.dialog}
    </>
  );
}

export function BotControlsView({ bot, a, onLogs, compact }: { bot: BotStatus; a: ReturnType<typeof useBotActions>; onLogs?: () => void; compact?: boolean }) {
  const t = useT();
  const attention = useAttentionFor(`bot:${bot.name}`);
  const restartAttention = attention === "critical" || attention === "warning" ? attention : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {!compact && onLogs && (
        <Button size="sm" variant="ghost" onClick={onLogs} disabledReason={a.why("bots.logs")}>
          <Icon name="file" size={14} />
          {t("bot.logs")}
        </Button>
      )}
      {a.up ? (
        <>
          <Button
            size="sm"
            onClick={() => a.setConfirm("restart")}
            loading={a.pending === "restart"}
            disabledReason={a.why("bots.restart")}
            feedback={a.feedbackFor("restart")}
            attention={restartAttention}
            tip={compact ? t("bot.restart") : undefined}
            aria-label={t("bot.restart")}
          >
            <Icon name="restart" size={14} />
            {!compact && t("bot.restart")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="text-bad!"
            onClick={() => a.setConfirm("stop")}
            loading={a.pending === "stop"}
            disabledReason={a.why("bots.stop")}
            feedback={a.feedbackFor("stop")}
            tip={compact ? t("bot.stop") : undefined}
            aria-label={t("bot.stop")}
          >
            <Icon name="stop" size={14} />
            {!compact && t("bot.stop")}
          </Button>
        </>
      ) : (
        bot.state !== "restarting" && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => a.exec("start")}
            loading={a.pending === "start"}
            disabledReason={a.why("bots.stop")}
            feedback={a.feedbackFor("start")}
            attention={restartAttention}
          >
            <Icon name="play" size={14} />
            {t("bot.start")}
          </Button>
        )
      )}
    </div>
  );
}

export function BotCard({ bot, onLogs }: { bot: BotStatus; onLogs: () => void }) {
  const t = useT();
  const f = useFormat();
  const up = bot.state === "online" || bot.state === "degraded";
  const samples = useBotSamples(bot.name);
  const attention = useAttentionFor(`bot:${bot.name}`);
  const a = useBotActions(bot, onLogs);
  const ctx = useContextMenu(bot.displayName, a.sections);
  const memPct = bot.memoryLimitMb ? Math.round((bot.memoryMb / bot.memoryLimitMb) * 100) : 0;

  return (
    <article
      id={`t-bot-${bot.name}`}
      onContextMenu={ctx.onContextMenu}
      className={cn(
        "glass lift relative flex scroll-mt-24 flex-col gap-4 overflow-hidden rounded-[var(--radius-card)] p-5",
        attention === "critical" && "border-bad/50 ring-2 ring-bad/25",
        attention === "warning" && "border-warn/45",
      )}
      aria-label={bot.displayName}
    >
      {attention && <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", attention === "critical" ? "bg-bad" : "bg-warn")} />}
      <div className="flex items-start gap-3">
        <BotTile name={bot.name} avatarUrl={bot.avatarUrl} size={48} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display truncate text-base font-semibold">{bot.displayName}</h3>
          <p className="mt-0.5 font-mono text-[11px] text-ink-3 rtl:text-right" dir="ltr">
            {bot.name} · v{bot.version}
          </p>
        </div>
        <BotStateBadge state={bot.state} />
        <ActionMenuButton label={bot.displayName} sections={a.sections} />
      </div>

      <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-3 text-xs">
        <div>
          <dt className="text-ink-3">{t("bot.uptime")}</dt>
          <dd className="font-display tabular mt-0.5 text-sm font-semibold text-ink">{bot.startedAt && up ? <Since from={bot.startedAt} /> : "—"}</dd>
        </div>
        <div>
          <dt className="text-ink-3">{t("bot.restarts")}</dt>
          <dd className={cn("font-display tabular mt-0.5 text-sm font-semibold", bot.restarts24h > 2 ? "text-warn" : "text-ink")}>{f.n(bot.restarts24h)}</dd>
        </div>
        <div>
          <dt className="text-ink-3">{t("bot.ping")}</dt>
          <dd className="font-display tabular mt-0.5 text-sm font-semibold text-ink">{bot.pingMs !== null ? `${bot.pingMs} ms` : "—"}</dd>
        </div>
      </dl>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl px-1 pt-1">
          <p className="flex justify-between text-[11px] text-ink-3">
            <span>{t("bot.memory")}</span>
            <span className={cn("tabular", memPct > 85 ? "text-bad" : memPct > 65 ? "text-warn" : "text-ink-2")}>{up ? `${f.n(bot.memoryMb)} MB` : "—"}</span>
          </p>
          <Sparkline values={samples.mem} max={bot.memoryLimitMb} label={t("bot.memTrend")} color={memPct > 85 ? "var(--color-bad)" : "var(--color-series-1)"} />
        </div>
        <div className="rounded-xl px-1 pt-1">
          <p className="flex justify-between text-[11px] text-ink-3">
            <span>{t("bot.cpu")}</span>
            <span className="tabular text-ink-2">{up ? `${bot.cpuPct}%` : "—"}</span>
          </p>
          <Sparkline values={samples.cpu} label={t("bot.cpuTrend")} color="var(--color-series-2)" />
        </div>
      </div>

      <div className={cn("min-h-9 rounded-xl px-3 py-2 text-xs", bot.lastError ? "bg-bad/[0.07]" : "bg-surface-2")}>
        {bot.lastError ? (
          <div className="flex items-start gap-2">
            <Icon name="alert" size={14} className="mt-px shrink-0 text-bad" />
            <div className="min-w-0">
              <p className="truncate font-mono text-ink-2 rtl:text-right" dir="ltr" title={bot.lastError.message}>
                {bot.lastError.message}
              </p>
              <p className="mt-0.5 text-ink-3">
                {t("bot.lastError")} · <TimeAgo at={bot.lastError.at} />
              </p>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-ink-3">
            <Icon name="success" size={14} className="text-good" />
            {t("bot.noErrors")}
          </p>
        )}
      </div>

      <div className="mt-auto">
        <BotControlsView bot={bot} a={a} onLogs={onLogs} />
      </div>
      {a.dialog}
      {ctx.popover}
    </article>
  );
}
