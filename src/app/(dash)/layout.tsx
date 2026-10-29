import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppProvider } from "@/components/providers/app-provider";
import { AttentionProvider } from "@/components/providers/attention-provider";
import { GuildProvider } from "@/components/providers/guild-provider";
import { LiveProvider } from "@/components/providers/live-provider";
import { NotificationsProvider } from "@/components/providers/notifications-provider";
import { SoundProvider } from "@/components/providers/sound-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { Shell } from "@/components/shell/shell";
import { permissionsFor } from "@/lib/permissions";
import { getProvider } from "@/lib/provider";
import { GUILD_COOKIE } from "@/lib/server/guild";
import { getLocale } from "@/lib/server/i18n";
import { getShellData } from "@/lib/server/queries";
import { requireSession } from "@/lib/server/session";
import { getPrefs } from "@/lib/server/store";
import { DEFAULT_GUILD, isGuildKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, csrf } = await requireSession();
  const [locale, jar, shell] = await Promise.all([getLocale(), cookies(), getShellData(user)]);
  const prefs = getPrefs(user.discordId);
  const cookieGuild = jar.get(GUILD_COOKIE)?.value;
  const initialGuild = isGuildKey(cookieGuild) ? cookieGuild : (prefs.guild ?? DEFAULT_GUILD);
  return (
    <AppProvider
      user={{ discordId: user.discordId, name: user.name, avatarUrl: user.avatarUrl, roles: user.roles }}
      permissions={[...permissionsFor(user)]}
      overrides={user.overrides ?? { allow: [], deny: [] }}
      csrf={csrf}
      locale={locale}
      providerKind={getProvider().kind}
    >
      <GuildProvider guilds={shell.guilds} initial={initialGuild}>
        <ToastProvider>
          <SoundProvider initialMuted={prefs.muted}>
            <LiveProvider>
              <AttentionProvider seed={shell.attention}>
                <NotificationsProvider seed={shell.activity}>
                  <Shell>{children}</Shell>
                </NotificationsProvider>
              </AttentionProvider>
            </LiveProvider>
          </SoundProvider>
        </ToastProvider>
      </GuildProvider>
    </AppProvider>
  );
}
