"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import { useCan, useT } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/card";
import { ServerChip } from "@/components/shell/server-chip";
import { useHashFocus } from "@/lib/client/anchors";
import type { MemberSummary, ProtectionSettings, RankInfo, RoleInfo } from "@/lib/types";
import { AuditCard } from "./audit-card";
import { MembersPanel } from "./member-profile";
import { ProtectionCard } from "./protection-card";
import { RanksCard, RolesCard } from "./ranks-roles";
import type { StaffRow } from "@/components/access/access-view";

export interface MembersData {
  members: MemberSummary[] | null;
  ranks: RankInfo[] | null;
  roles: RoleInfo[] | null;
  staff: StaffRow[] | null;
  protection: ProtectionSettings | null;
}

/** Staff now live on the Access page; this card links there with their faces. */
function StaffTeaser({ staff }: { staff: StaffRow[] }) {
  const t = useT();
  const { href } = useGuild();
  return (
    <Link href={href("/access")} transitionTypes={["nav"]} className="glass lift group flex items-center gap-4 rounded-[var(--radius-card)] p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-500/15 text-accent-200 ring-1 ring-accent-400/25">
        <KeyRound aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{t("members.staff")}</span>
        <span className="block text-xs text-ink-3">{t("access.subtitle")}</span>
      </span>
      <span className="hidden -space-x-2 sm:flex rtl:space-x-reverse">
        {staff.slice(0, 6).map((s) => (
          <Avatar key={s.discordId} name={s.name} src={s.avatarUrl} size={30} className="rounded-full ring-2 ring-surface" />
        ))}
      </span>
      <ArrowRight aria-hidden className="size-4 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink rtl:-scale-x-100" />
    </Link>
  );
}

export function MembersView({ data }: { data: MembersData }) {
  const t = useT();
  const can = useCan();
  const member = useSearchParams().get("member") ?? "";
  useHashFocus();
  return (
    <>
      <PageHeader eyebrow={<ServerChip />} title={t("members.title")} subtitle={t("members.subtitle")} />
      <div className="space-y-6">
        {data.members && <MembersPanel key={member} initial={data.members} />}
        {(data.ranks || data.roles) && (
          <div className="grid gap-6 xl:grid-cols-2">
            {data.ranks && <RanksCard ranks={data.ranks} />}
            {data.roles && <RolesCard roles={data.roles} />}
          </div>
        )}
        {data.protection && <ProtectionCard initial={data.protection} />}
        {data.staff && <StaffTeaser staff={data.staff} />}
        {can("audit.view") && <AuditCard />}
      </div>
    </>
  );
}
