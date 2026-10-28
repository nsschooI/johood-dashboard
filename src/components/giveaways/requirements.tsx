"use client";

import { KeyRound, Server } from "lucide-react";
import { useT } from "@/components/providers/app-provider";
import { cn } from "@/components/ui/cn";
import type { Giveaway } from "@/lib/giveaways/types";

/** Small chips: "Join JoHood Catalog", "Authorize our app". */
export function RequirementChips({ g, muted }: { g: Pick<Giveaway, "requirements">; muted?: boolean }) {
  const t = useT();
  const chip = cn(
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
    muted ? "bg-ink-3/10 text-ink-3" : "bg-accent-500/10 text-accent-300 ring-1 ring-inset ring-accent-500/15",
  );
  const { servers, authorize } = g.requirements;
  if (servers.length === 0 && !authorize) return <span className={chip}>{t("gw.req.none")}</span>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {servers.map((s) => (
        <li key={s.key} className={chip}>
          <Server aria-hidden className="size-3.5" />
          <span>{t("gw.req.server", { name: s.name })}</span>
        </li>
      ))}
      {authorize && (
        <li className={chip}>
          <KeyRound aria-hidden className="size-3.5" />
          {t("gw.req.authorize")}
        </li>
      )}
    </ul>
  );
}
