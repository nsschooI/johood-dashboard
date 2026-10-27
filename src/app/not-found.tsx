import Link from "next/link";
import { getT } from "@/lib/server/i18n";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="glass max-w-md rounded-[var(--radius-card)] p-8 text-center">
        <p className="bg-gradient-to-br from-accent-300 to-blush bg-clip-text text-5xl font-semibold text-transparent">404</p>
        <h1 className="mt-3 text-lg font-semibold">{t("errors.notFoundTitle")}</h1>
        <p className="mt-1 text-sm text-ink-3">{t("errors.notFoundBody")}</p>
        <Link href="/overview" className="mt-6 inline-flex h-10 items-center rounded-xl bg-white/[0.06] px-4 text-sm font-medium ring-1 ring-inset ring-line-strong hover:bg-white/[0.1]">
          {t("errors.backHome")}
        </Link>
      </div>
    </main>
  );
}
