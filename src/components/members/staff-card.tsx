"use client";

import { useMemo, useState } from "react";
import { Check, KeyRound, Users } from "lucide-react";
import { useCan, useT } from "@/components/providers/app-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { TimeAgo } from "@/components/ui/time-ago";
import { api } from "@/lib/client/api";
import { useAction } from "@/lib/client/use-action";
import { ACTIONS, NON_GRANTABLE, ROLE_PERMISSIONS, type Action, type PermissionOverrides } from "@/lib/permissions";
import type { StaffMember } from "@/lib/types";

export type StaffRow = StaffMember & { overrides: PermissionOverrides | null };

export function StaffCard({ initial }: { initial: StaffRow[] }) {
  const t = useT();
  const can = useCan();
  const [staff, setStaff] = useState(initial);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const manage = can("permissions.manage");

  return (
    <Card aria-labelledby="staff-title" className="overflow-hidden">
      <CardHeader id="staff-title" title={t("members.staff")} icon={<Users className="size-4" aria-hidden />} />
      <ul className="divide-y divide-line">
        {staff.map((s) => {
          const extra = s.overrides ? s.overrides.allow.length + s.overrides.deny.length : 0;
          return (
            <li key={s.discordId} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <Avatar name={s.name} src={s.avatarUrl} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{s.name}</p>
                <p className="text-xs text-ink-3">
                  {t("members.lastSeen")} {s.lastSeenAt ? <TimeAgo at={s.lastSeenAt} /> : "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {s.roles.map((r) => (
                  <Badge key={r} tone={r === "owner" ? "accent" : r === "manager" ? "info" : "neutral"}>
                    {t(`roles.${r}`)}
                  </Badge>
                ))}
                {extra > 0 && <Badge tone="warn">{`${t("members.overrides")}: ${extra}`}</Badge>}
              </div>
              {manage && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                  <KeyRound aria-hidden className="size-3.5" />
                  {t("members.manage")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {editing && (
        <ManageAccess
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={(o) => {
            setStaff((list) => list.map((x) => (x.discordId === editing.discordId ? { ...x, overrides: o } : x)));
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

type Choice = "inherit" | "allow" | "deny";

function ManageAccess({ member, onClose, onSaved }: { member: StaffRow; onClose: () => void; onSaved: (o: PermissionOverrides) => void }) {
  const t = useT();
  const { pending, run } = useAction();
  const fromRole = useMemo(() => new Set(member.roles.flatMap((r) => ROLE_PERMISSIONS[r])), [member.roles]);
  const [choices, setChoices] = useState<Record<Action, Choice>>(() => {
    const out = {} as Record<Action, Choice>;
    for (const a of ACTIONS) out[a] = member.overrides?.deny.includes(a) ? "deny" : member.overrides?.allow.includes(a) ? "allow" : "inherit";
    return out;
  });
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const groups = useMemo(() => {
    const m = new Map<string, Action[]>();
    for (const a of ACTIONS) {
      const g = a.split(".")[0];
      m.set(g, [...(m.get(g) ?? []), a]);
    }
    return [...m];
  }, []);

  const next: PermissionOverrides = {
    allow: ACTIONS.filter((a) => choices[a] === "allow"),
    deny: ACTIONS.filter((a) => choices[a] === "deny"),
  };

  const save = async () => {
    const res = await run(
      "save",
      () => api(`/api/permissions/${member.discordId}`, { method: "PUT", body: { ...next, reason: reason.trim() || undefined, confirm: true } }),
      t("members.permSaved"),
    );
    setConfirming(false);
    if (res) onSaved(next);
  };

  return (
    <Modal
      open
      onClose={onClose}
      variant="drawer"
      title={t("members.manageTitle", { name: member.name })}
      description={t("members.manageHint")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => setConfirming(true)}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {groups.map(([group, actions]) => (
          <fieldset key={group}>
            <legend className="rtl:text-right mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase" dir="ltr">
              {group}
            </legend>
            <ul className="space-y-1.5">
              {actions.map((a) => (
                <li key={a} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.025] px-3 py-2 ring-1 ring-inset ring-line">
                  <code className="min-w-0 flex-1 truncate text-xs text-ink-2" dir="ltr">
                    {a}
                  </code>
                  {fromRole.has(a) && (
                    <span className="flex items-center gap-1 text-[11px] text-good" title={t("members.inherit")}>
                      <Check aria-hidden className="size-3" />
                      <span className="sr-only">{t("members.inherit")}</span>
                    </span>
                  )}
                  <Segmented
                    size="sm"
                    label={a}
                    value={choices[a]}
                    onChange={(v) => setChoices((c) => ({ ...c, [a]: v }))}
                    options={[
                      { value: "inherit", label: t("members.inherit") },
                      ...(NON_GRANTABLE.includes(a) ? [] : [{ value: "allow" as const, label: t("members.allow") }]),
                      { value: "deny", label: t("members.deny") },
                    ]}
                  />
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
        <div className="space-y-1.5">
          <label htmlFor="perm-reason" className="text-xs font-medium text-ink-2">
            {t("common.reason")}
          </label>
          <Input id="perm-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        title={t("members.confirmPermTitle", { name: member.name })}
        body={t("members.confirmPermBody")}
        danger
        loading={pending === "save"}
        onCancel={() => setConfirming(false)}
        onConfirm={save}
      />
    </Modal>
  );
}
