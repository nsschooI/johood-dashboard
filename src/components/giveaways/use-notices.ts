"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/providers/app-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { MessageKey } from "@/lib/i18n";
import { useGw } from "./gw-provider";

const ERRORS = new Set(["login_unavailable", "authorize_unavailable", "rate_limited"]);

/**
 * Flags the login/authorize redirects leave in the URL (?authorized=1,
 * ?error=…) become a toast, then disappear from the address bar.
 */
export function useUrlNotices(onAuthorized?: () => void) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const t = useT();
  const { play } = useGw();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const authorized = params.get("authorized");
    const error = params.get("error");
    if (!authorized && !error) return;
    // Effects may run twice (Strict Mode); show each notice once.
    if (handled.current === params.toString()) return;
    handled.current = params.toString();
    if (authorized) {
      toast({ tone: "success", title: t("gw.authorize.done") });
      play("success");
      onAuthorized?.();
    }
    if (error) toast({ tone: "error", title: t((ERRORS.has(error) ? `gw.errors.${error}` : "gw.errors.generic") as MessageKey) });
    const rest = new URLSearchParams(params);
    rest.delete("authorized");
    rest.delete("error");
    const qs = rest.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // Run once per landing; the params are consumed above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
}
