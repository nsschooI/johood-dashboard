"use client";

import { useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PersonAvatar } from "@/components/people/person";
import { Icon } from "@/components/icons/icon";
import { DASHBOARD_CONFIG } from "@config/dashboard";
import { useCan, useFormat, useT } from "@/components/providers/app-provider";
import { useLiveEvent } from "@/components/providers/live-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Field, Input, Textarea } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { TimeAgo } from "@/components/ui/time-ago";
import { MemberSearch } from "@/components/members/member-search";
import { MemberBadge } from "@/components/people/member-badge";
import { api, qs } from "@/lib/client/api";
import { useAction } from "@/lib/client/use-action";
import { useLoad } from "@/lib/client/use-load";
import type { LedgerEntry, LedgerKind, MemberProfile, MemberSummary, Page } from "@/lib/types";
import { Table, Td, Th } from "./tables";

const KIND_TONE: Record<LedgerKind, Tone> = { purchase: "accent", transfer: "info", redeem: "neutral", adjust: "warn", refund: "good", activity: "info" };

export function LedgerPanel() {
  const t = useT();
  const params = useSearchParams();
  const preset = params.get("member");
  const [member, setMember] = useState<Pick<MemberSummary, "discordId"> | null>(preset ? { discordId: preset } : null);

  return (
    <Card id="t-ledger" aria-labelledby="ledger-title" className="scroll-mt-24">
      <CardHeader id="ledger-title" title={t("points.ledger")} description={t("points.ledgerHint")} icon="file" />
      <div className="grid gap-6 px-5 pb-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <MemberSearch onSelect={setMember} selectedId={member?.discordId} limit={8} guild="main" />
        <div className="min-w-0">
          {member ? <MemberLedger key={member.discordId} member={member} /> : <EmptyState title={t("points.ledgerHint")} className="h-full rounded-2xl ring-1 ring-line ring-inset" />}
        </div>
      </div>
    </Card>
  );
}

