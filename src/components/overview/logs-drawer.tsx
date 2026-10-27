"use client";

import { useEffect, useRef, useState } from "react";
import { useFormat, useT } from "@/components/providers/app-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { api, qs } from "@/lib/client/api";
import type { BotLogLine, BotStatus, LogLevel } from "@/lib/types";

const LEVEL_CLASS: Record<LogLevel, string> = {
  debug: "text-ink-3",
  info: "text-info",
  warn: "text-warn",
  error: "text-bad",
};
const ORDER: LogLevel[] = ["debug", "info", "warn", "error"];

export function LogsDrawer({ bot, onClose }: { bot: BotStatus | null; onClose: () => void }) {
  const t = useT();
  const f = useFormat();
  const [level, setLevel] = useState<LogLevel>("info");
  const [lines, setLines] = useState<BotLogLine[] | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const name = bot?.name;

  useEffect(() => {
    if (!name) return;
    const ctrl = new AbortController();
    setLines(null);
    setError(false);
    api<BotLogLine[]>(`/api/bots/${name}/logs${qs({ level, limit: 300 })}`, { signal: ctrl.signal })
      .then(setLines)
      .catch((e) => !ctrl.signal.aborted && (console.error(e), setError(true)));
    return () => ctrl.abort();
  }, [name, level, reload]);

  useLiveEvent("log", (e) => {
    if (e.data.bot !== name || ORDER.indexOf(e.data.level) < ORDER.indexOf(level)) return;
    setLines((cur) => (cur ? [...cur.slice(-399), e.data] : cur));
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  return (
    <Modal
      open={bot !== null}
      onClose={onClose}
      variant="drawer"
      title={bot ? t("bot.logsTitle", { bot: bot.displayName }) : ""}
      description={
        <Segmented
          size="sm"
          label={t("bot.logs")}
          value={level}
          onChange={setLevel}
          options={ORDER.map((l) => ({ value: l, label: l.toUpperCase() }))}
        />
      }
    >
      {error ? (
        <ErrorState title={t("common.error")} action={<Button onClick={() => setReload((n) => n + 1)}>{t("common.retry")}</Button>} />
      ) : lines === null ? (
        <div className="space-y-2">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-3.5" />
          ))}
        </div>
      ) : lines.length === 0 ? (
        <EmptyState title={t("bot.logsEmpty")} />
      ) : (
        <ol dir="ltr" className="space-y-0.5 font-mono text-[12px] leading-relaxed" aria-live="polite" aria-relevant="additions">
          {lines.map((l) => (
            <li key={l.id} className="flex gap-3 rounded px-1 hover:bg-white/[0.03]">
              <span className="tabular shrink-0 text-ink-3">{f.time(l.at)}</span>
              <span className={cn("w-11 shrink-0 font-semibold", LEVEL_CLASS[l.level])}>{l.level.toUpperCase()}</span>
              <span className="break-all text-ink-2">{l.message}</span>
            </li>
          ))}
          <div ref={endRef} />
        </ol>
      )}
    </Modal>
  );
}
