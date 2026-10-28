"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { safeImageUrl } from "@/lib/giveaways/client";
import type { Giveaway } from "@/lib/giveaways/types";
import { BannerArt } from "./art";
import { useGw } from "./gw-provider";

/**
 * Giveaway banner: the giveaway's own `bannerUrl`, else the owner's default
 * banner file (public/giveaways/banner-*.webp), else the built-in artwork
 * with the prize written over it.
 */
export function GiveawayBanner({
  g,
  size,
  className,
}: {
  g: Pick<Giveaway, "prize" | "status" | "endsAt" | "bannerUrl">;
  size: "thumb" | "card" | "hero";
  className?: string;
}) {
  const { banners } = useGw();
  const { t } = useApp();
  const f = useFormat();
  const ended = g.status === "ended";
  const src =
    safeImageUrl(g.bannerUrl) ?? (ended ? banners.ended : banners.active);
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = src && failed !== src;

  return (
    <div
      className={cn("gw-banner relative isolate overflow-hidden", className)}
    >
      {showImage ? (
        // Plain <img>: banners may come from any https host the bot uses.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(src)}
          loading={size === "hero" ? "eager" : "lazy"}
        />
      ) : (
        <>
          <BannerArt ended={ended} className="absolute inset-0" />
          {size !== "thumb" && (
            <div className="relative flex h-full flex-col items-center justify-center px-[16%] text-center sm:px-[20%] text-[#2a171c]">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-bold tracking-[0.18em] uppercase",
                  ended ? "bg-stone-500 text-white" : "bg-[#e11d48] text-white",
                  size === "hero" ? "text-xs sm:text-sm" : "text-[10px]",
                )}
              >
                {ended ? t("gw.finished") : t("gw.giveaway")}
              </span>
              {size === "hero" && (
                <>
                  <span
                    className={cn(
                      "mt-2 line-clamp-2 text-2xl leading-tight font-extrabold text-balance [text-shadow:0_1px_12px_#fffaf5,0_0_2px_#fffaf5] sm:text-4xl",
                      ended ? "text-stone-600" : "text-[#9f1239]",
                    )}
                  >
                    {g.prize}
                  </span>
                  <span className="mt-1.5 text-xs font-medium text-stone-600 sm:text-sm">
                    {f.date(g.endsAt)}
                  </span>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
