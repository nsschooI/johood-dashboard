"use client";

import { useT } from "@/components/providers/app-provider";
import { useCan } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/ui/card";
import type { MemberSummary, ProtectionSettings, RankInfo, RoleInfo } from "@/lib/types";
import { AuditCard } from "./audit-card";
import { MembersPanel } from "./member-profile";
import { ProtectionCard } from "./protection-card";
import { RanksCard, RolesCard } from "./ranks-roles";
import { StaffCard, type StaffRow } from "./staff-card";

export interface MembersData {
  members: MemberSummary[] | null;
  ranks: RankInfo[] | null;
  roles: RoleInfo[] | null;
  staff: StaffRow[] | null;
  protection: ProtectionSettings | null;
}

export function MembersView({ data }: { data: MembersData }) {
  const t = useT();
  const can = useCan();
  return (
    <>
      <PageHeader title={t("members.title")} subtitle={t("members.subtitle")} />
      <div className="space-y-6">
        {data.members && <MembersPanel initial={data.members} />}
        {(data.ranks || data.roles) && (
          <div className="grid gap-6 lg:grid-cols-2">
            {data.ranks && <RanksCard ranks={data.ranks} />}
            {data.roles && <RolesCard roles={data.roles} />}
          </div>
        )}
        {(data.staff || data.protection) && (
          <div className="grid gap-6 xl:grid-cols-2">
            {data.staff && <StaffCard initial={data.staff} />}
            {data.protection && <ProtectionCard initial={data.protection} />}
          </div>
        )}
        {can("audit.view") && <AuditCard />}
      </div>
    </>
  );
}
