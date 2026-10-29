"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { useGuild } from "@/components/providers/guild-provider";
import { useSound } from "@/components/providers/sound-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Field, Input, Select } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { api, ApiClientError } from "@/lib/client/api";
import {
  DURATION_PRESETS,
  GIVEAWAY_LIMITS,
  IMAGE_TYPES,
  UNIT_MINUTES,
  validateGiveaway,
  type ChannelOption,
  type DurationUnit,
  type GiveawayError,
  type GiveawayField,
  type ImageType,
  type ServerRequirement,
} from "@/lib/giveaways/admin";
import type { MessageKey } from "@/lib/i18n";
import { DiscordCard } from "./discord-card";

type ReqMode = "none" | "catalog" | "main" | "both";
const REQ_SERVERS: Record<ReqMode, ServerRequirement[]> = { none: [], catalog: ["catalog"], main: ["main"], both: ["catalog", "main"] };
const STEP_FIELDS: GiveawayField[][] = [["prize", "image"], ["minutes", "winners"], ["channelId"]];
const DEFAULT_BANNER = "/giveaways/banner-active.webp";

interface Picked {
  name: string;
  type: string;
  bytes: number;
  url: string;
  base64: string | null;
}

function readBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function CreateGiveawayView({ channels, now: serverNow }: { channels: ChannelOption[]; now: number }) {
  const { t, user } = useApp();
  const f = useFormat();
  const router = useRouter();
  const { href } = useGuild();
  const toast = useToast();
  const { play } = useSound();
  const ids = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [prize, setPrize] = useState("");
  const [image, setImage] = useState<Picked | null>(null);
  const [preset, setPreset] = useState<number | "custom">(1440);
  const [amount, setAmount] = useState("2");
  const [unit, setUnit] = useState<DurationUnit>("hours");
  const [winners, setWinners] = useState("1");
  const [channelId, setChannelId] = useState(channels.find((c) => c.name.includes("giveaway"))?.id ?? "");
  const [req, setReq] = useState<ReqMode>("catalog");
  const [authorize, setAuthorize] = useState(true);
  const [touched, setTouched] = useState<Set<GiveawayField>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => () => void (image && URL.revokeObjectURL(image.url)), [image]);

  const minutes = preset === "custom" ? Math.round(Number(amount) * UNIT_MINUTES[unit]) : preset;
  const endsAt = now + (Number.isFinite(minutes) ? minutes : 0) * 60_000;
  const errors = validateGiveaway({ prize, minutes, winners: Number(winners), channelId, image: image ? { type: image.type, bytes: image.bytes } : null });
  const errorFor = (field: GiveawayField) => (touched.has(field) && errors[field] ? t(`ga.form.errors.${errors[field] as GiveawayError}` as MessageKey) : null);
  const channel = channels.find((c) => c.id === channelId) ?? null;
  const grouped = useMemo(() => {
    const m = new Map<string, ChannelOption[]>();
    for (const c of channels) m.set(c.guildName, [...(m.get(c.guildName) ?? []), c]);
    return [...m];
  }, [channels]);
  const reqLabels = [
    ...REQ_SERVERS[req].map((k) => t("ga.detail.missingServer", { name: k === "catalog" ? "JoHood Catalog" : "JoHood" })),
    ...(authorize ? [t("ga.detail.missingAuthorize")] : []),
  ];

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setTouched((s) => new Set(s).add("image"));
    const url = URL.createObjectURL(file);
    const ok = (IMAGE_TYPES as readonly string[]).includes(file.type) && file.size <= GIVEAWAY_LIMITS.imageMaxBytes;
    setImage({ name: file.name, type: file.type, bytes: file.size, url, base64: ok ? await readBase64(file).catch(() => null) : null });
  };

  const goNext = () => {
    const fields = STEP_FIELDS[step];
    setTouched((s) => new Set([...s, ...fields]));
    if (fields.some((x) => errors[x])) return;
    setStep((s) => Math.min(2, s + 1));
  };

  const review = () => {
    setTouched(new Set(["prize", "image", "minutes", "winners", "channelId"]));
    const bad = STEP_FIELDS.findIndex((fields) => fields.some((x) => errors[x]));
    if (bad >= 0) {
      setStep(bad);
      toast({ tone: "error", title: t("ga.form.fix") });
      return;
    }
    setConfirm(true);
  };

  const post = async () => {
    setPosting(true);
    try {
      const { id } = await api<{ id: number }>("/api/giveaways-admin", {
        method: "POST",
        body: {
          prize: prize.trim(),
          minutes,
          winners: Number(winners),
          channelId,
          servers: REQ_SERVERS[req],
          authorize,
          ...(image?.base64 ? { imageBase64: image.base64, imageType: image.type as ImageType } : {}),
          confirm: true,
        },
      });
      play("success");
      toast({ tone: "success", title: t("ga.confirm.created", { channel: channel?.name ?? "" }) });
      router.push(href(`/giveaways-admin/${id}`));
    } catch (err) {
      const e = err instanceof ApiClientError ? err : null;
      play("error");
      toast({
        tone: e?.status === 501 ? "info" : "error",
        title: e?.status === 501 ? t("common.notConnected") : e?.status === 429 ? t("common.rateLimited") : e?.status === 403 ? t("common.forbidden") : (e?.message ?? t("common.error")),
      });
      setPosting(false);
      setConfirm(false);
    }
  };

  const steps = [t("ga.form.steps.prize"), t("ga.form.steps.timing"), t("ga.form.steps.audience")];

  return (
    <>
      <PageHeader
        title={t("ga.form.title")}
        subtitle={t("ga.form.subtitle")}
        eyebrow={
          <Link href={href("/giveaways-admin")} transitionTypes={["nav"]} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 transition hover:text-accent-400">
            <Icon name="arrowLeft" size={16} mirror />
            {t("ga.detail.back")}
          </Link>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <section className="glass rounded-[var(--radius-card)]" aria-label={t("ga.form.title")}>
          {/* Stepper */}
          <ol className="flex border-b border-line p-2">
            {steps.map((label, i) => (
              <li key={label} className="flex-1">
                <button
                  type="button"
                  onClick={() => (i <= step ? setStep(i) : goNext())}
                  aria-current={i === step ? "step" : undefined}
                  className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start transition", i === step ? "bg-accent-500/10" : "hover:bg-surface-2")}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition",
                      i < step ? "bg-good text-white dark:text-[#04261a]" : i === step ? "bg-accent-500 text-white" : "bg-surface-3 text-ink-3",
                    )}
                  >
                    {i < step ? <Icon name="check" size={14} /> : i + 1}
                  </span>
                  <span className="min-w-0 max-sm:sr-only">
                    <span className="block text-[11px] text-ink-3">{t("ga.form.step", { n: i + 1 })}</span>
                    <span className={cn("block truncate text-sm font-semibold", i === step ? "text-ink" : "text-ink-2")}>{label}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="space-y-5 p-5 sm:p-6">
            {step === 0 && (
              <>
                <Field label={t("ga.form.prize")} htmlFor={`${ids}-prize`} hint={`${t("ga.form.prizeHint")} · ${[...prize].length}/${GIVEAWAY_LIMITS.prizeMax}`} error={errorFor("prize")}>
                  <Input
                    id={`${ids}-prize`}
                    value={prize}
                    onChange={(e) => setPrize(e.target.value)}
                    onBlur={() => setTouched((s) => new Set(s).add("prize"))}
                    placeholder={t("ga.form.prizePlaceholder")}
                    maxLength={GIVEAWAY_LIMITS.prizeMax + 20}
                    aria-invalid={Boolean(errorFor("prize"))}
                    className="h-12 text-base"
                    dir="auto"
                    autoFocus
                  />
                </Field>
                <Field label={t("ga.form.banner")} optional={t("ga.form.optional")} htmlFor={`${ids}-file`} hint={t("ga.form.bannerHint")} error={errorFor("image")}>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      void pick(e.dataTransfer.files[0]);
                    }}
                    className={cn(
                      "relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed p-4 text-center transition sm:flex-row sm:text-start",
                      dragging ? "border-accent-500 bg-accent-500/[0.06]" : "border-line-strong bg-surface-2/60",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                    <img src={image?.url ?? DEFAULT_BANNER} alt="" className="aspect-[16/9] w-40 shrink-0 rounded-xl object-cover shadow-[0_6px_16px_-10px_var(--color-shadow-2)]" />
                    <div className="min-w-0 flex-1">
                      {image ? (
                        <>
                          <p className="truncate text-sm font-semibold">{image.name}</p>
                          <p className="text-xs text-ink-3">
                            {image.type || "?"} · {f.n(Math.round(image.bytes / 1024))} KB
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-ink-2">
                          <Icon name="upload" size={16} className="me-1.5 inline align-[-3px] text-ink-3" />
                          {t("ga.form.drop")}{" "}
                          <button type="button" onClick={() => fileInput.current?.click()} className="font-semibold text-accent-300 underline-offset-2 hover:underline">
                            {t("ga.form.browse")}
                          </button>
                        </p>
                      )}
                      {!image && <p className="mt-1 text-xs text-ink-3">{t("ga.form.defaultBanner")}</p>}
                    </div>
                    {image && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()}>
                          <Icon name="refresh" size={14} />
                          {t("ga.form.browse")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setImage(null)}>
                          <Icon name="x" size={14} />
                          {t("ga.form.remove")}
                        </Button>
                      </div>
                    )}
                    <input ref={fileInput} id={`${ids}-file`} type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
                  </div>
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <fieldset className="space-y-2.5">
                  <legend className="mb-1.5 text-xs font-semibold text-ink-2">{t("ga.form.duration")}</legend>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_PRESETS.map((m) => (
                      <Chip key={m} active={preset === m} onClick={() => setPreset(m)}>
                        {t(`ga.form.presets.${m}` as MessageKey)}
                      </Chip>
                    ))}
                    <Chip active={preset === "custom"} onClick={() => setPreset("custom")} icon={<Icon name="sliders" size={14} />}>
                      {t("ga.form.custom")}
                    </Chip>
                  </div>
                  {preset === "custom" && (
                    <div className="flex max-w-sm gap-2 animate-fade-in">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onBlur={() => setTouched((s) => new Set(s).add("minutes"))}
                        aria-label={t("ga.form.amount")}
                        aria-invalid={Boolean(errorFor("minutes"))}
                        className="w-28"
                      />
                      <div className="flex-1">
                        <Select value={unit} onChange={(e) => setUnit(e.target.value as DurationUnit)} aria-label={t("ga.form.duration")}>
                          {(["minutes", "hours", "days"] as const).map((u) => (
                            <option key={u} value={u}>
                              {t(`ga.form.units.${u}`)}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  )}
                  {errorFor("minutes") ? (
                    <p role="alert" className="text-xs font-medium text-bad">
                      {errorFor("minutes")}
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-2">
                      <Icon name="calendar" size={16} className="text-accent-400" />
                      {t("ga.form.endsAt", { date: f.dateTime(new Date(endsAt).toISOString()) })}
                    </p>
                  )}
                </fieldset>
                <Field label={t("ga.form.winners")} htmlFor={`${ids}-winners`} hint={t("ga.form.winnersHint")} error={errorFor("winners")}>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="secondary" aria-label="−1" onClick={() => setWinners((w) => String(Math.max(1, (Number(w) || 1) - 1)))}>
                      <Icon name="minus" size={18} />
                    </Button>
                    <Input
                      id={`${ids}-winners`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={50}
                      value={winners}
                      onChange={(e) => setWinners(e.target.value)}
                      onBlur={() => setTouched((s) => new Set(s).add("winners"))}
                      aria-invalid={Boolean(errorFor("winners"))}
                      className="w-24 text-center font-display text-lg font-bold"
                    />
                    <Button size="icon" variant="secondary" aria-label="+1" onClick={() => setWinners((w) => String(Math.min(50, (Number(w) || 0) + 1)))}>
                      <Icon name="plus" size={18} />
                    </Button>
                  </div>
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label={t("ga.form.channel")} htmlFor={`${ids}-channel`} hint={t("ga.form.channelHint")} error={errorFor("channelId")}>
                  <Select id={`${ids}-channel`} value={channelId} onChange={(e) => setChannelId(e.target.value)} onBlur={() => setTouched((s) => new Set(s).add("channelId"))} aria-invalid={Boolean(errorFor("channelId"))}>
                    <option value="">{t("ga.form.pickChannel")}</option>
                    {grouped.map(([guildName, list]) => (
                      <optgroup key={guildName} label={guildName}>
                        {list.map((c) => (
                          <option key={c.id} value={c.id}>
                            #{c.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                </Field>
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold text-ink-2">{t("ga.form.requirements")}</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(["none", "catalog", "main", "both"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={req === m}
                        onClick={() => setReq(m)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-xs font-semibold ring-1 transition active:scale-95",
                          req === m ? "bg-accent-500/10 text-ink ring-2 ring-accent-500/50" : "bg-surface-2 text-ink-2 ring-line hover:ring-line-strong",
                        )}
                      >
                        <Icon name={m === "none" ? "globe" : m === "both" ? "layers" : "server"} size={20} duo={req === m} className={req === m ? "text-accent-400" : "text-ink-3"} />
                        {t(`ga.form.req.${m}`)}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="flex items-center gap-4 rounded-2xl bg-surface-2 px-4 py-3.5 ring-1 ring-line">
                  <span className="grid size-10 place-items-center rounded-xl bg-surface text-ink-2 ring-1 ring-line">
                    <Icon name="access" size={20} duo />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t("ga.form.authorize")}</span>
                    <span className="block text-xs text-ink-3">{t("ga.form.authorizeHint")}</span>
                  </span>
                  <Switch checked={authorize} onChange={setAuthorize} label={t("ga.form.authorize")} />
                </label>
              </>
            )}
          </div>

          <footer className="flex items-center gap-2 border-t border-line bg-surface-2/50 px-5 py-4">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <Icon name="arrowLeft" size={16} mirror />
                {t("ga.form.back")}
              </Button>
            )}
            <span className="ms-auto" />
            {step < 2 ? (
              <Button variant="secondary" onClick={goNext}>
                {t("ga.form.next")}
                <Icon name="arrowRight" size={16} mirror />
              </Button>
            ) : (
              <Button variant="primary" onClick={review}>
                <Icon name="send" size={16} mirror />
                {t("ga.form.post")}
              </Button>
            )}
          </footer>
        </section>

        <aside className="space-y-3 xl:sticky xl:top-20" aria-label={t("ga.form.preview")}>
          <div className="flex items-center gap-2">
            <Icon name="eye" size={18} className="text-accent-400" />
            <h2 className="font-display text-[15px] font-semibold">{t("ga.form.preview")}</h2>
            <span className="text-xs text-ink-3">· {t("ga.form.previewHint")}</span>
          </div>
          <DiscordCard now={now} prize={prize} endsAt={endsAt} winners={Number(winners) || 1} host={user?.name ?? "staff"} requirements={reqLabels} banner={image?.url ?? DEFAULT_BANNER} />
        </aside>
      </div>

      <ConfirmDialog
        open={confirm}
        title={t("ga.form.confirmTitle")}
        body={t("ga.form.confirmBody", { channel: channel?.name ?? "", date: f.dateTime(new Date(endsAt).toISOString()) })}
        confirmLabel={t("ga.form.post")}
        loading={posting}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void post()}
      >
        <dl className="space-y-2 text-sm">
          {(
            [
              ["prize", prize.trim()],
              ["ends", f.dateTime(new Date(endsAt).toISOString())],
              ["winners", winners],
              ["channel", channel ? `#${channel.name} · ${channel.guildName}` : "—"],
              ["requirements", reqLabels.join(" · ") || t("ga.discord.noReq")],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="flex gap-3 rounded-xl bg-surface-2 px-3 py-2">
              <dt className="w-24 shrink-0 text-ink-3">{t(`ga.form.summary.${k}`)}</dt>
              <dd className="min-w-0 font-semibold break-words" dir="auto">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </ConfirmDialog>
    </>
  );
}
