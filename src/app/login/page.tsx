import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { env } from "@/lib/server/env";
import { getLocale } from "@/lib/server/i18n";
import { getGuildIdentity } from "@/lib/server/identity";
import { getProvider } from "@/lib/provider";
import { LoginView } from "./login-view";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSession()) redirect("/overview");
  const { error } = await searchParams;
  const [main, catalog] = await Promise.all([getGuildIdentity("main"), getGuildIdentity("catalog")]);
  // Only public identity (name, icon, banner, counts) — never member data.
  return (
    <LoginView
      locale={await getLocale()}
      error={error ?? null}
      discordEnabled={env.discordConfigured}
      mockEnabled={env.mockLoginEnabled}
      guilds={[main, catalog].filter((g) => g !== null)}
      providerKind={getProvider().kind}
    />
  );
}
