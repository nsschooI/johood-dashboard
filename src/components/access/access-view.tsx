"use client";

import { Fragment, useId, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Scene } from "@/components/art/scenes";
import { AuditCard } from "@/components/members/audit-card";
import { Icon, type IconName } from "@/components/icons/icon";
import { ROLE_BINDINGS } from "@config/roles";
import { useApp, useT, useWhyNot } from "@/components/providers/app-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/states";
import { Tooltip } from "@/components/ui/tooltip";
import { api } from "@/lib/client/api";
import { useHashFocus } from "@/lib/client/anchors";
import { useAction } from "@/lib/client/use-action";
import { translateDynamic } from "@/lib/i18n";
import { ACTIONS, NON_GRANTABLE, ROLE_PERMISSIONS, permissionsFor, type Action, type PermissionOverrides } from "@/lib/permissions";
import { ROLES, type Role, type StaffMember } from "@/lib/types";

export type StaffRow = StaffMember & { overrides: PermissionOverrides | null };
export interface AccessData {
  staff: StaffRow[] | null;
  roles: { id: string; name: string; color: string }[];
}

const ROLE_ICON: Record<Role, IconName> = {
  owner: "crown",
  manager: "briefcase",
  dev: "code",
  head_support: "tickets",
  support: "headphones",
};
const ROLE_COLOR: Record<Role, string> = {
  owner: "#e11d48",
  manager: "#d97706",
  dev: "#2a78d6",
  head_support: "#0d9488",
  support: "#7c6f75",
};

/** Actions grouped by their prefix, in matrix order. */
function groups() {
  const m = new Map<string, Action[]>();
  for (const a of ACTIONS) {
    const g = a.split(".")[0];
    m.set(g, [...(m.get(g) ?? []), a]);
  }
  return [...m];
}

export function AccessView({ data }: { data: AccessData }) {
  const t = useT();
  const { permissions } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const canAudit = permissions.has("audit.view");
  const tab = params.get("tab") === "audit" && canAudit ? "audit" : "who";
  const setTab = (v: "who" | "audit") => {
    const next = new URLSearchParams(params.toString());
    if (v === "who") next.delete("tab");
    else next.set("tab", v);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  useHashFocus();
  const roleColor = useMemo(() => {
    const byName = new Map(data.roles.map((r) => [r.name.toLowerCase(), r.color]));
    return (label: string, role: Role) => byName.get(label.toLowerCase()) ?? ROLE_COLOR[role];
  }, [data.roles]);

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink-2 ring-1 ring-inset ring-line">
            <Icon name="access" size={14} className="text-accent-400" />
            JoHood Catalog
          </span>
        }
        title={t("access.title")}
        subtitle={t("access.subtitle")}
        art={<Scene name={tab === "audit" ? "audit" : "locked"} className="-my-2 h-28 w-auto" />}
      />
      {canAudit && (
        <div className="mb-5">
          <Segmented
            label={t("access.title")}
            value={tab}
            onChange={setTab}
            options={[
              {
                value: "who" as const,
                label: t("accessPage.tabs.who"),
                icon: <Icon name="access" size={16} />,
              },
              {
                value: "audit" as const,
                label: t("accessPage.tabs.audit"),
                icon: <Icon name="audit" size={16} />,
              },
            ]}
          />
        </div>
      )}
      {tab === "audit" ? (
        <AuditCard />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <RoleLadder staff={data.staff} roleColor={roleColor} />
            <YouPanel />
          </div>
          {permissions.has("permissions.manage") && data.staff && <OverridesEditor staff={data.staff} />}
          <Matrix />
          <Mapping roleColor={roleColor} />
        </div>
      )}
    </>
  );
}

function RoleGlyph({ role }: { role: Role }) {
  return <Icon name={ROLE_ICON[role]} size={14} className="me-1 inline align-[-2px]" style={{ color: ROLE_COLOR[role] }} />;
}

// ---------------------------------------------------------------------------

