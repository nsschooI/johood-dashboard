"use client";

import { useId, useState } from "react";
import { Icon, type IconName } from "@/components/icons/icon";
import { useCan, useT, useWhyNot } from "@/components/providers/app-provider";
import { anchorId } from "@/lib/client/anchors";
import { useLiveEvent } from "@/components/providers/live-provider";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { TimeAgo } from "@/components/ui/time-ago";
import { api } from "@/lib/client/api";
import { useAction } from "@/lib/client/use-action";
import type { ProtectionPatch, ProtectionSettings } from "@/lib/types";

type Dangerous = "lockdown" | "raidMode";

function Row({ icon, title, hint, children, danger, id }: { icon: IconName; title: string; hint?: string; children: React.ReactNode; danger?: boolean; id?: string }) {
  return (
    <div id={id} className={cn("flex scroll-mt-24 flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-4 py-3.5 ring-1 ring-inset transition-colors duration-[var(--dur-base)]", danger ? "bg-bad/[0.08] ring-bad/35" : "bg-surface-2 ring-line")}>
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", danger ? "bg-bad text-white needs-attention dark:text-[#2a0a12]" : "bg-surface text-ink-2 ring-1 ring-line")}>
        <Icon name={icon} size={20} duo />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {hint && <p className="text-xs text-ink-3">{hint}</p>}
      </div>
      {children}
    </div>
  );
}


export function ProtectionCard({ initial }: { initial: ProtectionSettings }) {
  const t = useT();
  const can = useCan();
  const id = useId();
  const editable = can("protection.manage");
  const why = useWhyNot();
  const { pending, run } = useAction();
  const [p, setP] = useState(initial);
  const [confirm, setConfirm] = useState<{ key: Dangerous; value: boolean } | null>(null);
  useLiveEvent("protection", (e) => setP(e.data));

  const patch = async (body: ProtectionPatch & { confirm?: boolean }, key: string) => {
    // Undo restores the previous values of exactly the fields we changed.
    const previous: ProtectionPatch & { confirm?: boolean } = { confirm: true };
    for (const k of Object.keys(body) as (keyof ProtectionPatch)[]) {
      if (k === "blockedWords") previous.blockedWords = body.blockedWords!.map((b) => ({ id: b.id, enabled: !b.enabled }));
      else if (k in p) (previous as Record<string, unknown>)[k] = p[k as keyof ProtectionSettings];
    }
    const next = await run(key, () => api<ProtectionSettings>("/api/protection", { method: "PATCH", body }), t("protection.updated"), {
      undo: async () => {
        const back = await api<ProtectionSettings>("/api/protection", { method: "PATCH", body: previous });
        setP(back);
      },
    });
    if (next) setP(next);
    return next;
  };

  const label = (k: Dangerous) => (k === "lockdown" ? t("protection.lockdown") : t("protection.raidMode"));

  const numberField = (key: "raidJoinThreshold" | "minAccountAgeDays", unit: string, min: number, max: number) => (
    <div className="flex items-center gap-2">
      <Input
        key={`${key}-${p[key]}`}
        id={`${id}-${key}`}
        type="number"
        min={min}
        max={max}
        defaultValue={p[key]}
        disabled={!editable || pending !== null}
        title={why("protection.manage") ?? undefined}
        className="h-9 w-20 text-center"
        aria-label={key === "raidJoinThreshold" ? t("protection.raidThreshold") : t("protection.minAge")}
        onBlur={(e) => {
          const v = Math.round(Number(e.target.value));
          if (!Number.isFinite(v) || v === p[key]) return;
          if (v < min || v > max) {
            e.target.value = String(p[key]);
            return;
          }
          void patch({ [key]: v }, key);
        }}
      />
      <span className="w-20 text-xs text-ink-3">{unit}</span>
    </div>
  );

  return (
    <Card id="t-protection" aria-labelledby="protection-title" className="scroll-mt-24">
      <CardHeader
        id="protection-title"
        title={t("protection.title")}
        icon="safety"
        description={
          <>
            {t("protection.lastChange")} <TimeAgo at={p.updatedAt} />
          </>
        }
      />
      <div className="space-y-3 px-5 pb-5">
        {!editable && <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-3 ring-1 ring-inset ring-line">{t("protection.readOnly")}</p>}

        <Row id={anchorId("protection:lockdown")} icon="lock" title={t("protection.lockdown")} hint={t("protection.lockdownHint")} danger={p.lockdown}>
          <Switch tone="bad" label={t("protection.lockdown")} checked={p.lockdown} disabledReason={why("protection.manage")} onChange={(v) => setConfirm({ key: "lockdown", value: v })} />
        </Row>
        <Row id={anchorId("protection:raidMode")} icon="siren" title={t("protection.raidMode")} hint={t("protection.raidModeHint")} danger={p.raidMode}>
          <Switch tone="bad" label={t("protection.raidMode")} checked={p.raidMode} disabledReason={why("protection.manage")} onChange={(v) => setConfirm({ key: "raidMode", value: v })} />
        </Row>
        <Row icon="members" title={t("protection.raidThreshold")}>
          {numberField("raidJoinThreshold", t("protection.joinsPerMinute"), 2, 200)}
        </Row>
        <Row icon="calendar" title={t("protection.minAge")}>
          {numberField("minAccountAgeDays", t("protection.days"), 0, 365)}
        </Row>
        <Row icon="linkOff" title={t("protection.antiLinks")} hint={t("protection.antiLinksHint")}>
          <Switch label={t("protection.antiLinks")} checked={p.antiLinks} disabled={pending !== null} disabledReason={why("protection.manage")} onChange={(v) => patch({ antiLinks: v }, "antiLinks")} />
        </Row>

        <h3 className="font-display flex items-center gap-2 pt-3 text-sm font-semibold text-ink-2">
          <Icon name="ban" size={14} />
          {t("protection.blockedWords")}
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {p.blockedWords.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-3 ring-1 ring-inset ring-line">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{t(`protection.category.${b.category}`)}</p>
                <p className="text-[11px] text-ink-3">{t("protection.words", { n: b.words })}</p>
              </div>
              <Switch
                label={t(`protection.category.${b.category}`)}
                checked={b.enabled}
                disabled={pending !== null} disabledReason={why("protection.manage")}
                onChange={(v) => patch({ blockedWords: [{ id: b.id, enabled: v }] }, b.id)}
              />
            </li>
          ))}
        </ul>
      </div>
      <ConfirmDialog
        open={confirm !== null}
        title={confirm ? t(confirm.value ? "protection.confirmOnTitle" : "protection.confirmOffTitle", { setting: label(confirm.key) }) : ""}
        body={t("protection.confirmBody")}
        danger={confirm?.value}
        loading={pending !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          await patch({ [confirm.key]: confirm.value, confirm: true }, confirm.key);
          setConfirm(null);
        }}
      />
    </Card>
  );
}
