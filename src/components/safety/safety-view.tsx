"use client";

import { useState } from "react";
import { Scene } from "@/components/art/scenes";
import { Icon } from "@/components/icons/icon";
import { ProtectionCard } from "@/components/members/protection-card";
import { useApp } from "@/components/providers/app-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { ServerChip } from "@/components/shell/server-chip";
import { PageHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { TimeAgo } from "@/components/ui/time-ago";
import { useHashFocus } from "@/lib/client/anchors";
import type { ProtectionSettings } from "@/lib/types";

export function SafetyView({ protection }: { protection: ProtectionSettings }) {
  const { t } = useApp();
  const [p, setP] = useState(protection);
  useHashFocus();
  useLiveEvent("protection", (e) => setP(e.data));
  const raised = p.lockdown || p.raidMode;
  const on = p.blockedWords.filter((b) => b.enabled).length;
  return (
    <>
      <PageHeader eyebrow={<ServerChip global />} title={t("nav.safety")} subtitle={t("safetyPage.subtitle")} />
      <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={cn("glass relative overflow-hidden rounded-[var(--radius-card)] p-6 text-center xl:sticky xl:top-20", raised && "ring-2 ring-bad/35")}>
          <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1.5", raised ? "bg-bad" : "bg-good")} />
          <Scene name={raised ? "botDown" : "safety"} className="mx-auto h-40 w-auto" />
          <p className={cn("font-display mt-2 text-xl font-bold", raised ? "text-bad" : "text-good")} role="status">
            {raised ? t("safetyPage.alert") : t("safetyPage.calm")}
          </p>
          <p className="mt-1 text-sm text-ink-3">{raised ? t("safetyPage.alertHint") : t("safetyPage.calmHint")}</p>
          <ul className="mt-5 space-y-2 text-start text-sm">
            {(
              [
                [p.lockdown, "lock", t("protection.lockdown")],
                [p.raidMode, "siren", t("protection.raidMode")],
                [p.antiLinks, "linkOff", t("protection.antiLinks")],
              ] as const
            ).map(([v, icon, label]) => (
              <li key={label} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2">
                <Icon name={icon} size={16} className="text-ink-3" />
                <span className="flex-1">{label}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", v ? (icon === "linkOff" ? "bg-good/12 text-good" : "bg-bad/12 text-bad") : "bg-surface-3 text-ink-3")}>{v ? t("common.yes") : t("common.no")}</span>
              </li>
            ))}
            <li className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2">
              <Icon name="ban" size={16} className="text-ink-3" />
              <span className="flex-1">{t("safetyPage.filtersOn", { n: on, total: p.blockedWords.length })}</span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-ink-3">
            {t("protection.lastChange")} <TimeAgo at={p.updatedAt} />
          </p>
        </aside>
        <ProtectionCard initial={p} />
      </div>
    </>
  );
}