function RoleLadder({ staff, roleColor }: { staff: StaffRow[] | null; roleColor: (label: string, role: Role) => string }) {
  const t = useT();
  const { user } = useApp();
  return (
    <Card aria-labelledby="ladder-title">
      <CardHeader id="ladder-title" title={t("access.ladder")} description={t("access.ladderHint")} icon="crown" />
      <ol className="stagger relative space-y-2 px-5 pb-5">
        <span aria-hidden className="absolute inset-y-6 start-[2.6rem] w-0.5 bg-gradient-to-b from-accent-500/50 via-line to-transparent" />
        {ROLES.map((role, i) => {
          const holders = staff?.filter((s) => s.roles.includes(role)) ?? null;
          const bindings = ROLE_BINDINGS.filter((b) => b.role === role);
          const grants = ROLE_PERMISSIONS[role];
          const mine = user?.roles.includes(role);
          return (
            <li key={role} className={cn("relative rounded-2xl bg-surface-2 ring-1 ring-inset ring-line transition hover:bg-surface-2", mine && "ring-2 ring-accent-500/35")}>
              <details className="group">
                <summary className="flex list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
                  <span
                    aria-hidden
                    className="relative z-[1] grid size-10 shrink-0 place-items-center rounded-xl shadow-[0_6px_14px_-8px_var(--color-shadow-2)]"
                    style={{ background: ROLE_COLOR[role] }}
                  >
                    <Icon name={ROLE_ICON[role]} size={20} className="text-white" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[15px] font-semibold text-ink">{t(`roles.${role}`)}</span>
                      <span className="tabular text-[11px] text-ink-3">#{i + 1}</span>
                      {mine && <Badge tone="accent">{t("common.you")}</Badge>}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {bindings.map((b) => {
                        const c = roleColor(b.label, role);
                        return (
                          <span
                            key={b.discordRoleId}
                            className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-px text-[11px] font-semibold text-ink-2 ring-1 ring-line ring-inset"
                          >
                            <span aria-hidden className="size-1.5 rounded-full" style={{ background: c }} />
                            {b.label}
                          </span>
                        );
                      })}
                    </span>
                  </span>
                  <span className="hidden flex-col items-end gap-1 sm:flex">
                    {holders === null ? (
                      <span className="text-[11px] text-ink-3">—</span>
                    ) : holders.length === 0 ? (
                      <span className="text-[11px] text-ink-3">{t("access.noHolders")}</span>
                    ) : (
                      <Tooltip content={holders.map((h) => h.name).join(", ")}>
                        <span tabIndex={0} className="flex -space-x-2 rtl:space-x-reverse">
                          {holders.slice(0, 5).map((h) => (
                            <Avatar key={h.discordId} name={h.name} src={h.avatarUrl} size={26} className="rounded-full ring-2 ring-surface" />
                          ))}
                          {holders.length > 5 && (
                            <span className="tabular grid size-[26px] place-items-center rounded-full bg-surface-2 text-[10px] text-ink-2 ring-2 ring-surface">
                              +{holders.length - 5}
                            </span>
                          )}
                        </span>
                      </Tooltip>
                    )}
                    <span className="tabular text-[11px] text-ink-3">{t("access.grants", { n: grants.length })}</span>
                  </span>
                  <Icon name="chevronDown" size={16} className="shrink-0 text-ink-3 transition group-open:rotate-180" />
                </summary>
                <ul className="grid gap-1 border-t border-line px-4 py-3 sm:grid-cols-2">
                  {grants.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-xs text-ink-2">
                      <Icon name="check" size={14} className="mt-0.5 shrink-0 text-good" />
                      {translateDynamic(t, `access.action.${a}`, undefined, a)}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function YouPanel() {
  const t = useT();
  const { user, permissions, overrides } = useApp();
  const why = useWhyNot();
  const [show, setShow] = useState<"can" | "cant">("can");
  const can = ACTIONS.filter((a) => permissions.has(a));
  const cant = ACTIONS.filter((a) => !permissions.has(a));
  return (
    <Card id="t-you" aria-labelledby="you-title" className="flex flex-col">
      <CardHeader id="you-title" title={t("access.you")} icon="eye" />
      <div className="flex items-center gap-3 px-5 pb-3">
        {user && <Avatar name={user.name} src={user.avatarUrl} size={40} status="online" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="mt-0.5 flex flex-wrap gap-1">
            {user?.roles.map((r) => (
              <Badge key={r} tone="accent">
                {t(`roles.${r}`)}
              </Badge>
            ))}
          </p>
        </div>
      </div>
      <div className="px-5 pb-3">
        <Segmented
          size="sm"
          label={t("access.you")}
          value={show}
          onChange={setShow}
          options={[
            { value: "can", label: t("access.youCan"), count: can.length },
            { value: "cant", label: t("access.youCant"), count: cant.length },
          ]}
        />
      </div>
      <ul className="max-h-[26rem] min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {(show === "can" ? can : cant).map((a) => (
          <li key={a} className="flex items-start gap-2.5 rounded-xl px-2 py-1.5 text-sm transition hover:bg-surface-2">
            {show === "can" ? <Icon name="check" size={16} className="mt-0.5 shrink-0 text-good" /> : <Icon name="x" size={16} className="mt-0.5 shrink-0 text-ink-3" />}
            <span className="min-w-0 flex-1">
              <span className={show === "can" ? "text-ink" : "text-ink-2"}>{translateDynamic(t, `access.action.${a}`, undefined, a)}</span>
              {show === "can" && overrides.allow.includes(a) && <span className="ms-2 text-[11px] text-warn">({t("access.fromOverride")})</span>}
              {show === "cant" && <span className="block text-[11px] text-ink-3">{why(a)}</span>}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function Matrix() {
  const t = useT();
  const { user } = useApp();
  const mine = new Set(user?.roles ?? []);
  return (
    <Card id="t-matrix" aria-labelledby="matrix-title" className="overflow-hidden">
      <CardHeader id="matrix-title" title={t("access.matrix")} description={t("access.matrixHint")} icon="listChecks" />
      <div className="overflow-x-auto pb-2">
        <table className="w-full min-w-[46rem] border-separate border-spacing-0 text-sm" aria-label={t("access.matrix")}>
          <thead>
            <tr>
              <th scope="col" className="sticky start-0 z-[2] border-b border-line bg-surface px-5 py-2 text-start text-[11px] font-medium text-ink-3">
                {t("audit.action")}
              </th>
              {ROLES.map((r) => (
                <th
                  key={r}
                  scope="col"
                  className={cn(
                    "border-b border-line px-3 py-2 text-center text-xs font-semibold whitespace-nowrap",
                    mine.has(r) ? "bg-accent-500/10 text-accent-200" : "text-ink-2",
                  )}
                >
                  <RoleGlyph role={r} />
                  {t(`roles.${r}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups().map(([g, actions]) => (
              <Fragment key={g}>
                <tr>
                  <th colSpan={ROLES.length + 1} scope="colgroup" className="sticky start-0 bg-surface-2 px-5 pt-3 pb-1.5 text-start text-[11px] font-semibold text-ink-3">
                    {translateDynamic(t, `access.group.${g}`, undefined, g)}
                  </th>
                </tr>
                {actions.map((a) => (
                  <tr key={a} className="group transition-colors hover:bg-surface-2">
                    <th scope="row" className="sticky start-0 z-[1] border-b border-line/50 bg-surface px-5 py-2 text-start font-normal group-hover:bg-[#1a1622]">
                      <span className="block text-ink">{translateDynamic(t, `access.action.${a}`, undefined, a)}</span>
                      <code className="text-[11px] text-ink-3" dir="ltr">
                        {a}
                      </code>
                    </th>
                    {ROLES.map((r) => {
                      const yes = ROLE_PERMISSIONS[r].includes(a);
                      return (
                        <td key={r} className={cn("border-b border-line/50 px-3 py-2 text-center", mine.has(r) && "bg-accent-500/[0.06]")}>
                          {yes ? (
                            <span className="inline-grid size-6 place-items-center rounded-full bg-good/15 text-good ring-1 ring-good/25">
                              <Icon name="check" size={14} aria-label={t("common.yes")} />
                            </span>
                          ) : (
                            <Icon name="minus" size={14} className="mx-auto text-ink-3/50" aria-label={t("common.no")} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function Mapping({ roleColor }: { roleColor: (label: string, role: Role) => string }) {
  const t = useT();
  return (
    <Card aria-labelledby="mapping-title">
      <CardHeader id="mapping-title" title={t("access.mapping")} description={t("access.mappingHint")} icon="link" />
      <ul className="grid gap-2 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
        {ROLE_BINDINGS.map((b) => {
          const c = roleColor(b.label, b.role);
          return (
            <li key={b.discordRoleId} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 ring-1 ring-inset ring-line">
              <span aria-hidden className="size-3 shrink-0 rounded-full ring-2 ring-surface" style={{ background: c }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {b.label}
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-ink-3" dir="ltr">
                  <span className="truncate">{b.discordRoleId}</span>
                  <CopyButton value={b.discordRoleId} className="size-5" />
                </span>
              </span>
              <span aria-hidden className="text-ink-3 rtl:-scale-x-100">
                →
              </span>
              <Badge tone="accent">{t(`roles.${b.role}`)}</Badge>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------

type Choice = "inherit" | "allow" | "deny";

function OverridesEditor({ staff: initial }: { staff: StaffRow[] }) {
  const t = useT();
  const params = useSearchParams();
  const [staff, setStaff] = useState(initial);
  const [selected, setSelected] = useState<string | null>(params.get("staff") ?? initial.find((s) => !s.roles.includes("owner"))?.discordId ?? null);
  const person = staff.find((s) => s.discordId === selected) ?? null;

  return (
    <Card id="t-overrides" aria-labelledby="overrides-title" className="scroll-mt-24">
      <CardHeader id="overrides-title" title={t("access.overrides")} description={t("access.overridesHint")} icon="access" />
      <div className="grid gap-5 px-5 pb-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <ul className="space-y-1" aria-label={t("members.staff")}>
          {staff.map((s) => {
            const n = (s.overrides?.allow.length ?? 0) + (s.overrides?.deny.length ?? 0);
            return (
              <li key={s.discordId}>
                <button
                  type="button"
                  aria-pressed={s.discordId === selected}
                  onClick={() => setSelected(s.discordId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition",
                    s.discordId === selected ? "bg-accent-500/12 ring-1 ring-inset ring-accent-400/30" : "hover:bg-surface-2",
                  )}
                >
                  <Avatar name={s.name} src={s.avatarUrl} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.name}</span>
                    <span className="block truncate text-[11px] text-ink-3">{s.roles.map((r) => t(`roles.${r}`)).join(" · ")}</span>
                  </span>
                  {n > 0 && <Badge tone="warn">{n}</Badge>}
                </button>
              </li>
            );
          })}
        </ul>
        {person ? (
          <PersonOverrides
            key={person.discordId}
            person={person}
            onSaved={(o) => setStaff((list) => list.map((x) => (x.discordId === person.discordId ? { ...x, overrides: o } : x)))}
          />
        ) : (
          <EmptyState art="people" title={t("members.pickMember")} />
        )}
      </div>
    </Card>
  );
}

export type OverridePerson = Pick<StaffRow, "discordId" | "name" | "avatarUrl" | "roles" | "overrides">;

/**
 * Grant / remove single permissions on top of someone's roles, with a diff,
 * a reason and a confirm step. Used on the Access page and in the Manage
 * access panel (`layout="panel"` stacks everything for a narrow drawer).
 */
export function PersonOverrides({
  person,
  onSaved,
  layout = "page",
  readOnlyReason = null,
}: {
  person: OverridePerson;
  onSaved: (o: PermissionOverrides) => void;
  layout?: "page" | "panel";
  readOnlyReason?: string | null;
}) {
  const t = useT();
  const reasonId = useId();
  const panel = layout === "panel";
  const { pending, run } = useAction();
  const initial = useMemo(() => person.overrides ?? { allow: [], deny: [] }, [person.overrides]);
  const start = useMemo(() => {
    const out = {} as Record<Action, Choice>;
    for (const a of ACTIONS) out[a] = initial.deny.includes(a) ? "deny" : initial.allow.includes(a) ? "allow" : "inherit";
    return out;
  }, [initial]);
  const [choices, setChoices] = useState(start);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const next: PermissionOverrides = {
    allow: ACTIONS.filter((a) => choices[a] === "allow"),
    deny: ACTIONS.filter((a) => choices[a] === "deny"),
  };
  const before = permissionsFor({ roles: person.roles, overrides: initial });
  const after = permissionsFor({ roles: person.roles, overrides: next });
  const granted = ACTIONS.filter((a) => after.has(a) && !before.has(a));
  const removed = ACTIONS.filter((a) => !after.has(a) && before.has(a));
  const changed = ACTIONS.some((a) => choices[a] !== start[a]);
  const fromRole = new Set(person.roles.flatMap((r) => ROLE_PERMISSIONS[r]));

  const save = async () => {
    const body = (o: PermissionOverrides, why?: string) => ({
      ...o,
      reason: why || undefined,
      confirm: true,
    });
    const res = await run(
      "save",
      () =>
        api(`/api/permissions/${person.discordId}`, {
          method: "PUT",
          body: body(next, reason.trim()),
        }),
      t("members.permSaved"),
      {
        undo: async () => {
          await api(`/api/permissions/${person.discordId}`, {
            method: "PUT",
            body: body(initial, t("common.undo")),
          });
          onSaved(initial);
          setChoices(start);
        },
      },
    );
    setConfirming(false);
    if (res) onSaved(next);
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className={cn("flex items-center gap-3 rounded-2xl bg-surface-2 p-3 ring-1 ring-inset ring-line", panel && "hidden")}>
        <Avatar name={person.name} src={person.avatarUrl} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{person.name}</p>
          <p className="text-xs text-ink-3">
            {t("access.effective")}: <span className="tabular text-ink-2">{after.size}</span> / {ACTIONS.length}
          </p>
        </div>
        <Icon name="members" size={16} className="text-ink-3" />
      </div>

      <div className={cn("grid gap-4", !panel && "xl:grid-cols-[minmax(0,1fr)_16rem]")}>
        <div className={cn("space-y-4", !panel && "max-h-[30rem] overflow-y-auto pe-1")}>
          {groups().map(([g, actions]) => (
            <fieldset key={g}>
              <legend className="mb-1.5 text-[11px] font-semibold text-ink-3">{translateDynamic(t, `access.group.${g}`, undefined, g)}</legend>
              <ul className="space-y-1">
                {actions.map((a) => (
                  <li
                    key={a}
                    className={cn(
                      "flex flex-wrap items-center gap-2 rounded-xl px-2.5 py-1.5 ring-1 ring-inset",
                      choices[a] !== start[a] ? "bg-accent-500/[0.07] ring-accent-400/25" : "ring-transparent",
                    )}
                  >
                    <span className="min-w-0 flex-1 text-sm text-ink-2">
                      {translateDynamic(t, `access.action.${a}`, undefined, a)}
                      {fromRole.has(a) && <Icon name="check" size={14} className="ms-1.5 inline text-good" aria-label={t("members.inherit")} />}
                    </span>
                    <Segmented
                      size="sm"
                      label={a}
                      value={choices[a]}
                      onChange={(v) => setChoices((c) => ({ ...c, [a]: v }))}
                      options={[
                        { value: "inherit", label: t("members.inherit") },
                        ...(NON_GRANTABLE.includes(a)
                          ? []
                          : [
                              {
                                value: "allow" as const,
                                label: t("members.allow"),
                              },
                            ]),
                        { value: "deny", label: t("members.deny") },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
        </div>

        <aside
          aria-label={t("access.diff")}
          className={cn("h-fit space-y-3 rounded-2xl bg-surface-2 p-4 ring-1 ring-inset ring-line", panel ? "z-10 sm:sticky sm:bottom-0 sm:shadow-[var(--shadow-pop)]" : "xl:sticky xl:top-20")}
        >
          <h4 className="text-xs font-semibold text-ink-3">{t("access.diff")}</h4>
          {!changed || (granted.length === 0 && removed.length === 0) ? (
            <p className="text-sm text-ink-3">{t("access.noChanges")}</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {granted.map((a) => (
                <li key={a} className="flex items-start gap-2 text-good">
                  <span className="tabular font-bold">+</span>
                  <span>{translateDynamic(t, `access.action.${a}`, undefined, a)}</span>
                </li>
              ))}
              {removed.map((a) => (
                <li key={a} className="flex items-start gap-2 text-bad">
                  <span className="tabular font-bold">−</span>
                  <span>{translateDynamic(t, `access.action.${a}`, undefined, a)}</span>
                </li>
              ))}
            </ul>
          )}
          <label htmlFor={reasonId} className="block pt-1 text-xs font-medium text-ink-2">
            {t("common.reason")}
          </label>
          <Input id={reasonId} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setChoices(start)} disabled={!changed}>
              {t("access.reset")}
            </Button>
            <Tooltip content={readOnlyReason} className="flex-1">
              <Button variant="primary" size="sm" className="w-full flex-1" onClick={() => setConfirming(true)} disabled={!changed || Boolean(readOnlyReason)} loading={pending === "save"}>
                {t("common.save")}
              </Button>
            </Tooltip>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirming}
        title={t("members.confirmPermTitle", { name: person.name })}
        body={t("members.confirmPermBody")}
        danger={removed.length > 0}
        loading={pending === "save"}
        onCancel={() => setConfirming(false)}
        onConfirm={save}
      >
        <ul className="space-y-1 text-sm">
          {granted.map((a) => (
            <li key={a} className="text-good">
              + {translateDynamic(t, `access.action.${a}`, undefined, a)}
            </li>
          ))}
          {removed.map((a) => (
            <li key={a} className="text-bad">
              − {translateDynamic(t, `access.action.${a}`, undefined, a)}
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </div>
  );
}
