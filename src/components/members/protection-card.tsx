"use client";

import { useId, useState } from "react";
import { Ban, Link2Off, Lock, ShieldAlert, ShieldCheck, Siren } from "lucide-react";
import { useCan, useT } from "@/components/providers/app-provider";
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

function Row({ icon, title, hint, children, danger }: { icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={cn("flex items-center gap-4 rounded-2xl px-4 py-3 ring-1 ring-inset", danger ? "bg-bad/[0.06] ring-bad/20" : "bg-white/[0.025] ring-line")}>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", danger ? "bg-bad/15 text-bad" : "bg-white/[0.05] text-ink-2")}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
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
  const { pending, run } = useAction();
  const [p, setP] = useState(initial);
  const [confirm, setConfirm] = useState<{ key: Dangerous; value: boolean } | null>(null);
  useLiveEvent("protection", (e) => setP(e.data));

  const patch = async (body: ProtectionPatch & { confirm?: boolean }, key: string) => {
    const next = await run(key, () => api<ProtectionSettings>("/api/protection", { method: "PATCH", body }), t("protection.updated"));
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
    <Card aria-labelledby="protection-title">
      <CardHeader
        id="protection-title"
        title={t("protection.title")}
        icon={<ShieldCheck className="size-4" aria-hidden />}
        description={
          <>
            {t("protection.lastChange")} <TimeAgo at={p.updatedAt} />
          </>
        }
      />
      <div className="space-y-3 px-5 pb-5">
        {!editable && <p className="rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-ink-3 ring-1 ring-inset ring-line">{t("protection.readOnly")}</p>}

        <Row icon={<Lock className="size-4" aria-hidden />} title={t("protection.lockdown")} hint={t("protection.lockdownHint")} danger={p.lockdown}>
          <Switch tone="bad" label={t("protection.lockdown")} checked={p.lockdown} disabled={!editable} onChange={(v) => setConfirm({ key: "lockdown", value: v })} />
        </Row>
        <Row icon={<Siren className="size-4" aria-hidden />} title={t("protection.raidMode")} hint={t("protection.raidModeHint")} danger={p.raidMode}>
          <Switch tone="bad" label={t("protection.raidMode")} checked={p.raidMode} disabled={!editable} onChange={(v) => setConfirm({ key: "raidMode", value: v })} />
        </Row>
        <Row icon={<ShieldAlert className="size-4" aria-hidden />} title={t("protection.raidThreshold")}>
          {numberField("raidJoinThreshold", t("protection.joinsPerMinute"), 2, 200)}
        </Row>
        <Row icon={<ShieldAlert className="size-4" aria-hidden />} title={t("protection.minAge")}>
          {numberField("minAccountAgeDays", t("protection.days"), 0, 365)}
        </Row>
        <Row icon={<Link2Off className="size-4" aria-hidden />} title={t("protection.antiLinks")} hint={t("protection.antiLinksHint")}>
          <Switch label={t("protection.antiLinks")} checked={p.antiLinks} disabled={!editable || pending !== null} onChange={(v) => patch({ antiLinks: v }, "antiLinks")} />
        </Row>

        <h3 className="flex items-center gap-2 pt-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">
          <Ban aria-hidden className="size-3.5" />
          {t("protection.blockedWords")}
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {p.blockedWords.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-xl bg-white/[0.025] px-3 py-2.5 ring-1 ring-inset ring-line">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{t(`protection.category.${b.category}`)}</p>
                <p className="text-[11px] text-ink-3">{t("protection.words", { n: b.words })}</p>
              </div>
              <Switch
                label={t(`protection.category.${b.category}`)}
                checked={b.enabled}
                disabled={!editable || pending !== null}
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
