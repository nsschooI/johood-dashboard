"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons/icon";
import { useApp, useCan, useWhyNot } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { GuildIcon } from "@/components/shell/guild-mark";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { InfoPopover } from "@/components/ui/popover";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { Tooltip } from "@/components/ui/tooltip";
import { api, qs } from "@/lib/client/api";
import { useAction } from "@/lib/client/use-action";
import { useLoad } from "@/lib/client/use-load";
import { translateDynamic, type Translate } from "@/lib/i18n";
import { ACTIONS, ROLE_PERMISSIONS, isAction, permissionsFor, type PermissionOverrides } from "@/lib/permissions";
import { ROLES, type AccessRole, type AuditEntry, type GuildKey, type MemberAccess, type MemberRef, type Role } from "@/lib/types";
import { PersonOverrides } from "./access-view";

type Tab = "perms" | "roles" | "activity";

const OpenContext = createContext<(person: MemberRef, tab?: Tab) => void>(() => {});

/** Hosts the Manage access panel; any "Manage access" action opens it for one member. */
export function ManageAccessProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<{ person: MemberRef; tab: Tab } | null>(null);
  const value = useMemo(() => (person: MemberRef, tab: Tab = "perms") => setOpen({ person, tab }), []);
  return (
    <OpenContext.Provider value={value}>
      {children}
      {open && <ManageAccessPanel key={open.person.discordId} person={open.person} initialTab={open.tab} onClose={() => setOpen(null)} />}
    </OpenContext.Provider>
  );
}

export const useManageAccess = () => useContext(OpenContext);

/** Null when the user may open the panel; otherwise the reason to show on the disabled action. */
export function useManageAccessReason() {
  const can = useCan();
  const why = useWhyNot();
  return can("permissions.manage") || can("members.roles") ? null : why("permissions.manage");
}

function ManageAccessPanel({ person, initialTab, onClose }: { person: MemberRef; initialTab: Tab; onClose: () => void }) {
  const { t } = useApp();
  const { guild } = useGuild();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [roleGuild, setRoleGuild] = useState<GuildKey>(guild);
  const { data, error, notFound, reload, setData } = useLoad(`${roleGuild}:${person.discordId}`, (signal) =>
    api<MemberAccess>(`/api/members/${person.discordId}/access${qs({ guild: roleGuild })}`, { signal }),
  );

  return (
    <Modal
      open
      onClose={onClose}
      variant="drawer"
      className="sm:max-w-2xl"
      title={t("mx.title")}
      description={
        <span className="mt-1 flex items-center gap-2.5">
          <Avatar name={person.name} src={person.avatarUrl} size={28} />
          <bdi className="font-semibold text-ink">{person.name}</bdi>
          {data?.siteRoles.map((r) => (
            <Badge key={r} tone="accent">
              {t(`roles.${r}`)}
            </Badge>
          ))}
        </span>
      }
    >
      <div className="mb-4">
        <Segmented
          label={t("mx.title")}
          value={tab}
          onChange={setTab}
          options={[
            { value: "perms" as Tab, label: t("mx.tabs.perms"), icon: <Icon name="access" size={16} /> },
            { value: "roles" as Tab, label: t("mx.tabs.roles"), icon: <Icon name="shield" size={16} /> },
            { value: "activity" as Tab, label: t("mx.tabs.activity"), icon: <Icon name="history" size={16} /> },
          ]}
        />
      </div>
      {tab === "activity" ? (
        <ActivityTab discordId={person.discordId} />
      ) : error && !notFound ? (
        <ErrorState title={t("common.error")} action={<Button onClick={reload}>{t("common.retry")}</Button>} />
      ) : tab === "perms" ? (
        notFound ? (
          <NotInServer name={person.name} guild={roleGuild} onSwitch={setRoleGuild} />
        ) : !data ? (
          <PanelSkeleton />
        ) : (
          <PermissionsTab person={person} access={data} onSaved={(o) => setData((d) => ({ ...d, overrides: o }))} onRoles={() => setTab("roles")} />
        )
      ) : (
        <RolesTab person={person} access={data ?? null} notFound={notFound} guild={roleGuild} onGuild={setRoleGuild} onChanged={reload} />
      )}
    </Modal>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <Skeleton className="h-16 rounded-2xl" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-10 rounded-xl" />
      ))}
    </div>
  );
}

