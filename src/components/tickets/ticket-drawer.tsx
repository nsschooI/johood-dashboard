"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, CheckCircle2, Hand, Send } from "lucide-react";
import { useApp, useCan, useFormat, useT } from "@/components/providers/app-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Select, Textarea } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { api } from "@/lib/client/api";
import { useAction } from "@/lib/client/use-action";
import type { MemberRef, Ticket, TicketStatus } from "@/lib/types";

export const TICKET_TONE: Record<TicketStatus, "warn" | "accent" | "neutral"> = { open: "warn", claimed: "accent", closed: "neutral" };

export function TicketDrawer({ ticketId, onClose }: { ticketId: string | null; onClose: () => void }) {
  const t = useT();
  const f = useFormat();
  const can = useCan();
  const { user } = useApp();
  const { pending, run } = useAction();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState(false);
  const [reply, setReply] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [assignees, setAssignees] = useState<MemberRef[] | null>(null);
  const [handTo, setHandTo] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!ticketId) return;
    const ctrl = new AbortController();
    setError(false);
    api<Ticket>(`/api/tickets/${ticketId}`, { signal: ctrl.signal })
      .then(setTicket)
      .catch(() => !ctrl.signal.aborted && setError(true));
    return () => ctrl.abort();
  }, [ticketId, reload]);

  useEffect(() => {
    if (!ticketId) {
      setTicket(null);
      setReply("");
      setHandTo("");
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId || !can("tickets.transfer") || assignees) return;
    api<MemberRef[]>("/api/tickets/assignees").then(setAssignees).catch(() => setAssignees([]));
  }, [ticketId, can, assignees]);

  useLiveEvent("ticket", (e) => {
    if (e.data.id === ticketId) setReload((n) => n + 1);
  });

  const act = async (action: "claim" | "reply" | "close" | "transfer", body: Record<string, unknown>, success: string) => {
    const next = await run(action, () => api<Ticket>(`/api/tickets/${ticketId}/${action}`, { method: "POST", body }), success);
    if (next) setTicket(next);
    return next;
  };

  const closed = ticket?.status === "closed";

  return (
    <Modal
      open={ticketId !== null}
      onClose={onClose}
      variant="drawer"
      title={ticket ? `#${ticket.number} · ${ticket.subject}` : t("common.loading")}
      description={
        ticket && (
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={TICKET_TONE[ticket.status]}>{t(`tickets.status.${ticket.status}`)}</Badge>
            <Badge>{t(`tickets.category.${ticket.category}`)}</Badge>
            <span className="text-xs">
              {t("tickets.claimedBy")}: {ticket.claimedBy?.name ?? t("tickets.unclaimed")}
            </span>
          </span>
        )
      }
      footer={
        ticket &&
        !closed && (
          <div className="flex w-full flex-col gap-3">
            {can("tickets.reply") && (
              <form
                className="flex items-end gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!reply.trim()) return;
                  if (await act("reply", { body: reply.trim() }, t("tickets.sent"))) setReply("");
                }}
              >
                <label htmlFor="ticket-reply" className="sr-only">
                  {t("tickets.reply")}
                </label>
                <Textarea
                  id="ticket-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={t("tickets.replyPlaceholder")}
                  maxLength={2000}
                  className="min-h-11 flex-1"
                  rows={2}
                />
                <Button type="submit" variant="primary" size="icon" loading={pending === "reply"} disabled={!reply.trim()} aria-label={t("tickets.send")}>
                  {pending !== "reply" && <Send aria-hidden className="size-4 rtl:-scale-x-100" />}
                </Button>
              </form>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {can("tickets.claim") && ticket.status === "open" && (
                <Button size="sm" variant="primary" loading={pending === "claim"} onClick={() => act("claim", {}, t("tickets.claimed"))}>
                  <Hand aria-hidden className="size-3.5" />
                  {t("tickets.claim")}
                </Button>
              )}
              {can("tickets.transfer") && (
                <div className="flex items-center gap-1.5">
                  <label htmlFor="ticket-handover" className="sr-only">
                    {t("tickets.transferTo")}
                  </label>
                  <Select id="ticket-handover" value={handTo} onChange={(e) => setHandTo(e.target.value)} className="h-8 w-44 text-xs">
                    <option value="">{t("tickets.transferTo")}…</option>
                    {assignees
                      ?.filter((a) => a.discordId !== ticket.claimedBy?.discordId)
                      .map((a) => (
                        <option key={a.discordId} value={a.discordId}>
                          {a.name}
                        </option>
                      ))}
                  </Select>
                  <Button
                    size="sm"
                    disabled={!handTo}
                    loading={pending === "transfer"}
                    onClick={async () => (await act("transfer", { to: handTo }, t("tickets.transferred"))) && setHandTo("")}
                  >
                    <ArrowLeftRight aria-hidden className="size-3.5" />
                    {t("tickets.transfer")}
                  </Button>
                </div>
              )}
              {can("tickets.close") && (
                <Button size="sm" variant="danger" className="ms-auto" onClick={() => setConfirmClose(true)}>
                  <CheckCircle2 aria-hidden className="size-3.5" />
                  {t("tickets.close")}
                </Button>
              )}
            </div>
          </div>
        )
      }
    >
      {error ? (
        <ErrorState title={t("common.error")} action={<Button onClick={() => setReload((n) => n + 1)}>{t("common.retry")}</Button>} />
      ) : !ticket ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-10" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ol className="space-y-4">
          {ticket.messages.map((m) => {
            const mine = m.author.discordId === user?.discordId;
            return (
              <li key={m.id} className={cn("flex gap-3", mine && "flex-row-reverse")}>
                <Avatar name={m.author.name} src={m.author.avatarUrl} size={30} />
                <div className={cn("min-w-0 max-w-[80%]", mine && "text-end")}>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                    <span className="font-medium text-ink-2">{m.author.name}</span>
                    {m.staff && <Badge tone="accent">{t("tickets.staffBadge")}</Badge>}
                    <TimeAgo at={m.at} />
                  </p>
                  <p
                    className={cn(
                      "mt-1 inline-block rounded-2xl px-3 py-2 text-start text-sm whitespace-pre-wrap",
                      m.staff ? "bg-accent-500/15 text-ink ring-1 ring-accent-400/20" : "bg-white/[0.05] text-ink ring-1 ring-line",
                    )}
                  >
                    {m.body}
                  </p>
                </div>
              </li>
            );
          })}
          <li className="pt-2 text-center text-xs text-ink-3">
            {t("tickets.openedBy")} {ticket.openedBy.name} · {f.dateTime(ticket.openedAt)}
          </li>
        </ol>
      )}
      <ConfirmDialog
        open={confirmClose}
        title={ticket ? t("tickets.confirmCloseTitle", { number: ticket.number }) : ""}
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
    </Modal>
  );
}
