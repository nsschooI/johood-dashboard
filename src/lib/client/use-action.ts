"use client";

import { useCallback, useState } from "react";
import { ApiClientError } from "./api";
import { useToast } from "@/components/providers/toast-provider";
import { useSound } from "@/components/providers/sound-provider";
import { useT } from "@/components/providers/app-provider";

/**
 * Wraps a mutation: loading state, success/error toast + chime, and the
 * friendly message for 403/429. Returns the result or null on failure.
 */
export function useAction() {
  const [pending, setPending] = useState<string | null>(null);
  const toast = useToast();
  const { play } = useSound();
  const t = useT();

  const run = useCallback(
    async <T,>(key: string, fn: () => Promise<T>, success?: string): Promise<T | null> => {
      setPending(key);
      try {
        const result = await fn();
        if (success) {
          toast({ tone: "success", title: success });
          play("success");
        }
        return result;
      } catch (err) {
        const e = err instanceof ApiClientError ? err : null;
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

  return { pending, run };
}
