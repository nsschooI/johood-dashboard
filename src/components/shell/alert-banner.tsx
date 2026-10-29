"use client";

import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import { useT } from "@/components/providers/app-provider";
import { useAttention } from "@/components/providers/attention-provider";
import { useGuild } from "@/components/providers/guild-provider";

/** Persistent banner while lockdown / raid mode is on (only for users who may see protection). */
export function AlertBanner() {
  const t = useT();
  const { lockdown, raid } = useAttention();
  const { href } = useGuild();
  if (!lockdown && !raid) return null;
  return (
    <div role="status" className="mx-4 mt-3 rounded-2xl bg-warn/12 ring-1 ring-warn/30 ring-inset sm:mx-6 lg:mx-8">
      <div className="flex items-center gap-3 px-3 py-2.5 text-sm">
        <span className="relative grid size-8 shrink-0 place-items-center rounded-xl bg-warn/20 text-warn">
          <Icon name={lockdown ? "lock" : "shield"} size={18} duo />
          <span aria-hidden className="absolute inset-0 rounded-xl needs-attention [--attention-rgb:217_119_6]" />
        </span>
        <p className="min-w-0 flex-1 font-semibold text-warn">{lockdown ? t("attention.lockdownBanner") : t("attention.raidBanner")}</p>
        <Link href={href("/safety")} className="shrink-0 rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line-strong transition hover:ring-ink-4 active:scale-95">
          {t("attention.review")}
        </Link>
      </div>
    </div>
  );
}
