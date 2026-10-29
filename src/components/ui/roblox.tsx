"use client";

import { useRobloxThumb } from "@/lib/client/roblox-thumbs";
import { ItemArt } from "@/components/art/mock-art";
import { Initials } from "./avatar";
import { cn } from "./cn";
import { Img } from "./img";

/** Roblox player headshot (rounded square, like Roblox shows them). */
export function RobloxHeadshot({ userId, name, size = 32, className }: { userId?: string | null; name: string; size?: number; className?: string }) {
  const url = useRobloxThumb("users", userId);
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {url === undefined ? (
        <span aria-hidden className="skeleton size-full rounded-[28%]" />
      ) : (
        <Img src={url} sizes={`${size}px`} className="size-full rounded-[28%] bg-surface-2 ring-1 ring-line" fallback={<Initials name={name} size={size} />} />
      )}
    </span>
  );
}

/** Catalog item thumbnail; falls back to a designed glyph tile. */
export function ItemThumb({ assetId, item, size = 36, className }: { assetId?: string | null; item: string; size?: number; className?: string }) {
  const url = useRobloxThumb("assets", assetId);
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {url === undefined ? (
        <span aria-hidden className="skeleton size-full rounded-xl" />
      ) : (
        <Img
          src={url}
          itemHint={item}
          sizes={`${size}px`}
          className="size-full rounded-xl bg-surface-2 ring-1 ring-line"
          fallback={<ItemArt seed={item} item={item} className="absolute inset-0" />}
        />
      )}
    </span>
  );
}
