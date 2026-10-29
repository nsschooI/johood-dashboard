"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { useApp } from "@/components/providers/app-provider";
import { useAttention } from "@/components/providers/attention-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { cn } from "@/components/ui/cn";
import { TimeAgo } from "@/components/ui/time-ago";
import { NAV } from "@/components/shell/nav";
import { localParams } from "@/lib/attention";
import { anchorId, focusAnchor } from "@/lib/client/anchors";
import { translateDynamic } from "@/lib/i18n";

const STYLE = {
  critical: { icon: "alert", box: "bg-bad/[0.07] ring-bad/25 hover:bg-bad/[0.11]", icn: "bg-bad text-white dark:text-[#2a0a12]" },
  warning: { icon: "warning", box: "bg-warn/[0.08] ring-warn/25 hover:bg-warn/[0.12]", icn: "bg-warn text-white dark:text-[#2a1606]" },
  info: { icon: "info", box: "bg-info/[0.06] ring-info/20 hover:bg-info/[0.1]", icn: "bg-info text-white dark:text-[#04212b]" },
} as const;

/** "Needs attention": each item jumps to the exact control that fixes it. Renders nothing when all is clear. */
export function AttentionStrip() {
  const { t, locale } = useApp();
  const { items } = useAttention();
  const { href } = useGuild();
  const router = useRouter();
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="attention-title" className="animate-rise">
      <h2 id="attention-title" className="sr-only">
        {t("attention.title")}
      </h2>
      <ul className="stagger grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => {
          const s = STYLE[i.severity];
          const go = () => {
            const id = anchorId(i.target);
            if (focusAnchor(id)) return;
            router.push(`${href(NAV.find((n) => n.key === i.page)!.href)}#${id}`);
          };
          return (
            <li key={i.id}>
              <button type="button" onClick={go} className={cn("group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start ring-1 ring-inset transition duration-[var(--dur-fast)] active:scale-[0.99]", s.box)}>
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", s.icn, i.severity === "critical" && "needs-attention")}>
                  <Icon name={s.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{translateDynamic(t, `attention.${i.key}`, localParams(i.params, locale))}</span>
                  <span className="mt-0.5 block text-xs text-ink-3">
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
                  <span className="max-sm:sr-only">{t("attention.review")}</span>
                  <Icon name="chevronRight" size={16} mirror className="transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
