"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { FaceArt, GuildBannerArt, GuildIconArt, ItemArt, RobloxHeadArt } from "@/components/art/mock-art";
import { isGuildKey } from "@/lib/types";
import { cn } from "./cn";

/**
 * One image primitive for every remote picture (Discord avatars, server
 * icons/banners, Roblox thumbnails). Shows a shimmer while loading, fades
 * the image in, and falls back to `fallback` on error or when there's no
 * URL. `mock:` URLs (mock provider only) render generated artwork.
 */
export function Img({
  src,
  alt = "",
  sizes,
  className,
  fallback,
  itemHint,
  priority,
}: {
  src: string | null | undefined;
  alt?: string;
  /** e.g. "40px" — the rendered width, so next/image picks the right file. */
  sizes: string;
  className?: string;
  fallback?: ReactNode;
  /** Item name, used to draw mock item thumbnails. */
  itemHint?: string;
  priority?: boolean;
}) {
  const [state, setState] = useState<{ src: string | null | undefined; status: "loading" | "ok" | "error" }>({ src, status: "loading" });
  const status = state.src === src ? state.status : "loading";
  const box = cn("relative block overflow-hidden", className);

  if (src?.startsWith("mock:")) {
    const [, kind, key = ""] = src.split(":");
    const art = "absolute inset-0 size-full";
    return (
      <span className={box} role={alt ? "img" : undefined} aria-label={alt || undefined}>
        {kind === "avatar" && <FaceArt seed={key} className={art} />}
        {kind === "headshot" && <RobloxHeadArt seed={key} className={art} />}
        {kind === "asset" && <ItemArt seed={key} item={itemHint} className={art} />}
        {kind === "guild" && isGuildKey(key) && <GuildIconArt guild={key} className={art} />}
        {kind === "banner" && isGuildKey(key) && <GuildBannerArt guild={key} className={art} />}
      </span>
    );
  }

  if (!src || status === "error") return <span className={box}>{fallback}</span>;

  return (
    <span className={box}>
      {status === "loading" && <span aria-hidden className="skeleton absolute inset-0 rounded-none" />}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover transition-opacity duration-[var(--dur-base)]", status === "ok" ? "opacity-100" : "opacity-0")}
        onLoad={() => setState({ src, status: "ok" })}
        onError={() => setState({ src, status: "error" })}
      />
    </span>
  );
}
