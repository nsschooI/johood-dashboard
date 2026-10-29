import Link from "next/link";
import { Scene } from "@/components/art/scenes";
import { getT } from "@/lib/server/i18n";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-lg text-center animate-rise">
        <Scene name="lost" className="mx-auto h-56 w-auto" />
        <p className="font-display text-7xl leading-none font-black text-accent-500">404</p>
        <h1 className="font-display mt-3 text-2xl font-bold">{t("errors.notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-ink-3">{t("errors.notFoundBody")}</p>
        <Link href="/overview" className="mt-7 inline-flex h-11 items-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_#e11d48] transition hover:brightness-105 active:scale-95">
          {t("errors.backHome")}
        </Link>
      </div>
    </main>
  );
}
