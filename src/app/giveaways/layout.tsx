import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Floaters } from "@/components/giveaways/floaters";
import { GwFooter } from "@/components/giveaways/footer";
import { GwHeader } from "@/components/giveaways/header";
import { GwProvider } from "@/components/giveaways/gw-provider";
import { AppProvider } from "@/components/providers/app-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { PageTransition } from "@/components/shell/page-transition";
import { getProvider } from "@/lib/provider";
import { defaultBanners, getGwTheme } from "@/lib/server/giveaways";
import { getLocale } from "@/lib/server/i18n";
import { getMemberSession } from "@/lib/server/member-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Giveaways · السحوبات", template: "%s · JoHood Giveaways" },
  description: "JoHood giveaways — follow, authorize and join. سحوبات جوهود.",
  openGraph: { title: "JoHood Giveaways · سحوبات جوهود", siteName: "JoHood" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#150d11" },
  ],
  colorScheme: "light dark",
};

/**
 * Public area for ordinary Discord members. It has its own session
 * (`jh_member`), never the staff one, and no staff permissions: the
 * AppProvider here is only used for language and formatting.
 */
export default async function GiveawaysLayout({ children }: { children: ReactNode }) {
  const [session, locale, theme] = await Promise.all([getMemberSession(), getLocale(), getGwTheme()]);
  return (
    <AppProvider user={null} permissions={[]} csrf="" locale={locale} providerKind={getProvider().kind}>
      <ToastProvider>
        <GwProvider member={session?.member ?? null} csrf={session?.csrf ?? ""} banners={defaultBanners()} initialTheme={theme}>
          <a href="#gw-main" className="sr-only z-50 rounded-full bg-[#e11d48] px-4 py-2 text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
            {locale === "ar" ? "انتقل للمحتوى" : "Skip to content"}
          </a>
          <Floaters />
          <GwHeader />
          <main id="gw-main" className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16 sm:px-6 sm:pt-8">
            <PageTransition>{children}</PageTransition>
          </main>
          <GwFooter />
        </GwProvider>
      </ToastProvider>
    </AppProvider>
  );
}
