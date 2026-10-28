"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, KeyRound, LogIn, LogOut, ShieldOff } from "lucide-react";
import { useFormat, useT } from "@/components/providers/app-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import { ConfirmDialog } from "@/components/ui/modal";
import { authorizeHref, gwFetch, loginHref } from "@/lib/giveaways/client";
import type { Giveaway } from "@/lib/giveaways/types";
import { GiftBox } from "./art";
import { AuthorizeList } from "./authorize-list";
import { GiveawayBanner } from "./banner";
import { StatusPill } from "./giveaway-card";
import { useGw } from "./gw-provider";
import { useUrlNotices } from "./use-notices";

export function MeView({ authorized: initialAuthorized, joined }: { authorized: boolean; joined: Giveaway[] }) {
  const t = useT();
  const f = useFormat();
  const router = useRouter();
  const toast = useToast();
  const { member, csrf, play } = useGw();
  const [authorized, setAuthorized] = useState(initialAuthorized);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<"revoke" | "logout" | null>(null);
  useUrlNotices(() => setAuthorized(true));

  if (!member) {
    return (
      <div className="gw-card mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-12 text-center">
        <GiftBox tone="red" className="h-20 w-auto" />
        <h1 className="text-2xl font-extrabold">{t("gw.me.title")}</h1>
        <p className="text-sm text-ink-2">{t("gw.me.signedOut")}</p>
        <a href={loginHref("/giveaways/me")} className="gw-cta mt-2">
          <LogIn aria-hidden className="size-4 rtl:-scale-x-100" />
          {t("gw.status.login")}
        </a>
      </div>
    );
  }

  const revoke = async () => {
    setBusy("revoke");
    try {
      const res = await gwFetch<{ removed: boolean }>("/api/giveaways/revoke", { method: "POST", csrf });
      setAuthorized(false);
      setConfirm(false);
      play("tick");
      toast({ tone: res.removed ? "success" : "info", title: res.removed ? t("gw.authorize.removed") : t("gw.authorize.nothingToRemove") });
    } catch {
      play("error");
      toast({ tone: "error", title: t("gw.errors.generic") });
    } finally {
      setBusy(null);
    }
  };

  const logout = async () => {
    setBusy("logout");
    try {
      await gwFetch("/api/giveaways/logout", { method: "POST", csrf });
      router.refresh();
    } catch {
      toast({ tone: "error", title: t("gw.errors.generic") });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="gw-card flex flex-wrap items-center gap-4 p-5">
        <Avatar name={member.name} src={member.avatarUrl} size={56} className="ring-4 ring-accent-500/15 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-3">{t("gw.me.signedInAs")}</p>
          <h1 className="text-xl font-extrabold break-words">
            <bdi>{member.name}</bdi>
          </h1>
        </div>
        <button type="button" onClick={logout} disabled={busy !== null} aria-busy={busy === "logout"} className="gw-cta-soft text-sm">
          <LogOut aria-hidden className="size-4 rtl:-scale-x-100" />
          {t("gw.me.logout")}
        </button>
      </section>

      <section aria-labelledby="gw-auth" className="gw-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="gw-auth" className="text-base font-bold">
            {t("gw.me.authorization")}
          </h2>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              authorized ? "bg-good/12 text-good" : "bg-ink-3/12 text-ink-2",
            )}
          >
            {authorized ? <CheckCircle2 aria-hidden className="size-3.5" /> : <KeyRound aria-hidden className="size-3.5" />}
            {authorized ? t("gw.authorize.authorized") : t("gw.authorize.notAuthorized")}
          </span>
        </div>
        <AuthorizeList intro={authorized ? "allows" : "ask"} className="mt-4 rounded-2xl bg-[var(--gw-cream)] px-4 py-3" />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {authorized ? (
            <>
              <p className="text-sm text-ink-2">{t("gw.authorize.removable")}</p>
              <button type="button" className="gw-cta-soft text-sm" onClick={() => setConfirm(true)} disabled={busy !== null}>
                <ShieldOff aria-hidden className="size-4" />
                {t("gw.authorize.remove")}
              </button>
            </>
          ) : (
            <a href={authorizeHref("/giveaways/me")} className="gw-cta text-sm">
              <KeyRound aria-hidden className="size-4" />
              {t("gw.authorize.button")}
            </a>
          )}
        </div>
      </section>

      <section aria-labelledby="gw-joined" className="gw-card p-5">
        <h2 id="gw-joined" className="text-base font-bold">
          {t("gw.me.joined")}
        </h2>
        {joined.length > 0 ? (
          <ul className="stagger mt-3 space-y-2">
            {joined.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/giveaways/${g.id}`}
                  transitionTypes={["nav"]}
                  className={cn("group flex items-center gap-3 rounded-2xl bg-[var(--gw-cream)] p-2 pe-3 transition-transform active:scale-[0.99]", g.status === "ended" && "gw-ended")}
                >
                  <GiveawayBanner g={g} size="thumb" className="aspect-square w-12 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      <bdi>{g.prize}</bdi>
                    </p>
                    <p className="text-xs text-ink-3">{g.status === "ended" ? t("gw.endedOn", { date: f.date(g.endsAt) }) : t("gw.endsOn", { date: f.dateTime(g.endsAt) })}</p>
                  </div>
                  <StatusPill ended={g.status === "ended"} className="max-[400px]:hidden" />
                  <ChevronRight aria-hidden className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl bg-[var(--gw-cream)] px-4 py-6 text-center text-sm text-ink-3">{t("gw.me.noneJoined")}</p>
        )}
      </section>

      <ConfirmDialog
        open={confirm}
        title={t("gw.authorize.confirmTitle")}
        body={t("gw.authorize.confirmBody")}
        confirmLabel={t("gw.authorize.remove")}
        danger
        loading={busy === "revoke"}
        onConfirm={revoke}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
