"use client";

import { ServerCog, UserRound } from "lucide-react";
import { useT } from "@/components/providers/app-provider";
import { cn } from "@/components/ui/cn";

/** What authorizing our app allows — one plain line each, no warnings. */
export function AuthorizeList({ className, intro = "ask" }: { className?: string; intro?: "ask" | "allows" }) {
  const t = useT();
  return (
    <div className={cn("text-sm", className)}>
      <p className="text-ink-3">{intro === "ask" ? t("gw.authorize.intro") : t("gw.authorize.allows")}</p>
      <ul className="mt-2 space-y-2">
        <li className="flex items-start gap-2.5">
          <UserRound aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-300" />
          <span className="text-ink-2">{t("gw.authorize.name")}</span>
        </li>
        <li className="flex items-start gap-2.5">
          <ServerCog aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-300" />
          <span className="text-ink-2">{t("gw.authorize.join")}</span>
        </li>
      </ul>
    </div>
  );
}
