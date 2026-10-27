"use client";

import { useState } from "react";
import { AlertCircle, FileText, Play, RotateCw, Square } from "lucide-react";
import { useCan, useFormat, useT } from "@/components/providers/app-provider";
import { Badge, Dot, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Since, TimeAgo } from "@/components/ui/time-ago";
import { cn } from "@/components/ui/cn";
import { api } from "@/lib/client/api";
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

export function MemoryBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700", pct > 85 ? "bg-bad" : pct > 65 ? "bg-warn" : "bg-accent-400")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function BotControls({ bot, onLogs, compact }: { bot: BotStatus; onLogs?: () => void; compact?: boolean }) {
  const t = useT();
  const can = useCan();
  const { pending, run } = useAction();
  const [confirm, setConfirm] = useState<BotAction | null>(null);
  const up = bot.state === "online" || bot.state === "degraded";
  const name = bot.displayName;

  const exec = async (action: BotAction) => {
    const ok = await run(
      action,
      () => api(`/api/bots/${bot.name}/${action}`, { method: "POST", body: { confirm: action === "stop" } }),
      t(action === "stop" ? "bot.stopped" : action === "start" ? "bot.started" : "bot.restarted", { bot: name }),
    );
    if (ok || action !== "stop") setConfirm(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {can("bots.logs") && onLogs && (
        <Button size="sm" variant="ghost" onClick={onLogs}>
          <FileText aria-hidden className="size-3.5" />
          {t("bot.logs")}
        </Button>
      )}
      {can("bots.restart") && up && (
        <Button size="sm" onClick={() => setConfirm("restart")} loading={pending === "restart"}>
          <RotateCw aria-hidden className="size-3.5" />
          {!compact && t("bot.restart")}
          {compact && <span className="sr-only">{t("bot.restart")}</span>}
        </Button>
      )}
      {can("bots.stop") && up && (
        <Button size="sm" variant="danger" onClick={() => setConfirm("stop")} loading={pending === "stop"}>
          <Square aria-hidden className="size-3.5" />
          {!compact && t("bot.stop")}
          {compact && <span className="sr-only">{t("bot.stop")}</span>}
        </Button>
      )}
      {can("bots.stop") && bot.state === "stopped" && (
        <Button size="sm" variant="primary" onClick={() => exec("start")} loading={pending === "start"}>
          <Play aria-hidden className="size-3.5" />
          {t("bot.start")}
        </Button>
      )}
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
    </div>
  );
}

export function BotCard({ bot, onLogs }: { bot: BotStatus; onLogs: () => void }) {
  const t = useT();
  const f = useFormat();
  const up = bot.state === "online" || bot.state === "degraded";

  return (
    <article className="glass flex flex-col gap-4 rounded-2xl p-4 transition hover:border-line-strong" aria-label={bot.displayName}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{bot.displayName}</h3>
          <p className="rtl:text-right mt-0.5 font-mono text-[11px] text-ink-3" dir="ltr">
            {bot.name} · v{bot.version}
          </p>
        </div>
        <BotStateBadge state={bot.state} />
      </div>

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-ink-3">{t("bot.uptime")}</dt>
          <dd className="tabular mt-0.5 font-medium text-ink">{bot.startedAt && up ? <Since from={bot.startedAt} /> : "—"}</dd>
        </div>
        <div>
          <dt className="text-ink-3">{t("bot.restarts")}</dt>
          <dd className={cn("tabular mt-0.5 font-medium", bot.restarts24h > 2 ? "text-warn" : "text-ink")}>{f.n(bot.restarts24h)}</dd>
        </div>
        <div>
          <dt className="text-ink-3">{t("bot.ping")}</dt>
          <dd className="tabular mt-0.5 font-medium text-ink">{bot.pingMs !== null ? `${bot.pingMs} ms` : "—"}</dd>
        </div>
      </dl>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-ink-3">{t("bot.memory")}</span>
          <span className="tabular text-ink-2" dir="ltr">
            {f.n(bot.memoryMb)} / {f.n(bot.memoryLimitMb)} MB · {bot.cpuPct}% CPU
          </span>
        </div>
        <MemoryBar used={bot.memoryMb} limit={bot.memoryLimitMb} />
      </div>

      <div className="min-h-9 rounded-xl bg-white/[0.025] px-3 py-2 text-xs ring-1 ring-inset ring-line">
        {bot.lastError ? (
          <div className="flex items-start gap-2">
            <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0 text-bad" />
            <div className="min-w-0">
              <p className="rtl:text-right truncate font-mono text-ink-2" dir="ltr" title={bot.lastError.message}>
                {bot.lastError.message}
              </p>
              <p className="mt-0.5 text-ink-3">
                {t("bot.lastError")} · <TimeAgo at={bot.lastError.at} />
              </p>
            </div>
          </div>
        ) : (
          <p className="text-ink-3">{t("bot.noErrors")}</p>
        )}
      </div>

      <div className="mt-auto">
        <BotControls bot={bot} onLogs={onLogs} />
      </div>
    </article>
  );
}
