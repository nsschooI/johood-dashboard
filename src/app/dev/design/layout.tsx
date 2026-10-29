import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AppProvider } from "@/components/providers/app-provider";
import { SoundProvider } from "@/components/providers/sound-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { getLocale } from "@/lib/server/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Design system", robots: { index: false } };

/** Not linked from the app. Off in production unless DESIGN_PAGE=1. */
export default async function DesignLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.DESIGN_PAGE !== "1") notFound();
  return (
    <AppProvider user={null} permissions={[]} csrf="" locale={await getLocale()} providerKind="mock">
      <ToastProvider>
        <SoundProvider initialMuted={null}>{children}</SoundProvider>
      </ToastProvider>
    </AppProvider>
  );
}
