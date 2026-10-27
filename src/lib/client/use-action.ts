"use client";

import { useCallback, useState } from "react";
import { ApiClientError } from "./api";
import { useToast } from "@/components/providers/toast-provider";
import { useSound } from "@/components/providers/sound-provider";
import { useT } from "@/components/providers/app-provider";

export type Feedback = { kind: "success" | "error"; at: number } | null;

/**
 * Wraps a mutation: loading state, success/error toast + chime, button
 * feedback (flash/shake), friendly 403/429 messages, and the special case
 * the backend answers 501 (action not connected yet): a calm info toast,
 * never an error. Returns the result or null.
 */
export function useAction() {
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const toast = useToast();
  const { play } = useSound();
  const t = useT();

  const run = useCallback(
    async <T,>(key: string, fn: () => Promise<T>, success?: string, opts: { undo?: () => void | Promise<unknown> } = {}): Promise<T | null> => {
      setPending(key);
      try {
        const result = await fn();
        setFeedback((f) => ({ ...f, [key]: { kind: "success", at: Date.now() } }));
        if (success) {
          toast({ tone: "success", title: success, action: opts.undo ? { label: t("common.undo"), onClick: opts.undo } : undefined });
          play("success");
        }
        return result;
      } catch (err) {
        const e = err instanceof ApiClientError ? err : null;
        if (e?.status === 501) {
          toast({ tone: "info", title: t("common.notConnected"), description: t("common.notConnectedHint") });
          play("tick");
          return null;
        }
        setFeedback((f) => ({ ...f, [key]: { kind: "error", at: Date.now() } }));
        const title =
          e?.status === 403 ? (e.code === "over_limit" ? e.message : t("common.forbidden")) : e?.status === 429 ? t("common.rateLimited") : e?.message && e.status < 500 ? e.message : t("common.error");
        toast({ tone: "error", title, description: e?.status && e.status >= 500 ? t("common.errorHint") : undefined });
        play("error");
        return null;
      } finally {
        setPending(null);
      }
    },
    [toast, play, t],
  );

  const feedbackFor = useCallback((key: string) => feedback[key] ?? null, [feedback]);
  return { pending, run, feedbackFor };
}
