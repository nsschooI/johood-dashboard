"use client";

import { useEffect, useState } from "react";
import { useFormat } from "@/components/providers/app-provider";

/** Relative time that keeps itself fresh. Full timestamp on hover. */
export function TimeAgo({ at, className }: { at: string; className?: string }) {
  const f = useFormat();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(id);
  }, []);
  return (
    <time dateTime={at} title={f.dateTime(at)} className={className} suppressHydrationWarning>
      {f.relative(at, now)}
    </time>
  );
}

/** Live-updating duration since a start time (uptime). */
export function Since({ from, className }: { from: string; className?: string }) {
  const f = useFormat();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={className} suppressHydrationWarning>
      {f.duration(from, now)}
    </span>
  );
}
