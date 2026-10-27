import { Illustration } from "@/components/art/illustrations";
import { getT } from "@/lib/server/i18n";

export async function NoAccess() {
  const t = await getT();
  return (
    <div className="glass mx-auto mt-16 max-w-md rounded-[var(--radius-card)] p-8 text-center animate-rise">
      <Illustration name="lock" className="mx-auto h-28 w-auto" />
      <h1 className="mt-2 text-lg font-semibold">{t("errors.noAccessTitle")}</h1>
      <p className="mt-1 text-sm text-ink-3">{t("errors.noAccessBody")}</p>
    </div>
  );
}
