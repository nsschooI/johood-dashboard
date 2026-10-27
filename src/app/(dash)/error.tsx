"use client";

import { useEffect } from "react";
import { useT } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="glass mx-auto mt-16 max-w-md rounded-[var(--radius-card)]">
      <ErrorState
        title={t("errors.crashTitle")}
        hint={t("errors.crashBody")}
        action={
          <Button variant="primary" onClick={reset} className="mt-3">
            {t("common.retry")}
          </Button>
        }
      />
    </div>
  );
}
