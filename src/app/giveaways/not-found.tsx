"use client";

import Link from "next/link";
import { useT } from "@/components/providers/app-provider";
import { GiftBox } from "@/components/giveaways/art";

export default function GiveawayNotFound() {
  const t = useT();
  return (
    <div className="gw-card mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-12 text-center">
      <GiftBox tone="grey" className="h-20 w-auto" />
      <h1 className="text-xl font-extrabold">{t("gw.status.notFound")}</h1>
      <Link href="/giveaways" className="gw-cta mt-2">
        {t("gw.back")}
      </Link>
    </div>
  );
}
