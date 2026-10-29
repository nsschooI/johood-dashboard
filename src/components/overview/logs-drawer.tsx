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
import { useLoad } from "@/lib/client/use-load";
import type { BotLogLine, BotStatus, LogLevel } from "@/lib/types";

const LEVEL_CLASS: Record<LogLevel, string> = {
  debug: "text-[#9b8d92]",
  info: "text-[#7dd3fc]",
  warn: "text-[#fbbf24]",
  error: "text-[#fb7185]",
};
const ORDER: LogLevel[] = ["debug", "info", "warn", "error"];

export function LogsDrawer({ bot, onClose }: { bot: BotStatus | null; onClose: () => void }) {
  const t = useT();
  const f = useFormat();
  const [level, setLevel] = useState<LogLevel>("info");
  const endRef = useRef<HTMLDivElement>(null);
  const name = bot?.name;
  const url = name ? `/api/bots/${name}/logs${qs({ level, limit: 300 })}` : null;
  const { data: lines, error, reload, setData } = useLoad(url, (signal) => api<BotLogLine[]>(url!, { signal }));

  useLiveEvent("log", (e) => {
    if (e.data.bot !== name || ORDER.indexOf(e.data.level) < ORDER.indexOf(level)) return;
    setData((cur) => [...cur.slice(-399), e.data]);
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
        <ErrorState title={t("common.error")} action={<Button onClick={reload}>{t("common.retry")}</Button>} />
      ) : !lines ? (
        <div className="space-y-2">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-3.5" />
          ))}
        </div>
      ) : lines.length === 0 ? (
        <EmptyState art="quiet" title={t("bot.logsEmpty")} />
      ) : (
        <ol dir="ltr" className="space-y-0.5 rounded-2xl bg-charcoal p-3 font-mono text-[12px] leading-relaxed text-[#e9dfe2]" aria-live="polite" aria-relevant="additions">
          {lines.map((l) => (
            <li key={l.id} className="flex gap-3 rounded px-1 hover:bg-white/[0.06]">
              <span className="tabular shrink-0 text-[#9b8d92]">{f.time(l.at)}</span>
              <span className={cn("w-11 shrink-0 font-semibold", LEVEL_CLASS[l.level])}>{l.level.toUpperCase()}</span>
              <span className="break-all">{l.message}</span>
            </li>
          ))}
          <div ref={endRef} />
        </ol>
      )}
    </Modal>
  );
}
