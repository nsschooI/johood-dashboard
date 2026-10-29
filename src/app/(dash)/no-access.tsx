import Link from "next/link";
import { Scene } from "@/components/art/scenes";
import { getT } from "@/lib/server/i18n";

export async function NoAccess() {
  const t = await getT();
  return (
    <div className="glass mx-auto mt-10 max-w-lg rounded-[2rem] px-8 pt-6 pb-8 text-center animate-rise">
      <Scene name="locked" className="mx-auto h-44 w-auto" />
      <h1 className="font-display mt-2 text-2xl font-bold">{t("errors.noAccessTitle")}</h1>
      <p className="mt-2 text-sm text-ink-3">{t("errors.noAccessBody")}</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/access" className="inline-flex h-10 items-center rounded-xl bg-surface px-4 text-sm font-semibold ring-1 ring-line-strong transition hover:bg-surface-2 active:scale-95">
          {t("nav.access")}
        </Link>
        <Link href="/overview" className="inline-flex h-10 items-center rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white transition hover:brightness-105 active:scale-95">
          {t("errors.backHome")}
        </Link>
      </div>
    </div>
  );
}
