"use client";

import { useApp } from "@/components/providers/app-provider";

export function GwFooter() {
  const { t, providerKind } = useApp();
  return (
    <footer className="relative z-10 border-t border-line py-6 text-center text-xs text-ink-3">
      <p>
        {t("gw.brand")} · {t("gw.tagline")}
      </p>
      {providerKind === "mock" && <p className="mt-1 opacity-80">{t("gw.mockNote")}</p>}
    </footer>
  );
}