function NotInServer({ name, guild, onSwitch }: { name: string; guild: GuildKey; onSwitch: (g: GuildKey) => void }) {
  const { t } = useApp();
  const { guilds, info } = useGuild();
  const other = guilds.find((g) => g.key !== guild);
  return (
    <EmptyState
      art="search"
      title={t("mx.notInServer", { name, server: info(guild)?.name ?? "" })}
      action={
        other && (
          <Button size="sm" variant="secondary" onClick={() => onSwitch(other.key)}>
            <GuildIcon guild={other.key} info={other} size={18} />
            {t("guild.switchTo", { name: other.name })}
          </Button>
        )
      }
    />
  );
}

// ---------------------------------------------------------------------------
// 1 · Dashboard permissions
// ---------------------------------------------------------------------------

function PermissionsTab({ person, access, onSaved, onRoles }: { person: MemberRef; access: MemberAccess; onSaved: (o: PermissionOverrides) => void; onRoles: () => void }) {
  const { t } = useApp();
  const can = useCan();
  const why = useWhyNot();
  const overrides = useMemo<PermissionOverrides>(() => ({ allow: access.overrides.allow.filter(isAction), deny: access.overrides.deny.filter(isAction) }), [access.overrides]);
  const effective = permissionsFor({ roles: access.siteRoles, overrides });

  if (access.siteRoles.length === 0)
    return (
      <EmptyState
        art="locked"
        title={t("mx.noAccess", { name: person.name })}
        hint={t("mx.noAccessHint")}
        action={
          <Button size="sm" variant="secondary" onClick={onRoles}>
            <Icon name="shield" size={16} />
            {t("mx.tabs.roles")}
          </Button>
        }
      />
    );

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface-2 p-3.5 ring-1 ring-inset ring-line">
          <p className="text-[11px] font-semibold text-ink-3">{t("mx.fromRoles")}</p>
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            {access.siteRoles.map((r) => (
              <Badge key={r} tone="accent">
                {t(`roles.${r}`)}
              </Badge>
            ))}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-3.5 ring-1 ring-inset ring-line">
          <p className="text-[11px] font-semibold text-ink-3">{t("mx.effective")}</p>
          <p className="font-display tabular mt-1 text-xl font-bold">
            {effective.size} <span className="text-sm font-medium text-ink-3">/ {ACTIONS.length}</span>
          </p>
        </div>
      </div>
      <p className="text-xs text-ink-3">{t("mx.overridesHint")}</p>
      <PersonOverrides
        layout="panel"
        person={{ discordId: person.discordId, name: person.name, avatarUrl: person.avatarUrl ?? null, roles: access.siteRoles, overrides }}
        onSaved={onSaved}
        readOnlyReason={can("permissions.manage") ? null : (why("permissions.manage") ?? null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2 · Discord roles
// ---------------------------------------------------------------------------

function reasonText(t: Translate, role: AccessRole) {
  if (role.assignable) return null;
  const known = role.reason === "above_bot" || role.reason === "managed" || role.reason === "everyone";
  return known ? t(`mx.reason.${role.reason as "above_bot" | "managed" | "everyone"}`) : (role.reason ?? t("mx.reason.other"));
}

/** Which dashboard role a set of permissions equals, if any (for "same as Manager"). */
function dashboardRoleFor(perms: string[]): Role | null {
  const set = new Set(perms);
  return ROLES.find((r) => ROLE_PERMISSIONS[r].length === set.size && ROLE_PERMISSIONS[r].every((a) => set.has(a))) ?? null;
}

function RoleInfo({ role }: { role: AccessRole }) {
  const { t } = useApp();
  const same = dashboardRoleFor(role.permissions);
  const known = role.permissions.filter(isAction);
  return (
    <InfoPopover label={t("mx.roleInfo", { role: role.name })}>
      <span className="flex items-center gap-2 font-semibold text-ink">
        <span aria-hidden className="size-2.5 rounded-full" style={{ background: role.color }} />
        {role.name}
      </span>
      {known.length === 0 ? (
        <span className="mt-1.5 block">{t("mx.noDashboard")}</span>
      ) : (
        <>
          <span className="mt-1.5 block">
            {same ? t("mx.sameAs", { role: t(`roles.${same}`), n: known.length }) : t("mx.gives", { n: known.length })}
          </span>
          <span className="mt-1.5 block space-y-0.5">
            {known.slice(0, 6).map((a) => (
              <span key={a} className="flex items-start gap-1.5">
                <Icon name="check" size={12} className="mt-0.5 shrink-0 text-good" />
                {translateDynamic(t, `access.action.${a}`, undefined, a)}
              </span>
            ))}
            {known.length > 6 && <span className="block text-ink-3">{t("mx.andMore", { n: known.length - 6 })}</span>}
          </span>
        </>
      )}
      {!role.assignable && (
        <span className="mt-2 flex items-start gap-1.5 text-warn">
          <Icon name="lock" size={12} className="mt-0.5 shrink-0" />
          {reasonText(t, role)}
        </span>
      )}
    </InfoPopover>
  );
}

function RoleRow({ role, action }: { role: AccessRole; action: ReactNode }) {
  const { t } = useApp();
  return (
    <li className={cn("flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 ring-1 ring-inset ring-transparent transition hover:bg-surface-2", !role.assignable && "opacity-75")}>
      <span aria-hidden className="size-3 shrink-0 rounded-full ring-2 ring-surface" style={{ background: role.color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{role.name}</span>
        {role.permissions.length > 0 && <span className="block text-[11px] text-ink-3">{t("mx.gives", { n: role.permissions.filter(isAction).length })}</span>}
      </span>
      <RoleInfo role={role} />
      {action}
    </li>
  );
}

function RolesTab({
  person,
  access,
  notFound,
  guild,
  onGuild,
  onChanged,
}: {
  person: MemberRef;
  access: MemberAccess | null;
  notFound: boolean;
  guild: GuildKey;
  onGuild: (g: GuildKey) => void;
  onChanged: () => void;
}) {
  const { t } = useApp();
  const can = useCan();
  const why = useWhyNot();
  const { guilds } = useGuild();
  const { pending, run } = useAction();
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<{ kind: "add" | "remove"; role: AccessRole } | null>(null);
  const editReason = can("members.roles") ? null : why("members.roles");

  const held = new Set(access?.memberRoleIds ?? []);
  const sorted = [...(access?.roles ?? [])].sort((a, b) => b.position - a.position);
  const mine = sorted.filter((r) => held.has(r.id));
  const others = sorted.filter((r) => !held.has(r.id) && r.name.toLowerCase().includes(q.trim().toLowerCase()));

  const apply = async () => {
    if (!confirm) return;
    const { kind, role } = confirm;
    const res = await run(
      "role",
      () => api<{ memberRoleIds: string[] }>(`/api/members/${person.discordId}/roles${qs({ guild })}`, { method: "POST", body: { [kind]: [role.id], confirm: true } }),
      t(kind === "add" ? "mx.added" : "mx.removed", { role: role.name, name: person.name }),
    );
    setConfirm(null);
    // Dashboard roles may follow the change: reload the whole picture.
    if (res) onChanged();
  };

  const button = (role: AccessRole, kind: "add" | "remove") => {
    const reason = editReason ?? reasonText(t, role);
    return (
      <Tooltip content={reason}>
        <Button
          size="sm"
          variant={kind === "add" ? "soft" : "ghost"}
          disabled={Boolean(reason)}
          onClick={() => setConfirm({ kind, role })}
          aria-label={t(kind === "add" ? "mx.addRole" : "mx.removeRole", { role: role.name })}
          className={cn(kind === "remove" && "text-bad")}
        >
          <Icon name={kind === "add" ? "plus" : "minus"} size={16} />
          <span className="max-sm:hidden">{t(kind === "add" ? "mx.add" : "mx.remove")}</span>
        </Button>
      </Tooltip>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          size="sm"
          label={t("mx.server")}
          value={guild}
          onChange={onGuild}
          options={guilds.map((g) => ({ value: g.key, label: g.name, icon: <GuildIcon guild={g.key} info={g} size={16} /> }))}
        />
        {editReason && (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
            <Icon name="lock" size={14} />
            {editReason}
          </span>
        )}
      </div>

      {notFound ? (
        <NotInServer name={person.name} guild={guild} onSwitch={onGuild} />
      ) : !access ? (
        <PanelSkeleton />
      ) : (
        <>
          <section aria-labelledby="mx-current">
            <h3 id="mx-current" className="font-display mb-2 flex items-center gap-2 text-sm font-semibold text-ink-2">
              {t("mx.current")}
              <span className="tabular rounded-full bg-surface-3 px-1.5 text-[11px] text-ink-2">{mine.length}</span>
            </h3>
            {mine.length === 0 ? (
              <p className="rounded-xl bg-surface-2 px-3 py-3 text-sm text-ink-3">{t("mx.noRoles")}</p>
            ) : (
              <ul className="space-y-0.5">
                {mine.map((r) => (
                  <RoleRow key={r.id} role={r} action={button(r, "remove")} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="mx-add">
            <h3 id="mx-add" className="font-display mb-2 text-sm font-semibold text-ink-2">
              {t("mx.addTitle")}
            </h3>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("mx.searchRoles")} aria-label={t("mx.searchRoles")} leading={<Icon name="search" size={16} />} />
            {others.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-ink-3">{t("common.noResults")}</p>
            ) : (
              <ul className="mt-2 space-y-0.5">
                {others.map((r) => (
                  <RoleRow key={r.id} role={r} action={button(r, "add")} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm ? t(confirm.kind === "add" ? "mx.confirmAddTitle" : "mx.confirmRemoveTitle", { role: confirm.role.name, name: person.name }) : ""}
        body={confirm ? (confirm.role.permissions.length > 0 ? t(confirm.kind === "add" ? "mx.confirmAddStaff" : "mx.confirmRemoveStaff") : t("mx.confirmBody")) : ""}
        confirmLabel={confirm ? t(confirm.kind === "add" ? "mx.add" : "mx.remove") : undefined}
        danger={confirm?.kind === "remove"}
        loading={pending === "role"}
        onCancel={() => setConfirm(null)}
        onConfirm={apply}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3 · Activity
// ---------------------------------------------------------------------------

function ActivityTab({ discordId }: { discordId: string }) {
  const { t } = useApp();
  const can = useCan();
  const why = useWhyNot();
  const allowed = can("audit.view");
  const { data, error, reload } = useLoad(allowed ? `audit:${discordId}` : null, (signal) =>
    api<{ items: AuditEntry[]; nextCursor: number | null }>(`/api/members/${discordId}/audit`, { signal }),
  );
  if (!allowed) return <EmptyState art="locked" title={t("mx.noAudit")} hint={why("audit.view") ?? undefined} />;
  if (error) return <ErrorState title={t("common.error")} action={<Button onClick={reload}>{t("common.retry")}</Button>} />;
  if (!data) return <PanelSkeleton />;
  if (data.items.length === 0) return <EmptyState art="audit" title={t("mx.noActivity")} hint={t("mx.noActivityHint")} />;
  return (
    <ol className="relative ms-2 space-y-1 border-s-2 border-line ps-4">
      {data.items.map((e) => (
        <li key={e.id} className="relative rounded-xl px-2.5 py-2 transition hover:bg-surface-2">
          <span
            aria-hidden
            className={cn(
              "absolute -start-[1.4rem] top-4 size-3 rounded-full ring-4 ring-surface",
              e.outcome === "ok" ? "bg-good" : e.outcome === "not_connected" ? "bg-info" : e.outcome === "failed" ? "bg-warn" : "bg-bad",
            )}
          />
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-medium text-ink">{translateDynamic(t, `mx.log.${e.action.replace(".", "_")}`, undefined, e.action)}</span>
            {e.outcome !== "ok" && <Badge tone={e.outcome === "not_connected" ? "info" : e.outcome === "failed" ? "warn" : "bad"}>{t(`audit.outcome.${e.outcome}`)}</Badge>}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-3">
            <bdi>{e.actorName}</bdi>·<TimeAgo at={e.at} />
            {e.reason && (
              <>
                ·<span className="truncate">{e.reason}</span>
              </>
            )}
          </p>
          <Change before={e.before} after={e.after} />
        </li>
      ))}
    </ol>
  );
}

/** A one-line summary of what changed, for the entries this panel knows. */
function Change({ before, after }: { before: unknown; after: unknown }) {
  const a = (after ?? {}) as { add?: string[]; remove?: string[]; delta?: number; allow?: string[]; deny?: string[] };
  const parts: ReactNode[] = [];
  for (const r of a.add ?? []) parts.push(<span key={`+${r}`} className="text-good">+ {r}</span>);
  for (const r of a.remove ?? []) parts.push(<span key={`-${r}`} className="text-bad">− {r}</span>);
  if (typeof a.delta === "number") parts.push(<span key="delta" className={a.delta > 0 ? "text-good" : "text-bad"}>{a.delta > 0 ? `+${a.delta}` : a.delta}</span>);
  void before;
  if (!parts.length) return null;
  return <p className="tabular mt-1 flex flex-wrap gap-x-3 text-xs font-medium">{parts}</p>;
}
