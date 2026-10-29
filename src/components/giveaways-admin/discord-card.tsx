"use client";

import { BotTile } from "@/components/art/bot-tile";
import { Icon } from "@/components/icons/icon";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { cn } from "@/components/ui/cn";

/**
 * What members see in Discord: the bot's embed with the banner, prize, end
 * time, winners, requirements and the Join button. Discord's own dark
 * colours on purpose — this is a picture of Discord, not of the dashboard.
 */
export function DiscordCard({
  prize,
  endsAt,
  winners,
  host,
  requirements,
  banner,
  entries = 0,
  now,
  className,
}: {
  prize: string;
  endsAt: number;
  winners: number;
  host: string;
  requirements: string[];
  /** Image URL (object URL or default banner). */
  banner: string;
  entries?: number;
  /** "Now" for the relative end time (passed in so renders stay pure). */
  now: number;
  className?: string;
}) {
  const { t, locale } = useApp();
  const f = useFormat();
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", { numeric: "auto" });
  const diffH = (endsAt - now) / 3_600_000;
  const rel = diffH >= 48 ? rtf.format(Math.round(diffH / 24), "day") : diffH >= 1 ? rtf.format(Math.round(diffH), "hour") : rtf.format(Math.max(1, Math.round(diffH * 60)), "minute");
  return (
    <div dir="ltr" className={cn("rounded-2xl bg-[#313338] p-4 font-sans text-[#dbdee1] shadow-[var(--shadow-pop)]", className)} aria-label={t("ga.form.preview")}>
      <div className="flex gap-3">
        <BotTile name="welcome" size={40} badge={false} className="rounded-full [&_*]:rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[15px]">
            <span className="font-semibold text-white">{t("ga.discord.bot")}</span>
            <span className="rounded bg-[#5865f2] px-1 text-[10px] leading-4 font-semibold text-white">{t("ga.discord.app")}</span>
            <span className="text-xs text-[#949ba4]">{t("ga.discord.today", { time: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(now) })}</span>
          </p>
          <div className="mt-1.5 max-w-[30rem] overflow-hidden rounded-[4px] border-s-4 border-[#e11d48] bg-[#2b2d31]">
            <div className="space-y-2 p-3 pe-4">
              <p className="text-[16px] leading-snug font-bold text-white" dir="auto">
                {prize.trim() || "…"}
              </p>
              <div className="space-y-1 text-[14px] leading-snug" dir={locale === "ar" ? "rtl" : "ltr"}>
                <p>
                  <span className="font-semibold text-white">{t("ga.discord.ends")}:</span>{" "}
                  <span className="rounded bg-[#3f4248] px-1 text-[#dbdee1]">{f.dateTime(new Date(endsAt).toISOString())}</span> ({rel})
                </p>
                <p>
                  <span className="font-semibold text-white">{t("ga.discord.winners")}:</span> {winners}
                </p>
                <p>
                  <span className="font-semibold text-white">{t("ga.discord.hostedBy")}:</span> <span className="rounded bg-[#5865f2]/30 px-1 text-[#c9cdfb]">@{host}</span>
                </p>
                <div>
                  <p className="font-semibold text-white">{t("ga.discord.requirements")}:</p>
                  {requirements.length ? (
                    <ul className="mt-0.5 space-y-0.5">
                      {requirements.map((r) => (
                        <li key={r} className="flex items-center gap-1.5">
                          <Icon name="check" size={14} className="text-[#23a55a]" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[#b5bac1]">{t("ga.discord.noReq")}</p>
                  )}
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element -- object URLs and the default banner */}
              <img src={banner} alt="" className="mt-2 aspect-[16/9] w-full rounded-[4px] object-cover" />
              <p className="text-xs text-[#949ba4]">{t("ga.discord.entries", { n: entries })}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[#248046] px-3.5 text-sm font-medium text-white">
              <Icon name="giveaways" size={16} />
              {t("ga.discord.join")}
            </span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[#4e5058] px-3.5 text-sm font-medium text-white">
              {t("ga.discord.details")}
              <Icon name="external" size={14} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
