"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import { useApp, useWhyNot } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { useSound } from "@/components/providers/sound-provider";
import { useToast } from "@/components/providers/toast-provider";
import { ConfirmDialog } from "@/components/ui/modal";
import { api } from "@/lib/client/api";
import { useAction } from "@/lib/client/use-action";
import type { AdminGiveaway } from "@/lib/giveaways/admin";

/**
 * The giveaway's picture, through the dashboard's admin-only proxy (a plain
 * <img>: the request must carry the staff session cookie).
 */
export function BannerThumb({ id, className, version }: { id: number; className?: string; version?: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  return (
    <span className={cn("relative block overflow-hidden bg-surface-2", className)}>
      {state === "loading" && <span aria-hidden className="skeleton absolute inset-0 rounded-none" />}
      {state === "error" ? (
        <span className="absolute inset-0 grid place-items-center text-ink-4">
          <Icon name="image" size={20} />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- session-authenticated route, not optimisable
        <img
          src={`/api/giveaways-admin/banner/${id}${version ? `?v=${encodeURIComponent(version)}` : ""}`}
          alt=""
          loading="lazy"
          // Already decoded before hydration (cached): onLoad won't fire again.
          ref={(node) => {
            if (node?.complete && node.naturalWidth > 0 && state === "loading") queueMicrotask(() => setState("ok"));
          }}
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-[var(--dur-base)]", state === "ok" ? "opacity-100" : "opacity-0")}
        />
      )}
    </span>
  );
}

export function GiveawayStatus({ g }: { g: Pick<AdminGiveaway, "status"> }) {
  const { t } = useApp();
  const style = g.status === "active" ? "bg-accent-500 text-white" : g.status === "ended" ? "bg-surface-3 text-ink-2" : "bg-warn/14 text-warn";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", style)}>
      {g.status === "active" && (
        <span aria-hidden className="relative flex size-1.5">
          <span className="absolute inset-0 rounded-full bg-white/80 motion-safe:animate-ping" />
          <span className="relative size-1.5 rounded-full bg-white" />
        </span>
      )}
      {t(g.status === "active" ? "ga.list.running" : g.status === "ended" ? "ga.list.ended" : "ga.list.failed")}
    </span>
  );
}

/**
 * Details / End now / Reroll for one giveaway. End and Reroll always ask
 * first; without `giveaways.manage` they stay visible but disabled with the
 * reason, exactly as the permission model decides.
 */
export function GiveawayActions({ g, onChange, compact }: { g: AdminGiveaway; onChange: (next: AdminGiveaway) => void; compact?: boolean }) {
  const { t } = useApp();
  const why = useWhyNot();
  const { href } = useGuild();
  const { pending, run, feedbackFor } = useAction();
  const toast = useToast();
  const { play } = useSound();
  const [confirm, setConfirm] = useState<"end" | "reroll" | null>(null);
  const reason = why("giveaways.manage");

  const exec = async (kind: "end" | "reroll") => {
    const res = await run(kind, () => api<{ winners: AdminGiveaway["winners"] }>(`/api/giveaways-admin/${g.id}/${kind}`, { method: "POST", body: { confirm: true } }), kind === "end" ? undefined : t("ga.confirm.rerolled"));
    setConfirm(null);
    if (!res) return;
    const next = await api<AdminGiveaway>(`/api/giveaways-admin/${g.id}`).catch(() => null);
    if (next) onChange(next);
    if (kind === "end") {
      toast({ tone: "success", title: t("ga.confirm.ended", { n: res.winners.length }) });
      play("success");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {!compact && (
        <Link href={href(`/giveaways-admin/${g.id}`)} transitionTypes={["nav"]} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface px-2.5 text-xs font-semibold text-ink ring-1 ring-inset ring-line-strong transition hover:bg-surface-2 active:scale-95">
          {t("ga.list.details")}
          <Icon name="chevronRight" size={14} mirror />
        </Link>
      )}
      {g.status === "active" ? (
        <Button size="sm" variant="secondary" className="text-bad!" disabledReason={reason} loading={pending === "end"} feedback={feedbackFor("end")} onClick={() => setConfirm("end")}>
          <Icon name="stop" size={14} />
          {t("ga.list.end")}
        </Button>
      ) : (
        <Button size="sm" variant="secondary" disabledReason={reason ?? (g.status !== "ended" ? t("ga.list.rerollEndedOnly") : null)} loading={pending === "reroll"} feedback={feedbackFor("reroll")} onClick={() => setConfirm("reroll")}>
          <Icon name="dice" size={14} />
          {t("ga.list.reroll")}
        </Button>
      )}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "end" ? t("ga.confirm.endTitle", { prize: g.prize }) : t("ga.confirm.rerollTitle", { prize: g.prize })}
        body={confirm === "end" ? t("ga.confirm.endBody") : t("ga.confirm.rerollBody")}
        confirmLabel={confirm === "end" ? t("ga.list.end") : t("ga.list.reroll")}
        danger={confirm === "end"}
        loading={pending !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && void exec(confirm)}
      />
    </div>
  );
}
