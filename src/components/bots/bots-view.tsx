"use client";

import { useMemo, useState } from "react";
import { Scene } from "@/components/art/scenes";
import { AssistantCard } from "@/components/overview/assistant-card";
import { BotCard } from "@/components/overview/bot-card";
import { LogsDrawer } from "@/components/overview/logs-drawer";
import { useApp } from "@/components/providers/app-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { ServerChip } from "@/components/shell/server-chip";
import { Badge, Dot } from "@/components/ui/badge";
import { PageHeader, SectionTitle } from "@/components/ui/card";
import { useHashFocus } from "@/lib/client/anchors";
import type { Assistant, BotName, BotStatus } from "@/lib/types";

/** Every bot process and the voice assistants, with their controls and logs. */
export function BotsView({ bots: initialBots, assistants: initialAssistants }: { bots: BotStatus[] | null; assistants: Assistant[] | null }) {
  const { t } = useApp();
  const [bots, setBots] = useState(initialBots);
  const [assistants, setAssistants] = useState(initialAssistants);
  const [logsFor, setLogsFor] = useState<BotName | null>(null);
  useHashFocus();
  useLiveEvent("bot", (e) => setBots((cur) => cur?.map((b) => (b.name === e.data.name ? e.data : b)) ?? cur));
  useLiveEvent("assistant", (e) => setAssistants((cur) => cur?.map((a) => (a.bot === e.data.bot ? e.data : a)) ?? cur));

  const byName = useMemo(() => new Map(bots?.map((b) => [b.name, b])), [bots]);
  const core = bots?.filter((b) => b.kind === "core") ?? [];
  const online = bots?.filter((b) => b.state === "online").length ?? 0;
  const issues = bots?.filter((b) => b.state === "offline" || b.state === "degraded" || b.state === "stopped").length ?? 0;
  const busy = assistants?.filter((a) => a.state === "busy").length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow={<ServerChip global />}
        title={t("nav.bots")}
        subtitle={t("botsPage.subtitle")}
        art={<Scene name={issues ? "botDown" : "allClear"} className="-my-2 h-28 w-auto" />}
        actions={
          bots && (
            <div className="flex flex-wrap gap-2">
              <Badge tone="good" icon={<Dot tone="good" pulse />} className="px-3 py-1 text-xs">
                {t("botsPage.summary.online", { n: online })}
              </Badge>
              {issues > 0 && (
                <Badge tone="bad" className="px-3 py-1 text-xs">
                  {t("botsPage.summary.issues", { n: issues })}
                </Badge>
              )}
              {assistants && (
                <Badge tone="accent" className="px-3 py-1 text-xs">
                  {t("botsPage.summary.busy", { n: busy })}
                </Badge>
              )}
            </div>
          )
        }
      />
      <div className="space-y-8">
        {assistants && (
          <section aria-labelledby="assistants-title" className="@container">
            <SectionTitle id="assistants-title" icon="headphones" count={assistants.length}>
              {t("botsPage.assistants")}
            </SectionTitle>
            <div className="stagger grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
              {assistants.map((a) => {
                const bot = byName.get(a.bot);
                return bot ? <AssistantCard key={a.bot} assistant={a} bot={bot} /> : null;
              })}
            </div>
          </section>
        )}
        {bots && (
          <section aria-labelledby="bots-title" className="@container">
            <SectionTitle id="bots-title" icon="bots" count={core.length}>
              {t("botsPage.core")}
            </SectionTitle>
            <div className="stagger grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
              {core.map((b) => (
                <BotCard key={b.name} bot={b} onLogs={() => setLogsFor(b.name)} />
              ))}
            </div>
            <p className="mt-3 hidden text-xs text-ink-3 lg:block">{t("botsPage.contextHint")}</p>
          </section>
        )}
      </div>
      <LogsDrawer bot={logsFor ? (byName.get(logsFor) ?? null) : null} onClose={() => setLogsFor(null)} />
    </>
  );
}
