import { Lock } from "lucide-react";
import { getT } from "@/lib/server/i18n";

export async function NoAccess() {
  const t = await getT();
  return (
    <div className="glass mx-auto mt-16 max-w-md rounded-[var(--radius-card)] p-8 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-white/[0.05] text-ink-3 ring-1 ring-line">
        <Lock className="size-5" aria-hidden />
      </span>
      <h1 className="mt-4 text-lg font-semibold">{t("errors.noAccessTitle")}</h1>
      <p className="mt-1 text-sm text-ink-3">{t("errors.noAccessBody")}</p>
    </div>
  );
}
