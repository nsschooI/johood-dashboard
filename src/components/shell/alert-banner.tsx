"use client";

import Link from "next/link";
import { Lock, Siren } from "lucide-react";
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
    <div role="status" className="border-b border-warn/30 bg-gradient-to-r from-warn/20 via-warn/10 to-transparent">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <span className="relative grid size-7 shrink-0 place-items-center rounded-lg bg-warn/20 text-warn">
          {lockdown ? <Lock aria-hidden className="size-4" /> : <Siren aria-hidden className="size-4" />}
          <span aria-hidden className="absolute inset-0 rounded-lg needs-attention [--attention-rgb:251_191_36]" />
        </span>
        <p className="min-w-0 flex-1 font-medium text-warn">{lockdown ? t("attention.lockdownBanner") : t("attention.raidBanner")}</p>
        <Link href={href("/members", { section: "protection" })} className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-warn ring-1 ring-warn/40 transition hover:bg-warn/15">
          {t("attention.review")}
        </Link>
      </div>
    </div>
  );
}
