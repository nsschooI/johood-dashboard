"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { ServerChip } from "@/components/shell/server-chip";
import { useHashFocus } from "@/lib/client/anchors";
import type { RoleInfo } from "@/lib/types";
import { MembersPanel } from "./member-profile";
import { RolesCard } from "./ranks-roles";
import type { StaffRow } from "@/components/access/access-view";

export interface MembersData {
  /** False when the viewer can't see the directory (staff list only). */
  directory: boolean;
  counts: { members: number | null; linked: number | null; staff: number | null };
  roles: RoleInfo[] | null;
  staff: StaffRow[] | null;
}

type Tab = "directory" | "roles";

/** Staff and their access live on the Access page; this links there with their faces. */
function StaffLink({ staff }: { staff: StaffRow[] }) {
  const { t } = useApp();
  const { href } = useGuild();
  return (
    <Link href={href("/access")} transitionTypes={["nav"]} className="glass lift group inline-flex items-center gap-3 rounded-2xl py-2 ps-2 pe-3">
      <span className="flex -space-x-2 rtl:space-x-reverse">
        {staff.slice(0, 4).map((s) => (
          <Avatar key={s.discordId} name={s.name} src={s.avatarUrl} size={28} className="rounded-full ring-2 ring-surface" />
        ))}
      </span>
      <span className="text-start leading-tight">
        <span className="block text-sm font-semibold">{t("people.staffTitle")}</span>
        <span className="block text-[11px] text-ink-3">{t("people.staffHint", { n: staff.length })}</span>
      </span>
      <Icon name="arrowRight" size={16} mirror className="text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}

function Counts({ counts }: { counts: MembersData["counts"] }) {
  const { t } = useApp();
  const f = useFormat();
  const items = [
    counts.members !== null && { icon: "members" as const, text: t("dir.counts.members", { n: f.n(counts.members) }) },
    counts.linked !== null && { icon: "link" as const, text: t("dir.counts.linked", { n: f.n(counts.linked) }) },
    counts.staff !== null && { icon: "shield" as const, text: t("dir.counts.staff", { n: f.n(counts.staff) }) },
  ].filter(Boolean) as { icon: "members" | "link" | "shield"; text: string }[];
  if (!items.length) return null;
  return (
    <p className="mb-4 flex flex-wrap gap-2 text-xs font-medium text-ink-2">
      {items.map((i) => (
        <span key={i.icon} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 shadow-[var(--shadow-glass)] ring-1 ring-line">
          <Icon name={i.icon} size={14} className="text-accent-400" />
          <span className="tabular">{i.text}</span>
        </span>
      ))}
    </p>
  );
}

export function MembersView({ data }: { data: MembersData }) {
  const { t } = useApp();
  const { info, guild } = useGuild();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = (params.get("tab") === "roles" && data.roles) || !data.directory ? "roles" : "directory";
  useHashFocus();
  const setTab = (v: Tab) => {
    const next = new URLSearchParams(params.toString());
    if (v === "directory") next.delete("tab");
    else next.set("tab", v);
    next.delete("member");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  return (
    <>
      <PageHeader
        eyebrow={<ServerChip />}
        title={t("nav.members")}
        subtitle={t("dir.subtitle", { server: info(guild)?.name ?? "" })}
        actions={data.staff && <StaffLink staff={data.staff} />}
      />
      <Counts counts={data.counts} />
      {data.directory && data.roles && (
        <div className="mb-5">
          <Segmented
            label={t("nav.members")}
            value={tab}
            onChange={setTab}
            options={[
              { value: "directory" as Tab, label: t("dir.title"), icon: <Icon name="members" size={16} /> },
              { value: "roles" as Tab, label: t("dir.rolesTab"), icon: <Icon name="shield" size={16} /> },
            ]}
          />
        </div>
      )}
      {tab === "directory" && data.directory && <MembersPanel />}
      {tab === "roles" && data.roles && (
        <div className="max-w-3xl space-y-3">
          <RolesCard roles={data.roles} />
          <p className="flex items-center gap-2 px-1 text-xs text-ink-3">
            <Icon name="info" size={14} />
            {t("dir.levelsMoved")}
          </p>
        </div>
      )}
    </>
  );
}