function MemberLedger({ member }: { member: Pick<MemberSummary, "discordId"> }) {
  const t = useT();
  const f = useFormat();
  const can = useCan();
  const [loadingMore, setLoadingMore] = useState(false);
  const canAdjust = can("points.adjust") || can("points.adjust_limited");
  const { data, error, reload, setData } = useLoad(member.discordId, async (signal) => {
    const [profile, page] = await Promise.all([
      api<MemberProfile>(`/api/members/${member.discordId}`, { signal }),
      api<Page<LedgerEntry>>(`/api/points/ledger/${member.discordId}${qs({ limit: 20 })}`, { signal }),
    ]);
    return { profile, entries: page.items, cursor: page.nextCursor };
  });

  useLiveEvent("ledger", (e) => {
    if (e.data.discordId !== member.discordId) return;
    setData((d) =>
      d.entries.some((x) => x.id === e.data.id) ? d : { ...d, entries: [e.data, ...d.entries], profile: { ...d.profile, points: e.data.balanceAfter } },
    );
  });

  const loadMore = async () => {
    if (!data?.cursor) return;
    setLoadingMore(true);
    try {
      const page = await api<Page<LedgerEntry>>(`/api/points/ledger/${member.discordId}${qs({ limit: 20, cursor: data.cursor })}`);
      setData((d) => ({ ...d, entries: [...d.entries, ...page.items], cursor: page.nextCursor }));
    } finally {
      setLoadingMore(false);
    }
  };

  if (error) return <ErrorState title={t("common.error")} action={<Button onClick={reload}>{t("common.retry")}</Button>} />;
  if (!data) {
    return (
      <div className="space-y-3" aria-busy>
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const { profile, entries, cursor } = data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface-2 p-4 ring-1 ring-inset ring-line">
        <Avatar name={profile.displayName} src={profile.avatarUrl} size={48} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate font-medium text-ink">
            {profile.displayName} <MemberBadge badge={profile.badge} />
          </p>
          <p className="rtl:text-right truncate text-xs text-ink-3" dir="ltr">
            {profile.roblox?.robloxName ?? t("members.notLinked")} · {profile.discordId}
          </p>
        </div>
        <dl className="flex gap-6 text-end">
          <div>
            <dt className="text-xs text-ink-3">{t("points.balance")}</dt>
            <dd className="tabular text-xl font-semibold text-ink">{f.n(profile.points ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">{t("points.lifetime")}</dt>
            <dd className="tabular text-xl font-semibold text-ink-2">{f.n(profile.lifetimePoints ?? 0)}</dd>
          </div>
        </dl>
      </div>

      {canAdjust && <AdjustForm member={profile} />}

      {entries.length === 0 ? (
        <EmptyState title={t("points.ledgerEmpty")} />
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-inset ring-line">
          <Table label={t("points.ledger")} className="max-h-[26rem]">
            <thead>
              <tr>
                <Th>{t("points.col.time")}</Th>
                <Th>{t("points.col.kind")}</Th>
                <Th end>{t("points.col.change")}</Th>
                <Th end>{t("points.col.balance")}</Th>
                <Th>{t("points.col.reason")}</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-surface-2">
                  <Td className="text-xs whitespace-nowrap text-ink-3">
                    <TimeAgo at={e.at} />
                  </Td>
                  <Td>
                    <Badge tone={KIND_TONE[e.kind]}>{t(`points.kind.${e.kind}`)}</Badge>
                  </Td>
                  <Td end className={cn("tabular font-medium whitespace-nowrap", e.delta > 0 ? "text-good" : "text-ink-2")}>
                    {f.signed(e.delta)}
                  </Td>
                  <Td end className="tabular text-ink-2">
                    {f.n(e.balanceAfter)}
                  </Td>
                  <Td className="max-w-72 text-xs text-ink-3">
                    {e.reason ? (
                      <span className="block truncate" title={e.reason}>
                        {e.reason}
                      </span>
                    ) : (
                      "—"
                    )}
                    {e.actor && (
                      <span className="mt-1 flex items-center gap-1.5 text-[11px]">
                        <PersonAvatar person={e.actor} size={16} />
                        <bdi className="truncate">{e.actor.name}</bdi>
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {cursor && (
            <div className="border-t border-line p-2 text-center">
              <Button size="sm" variant="ghost" onClick={loadMore} loading={loadingMore}>
                {t("common.loadMore")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdjustForm({ member }: { member: MemberProfile }) {
  const t = useT();
  const f = useFormat();
  const can = useCan();
  const id = useId();
  const { pending, run } = useAction();
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const limit = can("points.adjust") ? Infinity : can("points.adjust_limited") ? DASHBOARD_CONFIG.limitedAdjustMax : 0;
  const n = Math.floor(Number(amount));
  const delta = mode === "add" ? n : -n;
  const amountError = amount && (!Number.isFinite(n) || n <= 0) ? t("common.error") : n > limit ? t("points.overLimit", { n: f.n(limit) }) : null;
  const reasonError = touched && reason.trim().length < DASHBOARD_CONFIG.minReasonLength ? t("points.reasonRequired", { n: DASHBOARD_CONFIG.minReasonLength }) : null;
  const valid = n > 0 && n <= limit && reason.trim().length >= DASHBOARD_CONFIG.minReasonLength;
  const needsConfirm = Math.abs(delta) > DASHBOARD_CONFIG.pointsConfirmThreshold;

  const submit = async (confirm: boolean) => {
    const ok = await run(
      "adjust",
      () => api<LedgerEntry>("/api/points/adjust", { method: "POST", body: { discordId: member.discordId, delta, reason: reason.trim(), confirm } }),
      t("points.adjusted"),
      {
        undo: () =>
          api("/api/points/adjust", {
            method: "POST",
            body: { discordId: member.discordId, delta: -delta, reason: t("points.undoAdjust", { reason: reason.trim() }).slice(0, 500), confirm: true },
          }),
      },
    );
    setConfirming(false);
    if (ok) {
      setAmount("");
      setReason("");
      setTouched(false);
    }
  };

  return (
    <form
      className="space-y-4 rounded-2xl bg-accent-500/[0.05] p-4 ring-1 ring-inset ring-accent-400/15"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!valid) return;
        if (needsConfirm) setConfirming(true);
        else void submit(false);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{t("points.adjust")}</h3>
          <p className="text-xs text-ink-3">{t("points.adjustHint")}</p>
        </div>
        {Number.isFinite(limit) && (
          <Badge tone="warn" icon={<Icon name="safety" size={12} />}>
            {t("points.limit", { n: f.n(limit) })}
          </Badge>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-[auto_10rem_minmax(0,1fr)] sm:items-start">
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-ink-2" aria-hidden>
            &nbsp;
          </span>
          <Segmented
            label={t("points.adjust")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "add", label: t("points.add") },
              { value: "remove", label: t("points.remove") },
            ]}
          />
        </div>
        <Field label={t("points.amount")} htmlFor={`${id}-amount`} error={amountError}>
          <Input
            id={`${id}-amount`}
            inputMode="numeric"
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            leading={mode === "add" ? <Icon name="plus" size={16} /> : <Icon name="minus" size={16} />}
            required
          />
        </Field>
        <Field label={t("common.reason")} htmlFor={`${id}-reason`} error={reasonError}>
          <Textarea
            id={`${id}-reason`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={t("points.reasonPlaceholder")}
            maxLength={500}
            rows={2}
            required
            aria-required
            className="min-h-10"
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={pending === "adjust"} disabled={!valid}>
          {t("points.adjust")}
          {n > 0 && <span className="tabular opacity-80">({f.signed(delta)})</span>}
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        title={t("points.confirmTitle")}
        body={t("points.confirmBody", { name: member.displayName, delta: f.signed(delta), n: f.n(DASHBOARD_CONFIG.pointsConfirmThreshold) })}
        loading={pending === "adjust"}
        onCancel={() => setConfirming(false)}
        onConfirm={() => submit(true)}
      >
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2 ring-1 ring-line">“{reason.trim()}”</p>
      </ConfirmDialog>
    </form>
  );
}
