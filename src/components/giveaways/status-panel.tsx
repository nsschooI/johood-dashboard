"use client";

import { useRef, useState } from "react";
import { Check, ExternalLink, KeyRound, LogIn, PartyPopper, RefreshCw, Trophy, X } from "lucide-react";
import { useApp, useT } from "@/components/providers/app-provider";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/components/ui/cn";
import { Tooltip } from "@/components/ui/tooltip";
import { authorizeHref, gwFetch, GwError, loginHref, safeHttpsUrl } from "@/lib/giveaways/client";
import type { Giveaway, JoinResult } from "@/lib/giveaways/types";
import { AuthorizeList } from "./authorize-list";
import { confetti } from "./confetti";
import { useGw } from "./gw-provider";

interface Row {
  key: string;
  label: string;
  met: boolean | null;
  action?: React.ReactNode;
}

/**
 * "Your status": a tick/cross checklist of the requirements, what's still
 * missing, and the one next step — Authorize, Join, or "You are in".
 */
export function StatusPanel({ g, onChange, refresh }: { g: Giveaway; onChange: (g: Giveaway) => void; refresh: () => void }) {
  const t = useT();
  const { providerKind } = useApp();
  const { member, csrf, play } = useGw();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const joinRef = useRef<HTMLButtonElement>(null);
  const here = `/giveaways/${g.id}`;
  const ended = g.status === "ended";
  const missing = g.missing ?? [];
  const missingServer = (key: string) => missing.some((m) => m.type === "server" && m.key === key);
  const authorized = Boolean(g.authorized);

  const fail = (err: unknown) => {
    play("error");
    if (err instanceof GwError && err.status === 429) toast({ tone: "error", title: t("gw.errors.rate_limited") });
    else if (err instanceof GwError && err.status === 401) {
      toast({ tone: "error", title: t("gw.status.signedOut") });
    } else toast({ tone: "error", title: t("gw.errors.generic") });
  };

  const join = async () => {
    setBusy("join");
    try {
      const res = await gwFetch<JoinResult>(`/api/giveaways/${g.id}/join`, { method: "POST", csrf });
      if (res.status === "joined" || res.status === "already") {
        onChange({ ...g, joined: true, missing: [], entries: g.entries + (res.status === "joined" ? 1 : 0) });
        if (res.status === "joined") {
          const r = joinRef.current?.getBoundingClientRect();
          confetti(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);
          play("purchase");
          toast({ tone: "success", title: t("gw.status.youAreIn"), description: t("gw.status.youAreInHint") });
        } else toast({ tone: "info", title: t("gw.status.already") });
      } else if (res.status === "missing") {
        play("error");
        onChange({ ...g, missing: res.missing ?? g.missing });
        toast({ tone: "error", title: t("gw.status.missing") });
      } else {
        play("error");
        toast({ tone: "error", title: res.status === "ended" ? t("gw.status.endedToast") : t("gw.status.notFound") });
      }
      refresh();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  // MOCK: pretend the member joined the server through its invite.
  const mockJoinServer = async (key: string) => {
    setBusy(key);
    try {
      await gwFetch(`/api/giveaways/mock/join-server`, { method: "POST", body: { key }, csrf });
      play("tick");
      refresh();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const signedIn = Boolean(member);
  const rows: Row[] = [
    ...g.requirements.servers.map<Row>((s) => {
      const met = signedIn && !ended ? !missingServer(s.key) : null;
      let action: React.ReactNode = null;
      const invite = safeHttpsUrl(s.inviteUrl);
      if (signedIn && !met && !ended) {
        action =
          providerKind === "mock" ? (
            <button type="button" className="gw-cta-soft !min-h-9 !px-3 text-xs" onClick={() => mockJoinServer(s.key)} disabled={busy !== null} aria-busy={busy === s.key}>
              {t("gw.status.joinServer", { name: s.name })}
            </button>
          ) : (
            // REAL: the member joins through the server's invite (optional `inviteUrl`),
            // then "Check again" re-reads the giveaway so `missing` updates.
            <span className="flex flex-wrap gap-1.5">
              {invite && (
                <a href={invite} target="_blank" rel="noopener noreferrer" className="gw-cta-soft !min-h-9 !px-3 text-xs">
                  {t("gw.status.joinServer", { name: s.name })}
                  <ExternalLink aria-hidden className="size-3.5" />
                </a>
              )}
              <button type="button" className="gw-cta-soft !min-h-9 !px-3 text-xs" onClick={refresh}>
                <RefreshCw aria-hidden className="size-3.5" />
                {t("gw.status.checkAgain")}
              </button>
            </span>
          );
      }
      return { key: `server:${s.key}`, label: t("gw.req.server", { name: s.name }), met, action };
    }),
    ...(g.requirements.authorize ? [{ key: "authorize", label: t("gw.req.authorize"), met: signedIn && !ended ? authorized : null }] : []),
  ];
  const missingLabels = rows.filter((r) => r.met === false).map((r) => r.label);
  const firstMissingServer = g.requirements.servers.find((s) => missingServer(s.key));
  const joinBlocker = !authorized && g.requirements.authorize ? t("gw.status.authorizeFirst") : firstMissingServer ? t("gw.status.joinServerFirst", { name: firstMissingServer.name }) : missing.length ? t("gw.status.missing") : null;
  const won = Boolean(member && g.winners.some((w) => w.id === member.id));

  return (
    <section aria-labelledby="gw-status" className="gw-card p-5">
      <h2 id="gw-status" className="text-base font-bold">
        {t("gw.status.title")}
      </h2>

      {rows.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-semibold text-ink-3">{t("gw.requirements")}</h3>
          <ul className="mt-2 space-y-2">
            {rows.map((r) => (
              <li key={r.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-[var(--gw-cream)] px-3 py-2.5">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full",
                    r.met === true && "bg-good/15 text-good",
                    r.met === false && "bg-accent-500/12 text-accent-300",
                    r.met === null && "bg-ink-3/10 text-ink-3",
                  )}
                >
                  {r.met === true ? <Check aria-hidden className="size-4" strokeWidth={3} /> : r.met === false ? <X aria-hidden className="size-4" strokeWidth={3} /> : <span aria-hidden className="size-1.5 rounded-full bg-current" />}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {r.label}
                  {r.met !== null && <span className="sr-only"> — {r.met ? t("gw.status.met") : t("gw.status.unmet")}</span>}
                </span>
                {r.action && <div className="w-full ps-10">{r.action}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      {!signedIn ? (
        <div className="mt-5 space-y-3">
          <p className="text-sm text-ink-2">{ended ? t("gw.status.endedNotJoined") : t("gw.status.signedOut")}</p>
          {!ended && (
            <a href={loginHref(here)} className="gw-cta w-full">
              <LogIn aria-hidden className="size-4 rtl:-scale-x-100" />
              {t("gw.status.login")}
            </a>
          )}
        </div>
      ) : ended ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-ink-3/10 px-4 py-3 text-sm">
          {won ? <Trophy aria-hidden className="size-5 shrink-0 text-warn" /> : <Check aria-hidden className="size-5 shrink-0 text-ink-3" />}
          <span className={won ? "font-semibold" : "text-ink-2"}>{won ? t("gw.status.youWon") : g.joined ? t("gw.status.endedJoined") : t("gw.status.endedNotJoined")}</span>
        </div>
      ) : g.joined ? (
        <div className="gw-pop mt-5 flex items-center gap-3 rounded-2xl bg-good/12 px-4 py-3.5 ring-1 ring-inset ring-good/25" role="status">
          <PartyPopper aria-hidden className="size-6 shrink-0 text-good" />
          <div>
            <p className="font-bold text-good">{t("gw.status.youAreIn")}</p>
            <p className="text-xs text-ink-2">{t("gw.status.youAreInHint")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {missingLabels.length > 0 ? (
            <p className="text-sm text-ink-2">
              <span className="font-semibold text-ink">{t("gw.status.missingTitle")}:</span> {missingLabels.join(" · ")}
            </p>
          ) : (
            <p className="text-sm text-ink-2">{t("gw.status.allSet")}</p>
          )}
          {g.requirements.authorize && !authorized && (
            <div className="space-y-3">
              <a href={authorizeHref(here)} className="gw-cta w-full">
                <KeyRound aria-hidden className="size-4" />
                {t("gw.authorize.button")}
              </a>
              <AuthorizeList className="rounded-2xl bg-[var(--gw-cream)] px-4 py-3" />
            </div>
          )}
          {joinBlocker ? (
            <Tooltip content={joinBlocker} className="flex w-full">
              <button type="button" aria-disabled="true" className="gw-cta w-full" onClick={(e) => e.preventDefault()}>
                {t("gw.status.join")}
              </button>
            </Tooltip>
          ) : (
            <button ref={joinRef} type="button" className="gw-cta w-full text-base" onClick={join} disabled={busy !== null} aria-busy={busy === "join"}>
              {busy === "join" ? t("gw.status.joining") : t("gw.status.join")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
