"use client";

import { useEffect } from "react";
import { Scene } from "@/components/art/scenes";
import { Icon } from "@/components/icons/icon";
import { useT } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="glass mx-auto mt-10 max-w-lg rounded-[2rem] px-8 pt-6 pb-8 text-center animate-rise">
      <Scene name="crash" className="mx-auto h-44 w-auto" />
      <h1 className="font-display mt-2 text-2xl font-bold">{t("errors.crashTitle")}</h1>
      <p className="mt-2 text-sm text-ink-3">{t("errors.crashBody")}</p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-ink-4" dir="ltr">
          {error.digest}
        </p>
      )}
      <Button variant="primary" onClick={reset} className="mt-6">
        <Icon name="refresh" size={18} />
        {t("common.retry")}
      </Button>
    </div>
  );
}
