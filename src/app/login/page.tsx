import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { env } from "@/lib/server/env";
import { getLocale } from "@/lib/server/i18n";
import { LoginView } from "./login-view";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSession()) redirect("/overview");
  const { error } = await searchParams;
  return <LoginView locale={await getLocale()} error={error ?? null} discordEnabled={env.discordConfigured} mockEnabled={env.mockLoginEnabled} />;
}
