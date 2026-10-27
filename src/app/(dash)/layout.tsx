import type { ReactNode } from "react";
import { AppProvider } from "@/components/providers/app-provider";
import { LiveProvider } from "@/components/providers/live-provider";
import { SoundProvider } from "@/components/providers/sound-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { Shell } from "@/components/shell/shell";
import { permissionsFor } from "@/lib/permissions";
import { getProvider } from "@/lib/provider";
import { getLocale } from "@/lib/server/i18n";
import { requireSession } from "@/lib/server/session";
import { getPrefs } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, csrf } = await requireSession();
  const locale = await getLocale();
  const prefs = getPrefs(user.discordId);
  return (
    <AppProvider
      user={{ discordId: user.discordId, name: user.name, avatarUrl: user.avatarUrl, roles: user.roles }}
      permissions={[...permissionsFor(user)]}
      csrf={csrf}
      locale={locale}
      providerKind={getProvider().kind}
    >
      <ToastProvider>
        <SoundProvider initialMuted={prefs.muted}>
          <LiveProvider>
            <Shell>{children}</Shell>
          </LiveProvider>
        </SoundProvider>
      </ToastProvider>
    </AppProvider>
  );
}
