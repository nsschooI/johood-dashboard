"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { useApp } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { ServerChip } from "@/components/shell/server-chip";
import { useHashFocus } from "@/lib/client/anchors";
import type { MemberSummary, RankInfo, RoleInfo } from "@/lib/types";
import { MembersPanel } from "./member-profile";
import { RanksCard, RolesCard } from "./ranks-roles";
import type { StaffRow } from "@/components/access/access-view";

export interface MembersData {
  members: MemberSummary[] | null;
  ranks: RankInfo[] | null;
  roles: RoleInfo[] | null;
  staff: StaffRow[] | null;
}

type Tab = "directory" | "ranks";

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

export function MembersView({ data }: { data: MembersData }) {
  const { t } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = params.get("tab") === "ranks" && (data.ranks || data.roles) ? "ranks" : "directory";
  useHashFocus();
  const setTab = (v: Tab) => {
    const next = new URLSearchParams(params.toString());
    if (v === "directory") next.delete("tab");
    else next.set("tab", v);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  return (
    <>
      <PageHeader eyebrow={<ServerChip />} title={t("nav.members")} subtitle={t("members.subtitle")} actions={data.staff && <StaffLink staff={data.staff} />} />
      {data.members && (data.ranks || data.roles) && (
        <div className="mb-5">
          <Segmented
            label={t("nav.members")}
            value={tab}
            onChange={setTab}
            options={[
              { value: "directory" as Tab, label: t("people.tabs.directory"), icon: <Icon name="members" size={16} /> },
              { value: "ranks" as Tab, label: t("people.tabs.ranks"), icon: <Icon name="award" size={16} /> },
            ]}
          />
        </div>
      )}
      {tab === "directory" && data.members && <MembersPanel initial={data.members} />}
      {(tab === "ranks" || !data.members) && (data.ranks || data.roles) && (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          {data.ranks && <RanksCard ranks={data.ranks} />}
          {data.roles && <RolesCard roles={data.roles} />}
        </div>
      )}
    </>
  );
}
