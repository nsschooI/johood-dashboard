"use client";

import { useT } from "@/components/providers/app-provider";
import { GiftBox } from "@/components/giveaways/art";

export default function GiveawaysError({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="gw-card mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-12 text-center">
      <GiftBox tone="grey" className="h-20 w-auto" />
      <h1 className="text-lg font-bold">{t("gw.errors.generic")}</h1>
      <button type="button" className="gw-cta mt-2" onClick={reset}>
        {t("gw.status.checkAgain")}
      </button>
    </div>
  );
}
