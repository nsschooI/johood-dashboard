"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Coins, Copy, ExternalLink, KeyRound, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApp, useCan, useFormat, useWhyNot } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { Avatar } from "@/components/ui/avatar";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/components/ui/cn";
import type { MenuSection } from "@/components/ui/menu";
import { RobloxHeadshot } from "@/components/ui/roblox";
import { Skeleton } from "@/components/ui/skeleton";
import { RankBadge } from "@/components/members/member-search";
import { api } from "@/lib/client/api";
import { useLoad } from "@/lib/client/use-load";
import type { MemberProfile, MemberRef } from "@/lib/types";

/**
 * Avatar with a hover card (name, rank, roles, Roblox link, copy ID, open
 * profile). The card loads the profile lazily for the selected server.
 */
export function PersonAvatar({ person, size = 32, ring, className }: { person: MemberRef; size?: number; ring?: string | null; className?: string }) {
  return (
    <HoverCard person={person} className={className}>
      <Avatar name={person.name} src={person.avatarUrl} size={size} ring={ring} />
    </HoverCard>
  );
}

export function HoverCard({ person, children, className }: { person: MemberRef; children: ReactNode; className?: string }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = pos !== null;
  const setOpen = (v: boolean) => {
    if (!v) return setPos(null);
    const r = anchor.current?.getBoundingClientRect();
    if (!r) return;
    const w = 288;
    const vw = document.documentElement.clientWidth;
    const rtl = getComputedStyle(anchor.current!).direction === "rtl";
    const left = Math.max(8, Math.min(rtl ? r.right - w : r.left, vw - w - 8));
    const below = r.bottom + 8;
    const top = below + 260 > window.innerHeight ? Math.max(8, r.top - 268) : below;
    setPos({ left, top });
  };
  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), 380);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 160);
  };
  return (
    <span ref={anchor} className={cn("relative inline-flex", className)} onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {open &&
        createPortal(
          <span onPointerEnter={show} onPointerLeave={hide} className="fixed z-[75]" style={{ left: pos.left, top: pos.top }}>
            <PersonCard person={person} />
          </span>,
          document.body,
        )}
    </span>
  );
}

function PersonCard({ person }: { person: MemberRef }) {
  const { t } = useApp();
  const f = useFormat();
  const can = useCan();
  const { guild, href } = useGuild();
  const key = can("members.view") && /^[\w-]+$/.test(person.discordId) ? `${guild}:${person.discordId}` : null;
  const { data, loading } = useLoad(key, (signal) => api<MemberProfile>(`/api/members/${person.discordId}?guild=${guild}`, { signal }));
  const top = data?.roles.slice(0, 4) ?? [];
  const color = top[0]?.color ?? "#b06ef2";
  return (
    <span role="tooltip" className="block w-72 overflow-hidden rounded-2xl bg-[#1a1624] text-start shadow-2xl ring-1 ring-line-strong animate-pop">
      <span aria-hidden className="block h-12" style={{ background: `linear-gradient(120deg, ${color}66, transparent 75%), radial-gradient(circle at 90% 0, #f08bd033, transparent 60%)` }} />
      <span className="-mt-7 block px-4 pb-4">
        <span className="flex items-end gap-3">
          <Avatar name={person.name} src={person.avatarUrl} size={52} ring={color} className="ring-4 ring-[#1a1624]" />
          <span className="min-w-0 flex-1 pb-1">
            <span className="block truncate font-semibold text-ink">{person.name}</span>
            <span className="flex items-center gap-1 text-[11px] text-ink-3" dir="ltr">
              <span className="truncate">{person.discordId}</span>
              <CopyButton value={person.discordId} label={t("menu.copyId")} className="size-5" />
            </span>
          </span>
        </span>
        {loading && (
          <span className="mt-3 block space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </span>
        )}
        {data && (
          <span className="mt-3 block space-y-2.5">
            <span className="flex flex-wrap items-center gap-1.5">
              <RankBadge rank={data.rank} />
              {top.map((r) => (
                <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-ink-2 ring-1 ring-inset ring-line">
                  <span aria-hidden className="size-1.5 rounded-full" style={{ background: r.color }} />
                  {r.name}
                </span>
              ))}
            </span>
            {data.roblox && (
              <span className="flex items-center gap-2 text-xs text-ink-2">
                <RobloxHeadshot userId={data.roblox.robloxId} name={data.roblox.robloxName} size={22} />
                <span dir="ltr" className="truncate">
                  {data.roblox.robloxName}
                </span>
              </span>
            )}
            {data.points !== null && (
              <span className="block text-xs text-ink-3">
                {t("points.balance")}: <span className="tabular font-medium text-ink">{f.n(data.points)}</span>
              </span>
            )}
          </span>
        )}
        {key && (
          <Link href={href("/members", { member: person.discordId })} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent-300 hover:text-accent-200">
            <ExternalLink aria-hidden className="size-3.5" />
            {t("menu.openProfile")}
          </Link>
        )}
      </span>
    </span>
  );
}

/** Actions on a person, with the ones you can't do disabled and explained. */
export function usePersonSections(person: MemberRef, opts: { onLedger?: () => void; onAdjust?: () => void } = {}): MenuSection[] {
  const { t } = useApp();
  const why = useWhyNot();
  const { href } = useGuild();
  const router = useRouter();
  const go = (path: string) => () => router.push(path);
  const adjustReason = why("points.adjust") && why("points.adjust_limited");
  return [
    {
      title: person.name,
      items: [
        { key: "profile", label: t("menu.openProfile"), icon: <UserRound />, onSelect: go(href("/members", { member: person.discordId })), disabledReason: why("members.view") },
        { key: "copy", label: t("menu.copyId"), icon: <Copy />, onSelect: () => void navigator.clipboard?.writeText(person.discordId) },
        { key: "ledger", label: t("menu.viewLedger"), icon: <BookOpen />, onSelect: opts.onLedger ?? go(href("/points", { member: person.discordId })), disabledReason: why("points.view") },
        { key: "adjust", label: t("menu.adjustPoints"), icon: <Coins />, onSelect: opts.onAdjust ?? go(href("/points", { member: person.discordId, adjust: "1" })), disabledReason: adjustReason },
        { key: "access", label: t("menu.manageAccess"), icon: <KeyRound />, onSelect: go(href("/access", { staff: person.discordId })), disabledReason: why("permissions.manage") },
      ],
    },
  ];
}
