"use client";

import { Img } from "@/components/ui/img";
import { cn } from "@/components/ui/cn";
import { GuildIconArt } from "@/components/art/mock-art";
import type { GuildInfo, GuildKey } from "@/lib/types";

/** Server icon (Discord), with the drawn JoHood mark as fallback. */
export function GuildIcon({ guild, info, size = 36, className }: { guild: GuildKey; info: GuildInfo | null; size?: number; className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <Img src={info?.iconUrl} alt="" sizes={`${size}px`} className="size-full rounded-[30%] ring-1 ring-line" fallback={<GuildIconArt guild={guild} className="absolute inset-0 size-full" />} />
    </span>
  );
}
