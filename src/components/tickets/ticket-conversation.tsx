"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icon";
import { useApp, useCan, useFormat, useWhyNot } from "@/components/providers/app-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { PersonAvatar } from "@/components/people/person";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Select, Textarea } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { api } from "@/lib/client/api";
import { useAction } from "@/lib/client/use-action";
import { useLoad } from "@/lib/client/use-load";
import type { MemberRef, Ticket } from "@/lib/types";
import { CategoryChip, StatusPill } from "./ticket-bits";

/**
 * A ticket's conversation and everything staff can do with it: claim,
 * reply, hand over, close (with confirm). Each control is shown to everyone
 * who can see the ticket; the ones they can't use say why.
 */
export function TicketConversation({ ticketId, onBack, onChange }: { ticketId: string; onBack?: () => void; onChange?: (t: Ticket) => void }) {
  const { t, user } = useApp();
  const f = useFormat();
  const can = useCan();
  const why = useWhyNot();
  const { pending, run, feedbackFor } = useAction();
  const [reply, setReply] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [handTo, setHandTo] = useState("");
  const thread = useRef<HTMLOListElement>(null);
  const { data: ticket, error, reload, setData } = useLoad(ticketId, (signal) => api<Ticket>(`/api/tickets/${ticketId}`, { signal }));
  const { data: assignees } = useLoad(can("tickets.transfer") ? "assignees" : null, (signal) => api<MemberRef[]>("/api/tickets/assignees", { signal }));

  // Someone else acted on this ticket: refresh it quietly.
  useLiveEvent("ticket", (e) => {
    if (e.data.id !== ticketId) return;
    api<Ticket>(`/api/tickets/${ticketId}`)
      .then((next) => {
        setData(() => next);
        onChange?.(next);
      })
      .catch(() => {});
  });

  // Keep the newest message in view.
  const count = ticket?.messages.length ?? 0;
  useEffect(() => {
    const el = thread.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, ticketId]);

  const act = async (action: "claim" | "reply" | "close" | "transfer", body: Record<string, unknown>, success: string) => {
    const next = await run(action, () => api<Ticket>(`/api/tickets/${ticketId}/${action}`, { method: "POST", body }), success);
    if (next) {
      setData(() => next);
      onChange?.(next);
    }
    return next;
  };

  const send = async () => {
    if (!reply.trim()) return;
    if (await act("reply", { body: reply.trim() }, t("tickets.sent"))) setReply("");
  };

  if (error) return <ErrorState title={t("common.error")} action={<Button onClick={reload}>{t("common.retry")}</Button>} />;

  if (!ticket) {
    return (
      <div className="space-y-5 p-5" aria-busy="true">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={cn("flex gap-3", i % 2 === 1 && "flex-row-reverse")}>
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className={cn("h-14 rounded-2xl", i % 2 ? "w-1/2" : "w-2/3")} />
          </div>
        ))}
      </div>
    );
  }

  const closed = ticket.status === "closed";
  const claimReason = why("tickets.claim");
  const closeReason = why("tickets.close");
  const handReason = why("tickets.transfer");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-4 sm:px-5">
        {onBack && (
          <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label={t("inbox.back")} className="-ms-1 lg:hidden">
            <Icon name="arrowLeft" size={18} mirror />
          </Button>
        )}
        <PersonAvatar person={ticket.openedBy} size={40} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg leading-snug font-semibold">
            <span className="tabular text-ink-3">#{ticket.number}</span> <bdi>{ticket.subject}</bdi>
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
            <StatusPill status={ticket.status} />
            <CategoryChip category={ticket.category} />
            <span>
              <bdi className="font-medium text-ink-2">{ticket.openedBy.name}</bdi> · {t("inbox.opened", { date: f.dateTime(ticket.openedAt) })}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-3 max-sm:basis-full max-sm:ps-[52px]">
          {ticket.claimedBy ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 ps-1 pe-2.5 ring-1 ring-line">
              <Avatar name={ticket.claimedBy.name} src={ticket.claimedBy.avatarUrl} size={22} />
              <bdi className="font-semibold text-ink-2">{ticket.claimedBy.name}</bdi>
            </span>
          ) : (
            !closed && (
              <Button size="sm" variant="primary" loading={pending === "claim"} disabledReason={claimReason} feedback={feedbackFor("claim")} onClick={() => act("claim", {}, t("tickets.claimed"))}>
                <Icon name="hand" size={16} />
                {t("tickets.claim")}
              </Button>
            )
          )}
        </div>
      </header>

      <ol ref={thread} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite" aria-relevant="additions">
        {ticket.messages.map((m) => {
          const mine = m.author.discordId === user?.discordId;
          return (
            <li key={m.id} className={cn("flex gap-2.5 animate-fade-in", mine && "flex-row-reverse")}>
              <Avatar name={m.author.name} src={m.author.avatarUrl} size={30} />
              <div className={cn("min-w-0 max-w-[82%]", mine && "text-end")}>
                <p className={cn("flex flex-wrap items-center gap-1.5 text-xs text-ink-3", mine && "justify-end")}>
                  <bdi className="font-semibold text-ink-2">{m.author.name}</bdi>
                  {m.staff && <span className="rounded-full bg-accent-500/12 px-1.5 text-[10px] font-semibold text-accent-300">{t("tickets.staffBadge")}</span>}
                  <TimeAgo at={m.at} />
                </p>
                <p
                  dir="auto"
                  className={cn(
                    "mt-1 inline-block rounded-2xl px-3.5 py-2.5 text-start text-sm leading-relaxed whitespace-pre-wrap",
                    m.staff
                      ? "rounded-se-md bg-[linear-gradient(180deg,#ec2a55,#d01843)] text-white shadow-[0_8px_18px_-12px_rgb(225_29_72/0.8)]"
                      : "rounded-ss-md bg-surface-2 text-ink ring-1 ring-line",
                  )}
                >
                  {m.body}
                </p>
              </div>
            </li>
          );
        })}
        {closed && (
          <li className="flex items-center gap-3 pt-2 text-xs text-ink-3">
            <span className="h-px flex-1 bg-line" />
            <Icon name="lock" size={14} />
            {t("inbox.closedNote")}
            <span className="h-px flex-1 bg-line" />
          </li>
        )}
      </ol>

      {!closed && (
        <footer className="space-y-3 border-t border-line bg-surface-2/50 px-4 py-3 sm:px-5">
          {can("tickets.reply") ? (
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <label htmlFor="ticket-reply" className="sr-only">
                {t("tickets.reply")}
              </label>
              <Textarea
                id="ticket-reply"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={t("tickets.replyPlaceholder")}
                maxLength={2000}
                aria-describedby="composer-hint"
                className="min-h-11 flex-1 bg-surface"
                rows={2}
              />
              <Button type="submit" variant="primary" size="icon" loading={pending === "reply"} disabled={!reply.trim()} aria-label={t("tickets.send")} feedback={feedbackFor("reply")}>
                {pending !== "reply" && <Icon name="send" size={18} mirror />}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-ink-3">{t("inbox.readOnly")}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <p id="composer-hint" className="me-auto hidden text-[11px] text-ink-3 sm:block">
              {can("tickets.reply") && t("inbox.composerHint")}
            </p>
            <label htmlFor="ticket-handover" className="sr-only">
              {t("tickets.transferTo")}
            </label>
            <div className="w-44">
              <Select id="ticket-handover" value={handTo} onChange={(e) => setHandTo(e.target.value)} className="h-8 text-xs" disabled={Boolean(handReason)}>
                <option value="">{t("tickets.transferTo")}…</option>
                {assignees
                  ?.filter((a) => a.discordId !== ticket.claimedBy?.discordId)
                  .map((a) => (
                    <option key={a.discordId} value={a.discordId}>
                      {a.name}
                    </option>
                  ))}
              </Select>
            </div>
            <Button
              size="sm"
              disabled={!handTo}
              disabledReason={handReason}
              loading={pending === "transfer"}
              onClick={async () => (await act("transfer", { to: handTo }, t("tickets.transferred"))) && setHandTo("")}
            >
              <Icon name="transfer" size={16} />
              {t("tickets.transfer")}
            </Button>
            <Button size="sm" variant="secondary" disabledReason={closeReason} onClick={() => setConfirmClose(true)} className="text-bad!">
              <Icon name="success" size={16} />
              {t("tickets.close")}
            </Button>
          </div>
        </footer>
      )}

      <ConfirmDialog
        open={confirmClose}
        title={t("tickets.confirmCloseTitle", { number: ticket.number })}
        body={t("tickets.confirmCloseBody")}
        confirmLabel={t("tickets.close")}
        danger
        loading={pending === "close"}
        onCancel={() => setConfirmClose(false)}
        onConfirm={async () => {
          await act("close", {}, t("tickets.closed"));
          setConfirmClose(false);
        }}
      />
    </div>
  );
}
