"use client";

import { useRouter } from "next/navigation";
import { AlertOctagon, AlertTriangle, CheckCircle2, ChevronRight, Info } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { useAttention } from "@/components/providers/attention-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { cn } from "@/components/ui/cn";
import { TimeAgo } from "@/components/ui/time-ago";
import { NAV } from "@/components/shell/nav";
import { anchorId, focusAnchor } from "@/lib/client/anchors";
import { translateDynamic } from "@/lib/i18n";

const STYLE = {
  critical: { icon: AlertOctagon, box: "bg-bad/[0.08] ring-bad/30 hover:bg-bad/[0.12]", icn: "bg-bad/20 text-bad" },
  warning: { icon: AlertTriangle, box: "bg-warn/[0.06] ring-warn/25 hover:bg-warn/[0.1]", icn: "bg-warn/20 text-warn" },
  info: { icon: Info, box: "bg-info/[0.05] ring-info/20 hover:bg-info/[0.09]", icn: "bg-info/15 text-info" },
} as const;

/** "Needs attention": each item jumps to the exact control that fixes it. */
export function AttentionStrip() {
  const { t } = useApp();
  const { items } = useAttention();
  const { href } = useGuild();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-good/[0.06] px-4 py-3 text-sm text-good ring-1 ring-inset ring-good/20 animate-rise">
        <CheckCircle2 aria-hidden className="size-4" />
        {t("attention.allClear")}
      </div>
    );
  }

  return (
    <section aria-labelledby="attention-title" className="animate-rise">
      <h2 id="attention-title" className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-2">
        <span className="relative flex size-2">
          <span className="absolute inset-0 rounded-full bg-bad motion-safe:animate-ping" />
          <span className="relative size-2 rounded-full bg-bad" />
        </span>
        {t("attention.title")}
        <span className="tabular rounded-full bg-white/[0.06] px-2 text-xs text-ink-3">{items.length}</span>
      </h2>
      <ul className="stagger grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => {
          const s = STYLE[i.severity];
          const Icon = s.icon;
          const go = () => {
            const id = anchorId(i.target);
            if (i.page === "overview" && focusAnchor(id)) return;
            router.push(`${href(NAV.find((n) => n.key === i.page)!.href)}#${id}`);
          };
          return (
            <li key={i.id}>
              <button type="button" onClick={go} className={cn("group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-start ring-1 ring-inset transition duration-[var(--dur-fast)] active:scale-[0.99]", s.box)}>
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", s.icn, i.severity === "critical" && "needs-attention")}>
                  <Icon aria-hidden className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{translateDynamic(t, `attention.${i.key}`, i.params)}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-3">
                    {t(`attention.${i.severity}`)}
                    {i.since && (
                      <>
                        {" · "}
                        <TimeAgo at={i.since} />
                      </>
                    )}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-ink-2 transition group-hover:text-ink">
                  {t("attention.review")}
                  <ChevronRight aria-hidden className="size-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
