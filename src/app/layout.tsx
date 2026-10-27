import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "./globals.css";
import { dirOf } from "@/lib/i18n";
import { getLocale } from "@/lib/server/i18n";
import { getGuildIdentity, realUrl } from "@/lib/server/identity";

export async function generateMetadata(): Promise<Metadata> {
  const main = await getGuildIdentity("main");
  const icon = realUrl(main?.iconUrl);
  const banner = realUrl(main?.bannerUrl);
  const description = main?.description ?? "Control center for the JoHood Discord bots and the JoHood Catalog game.";
  return {
    title: { default: "JoHood", template: "JoHood · %s" },
    description,
    robots: { index: false, follow: false },
    // Favicon from the server icon when the backend provides one; otherwise app/icon.svg.
    icons: icon ? { icon: [{ url: icon }], apple: [{ url: icon }] } : undefined,
    openGraph: {
      title: "JoHood Dashboard",
      description,
      siteName: main?.name ?? "JoHood",
      images: banner ? [{ url: banner }] : icon ? [{ url: icon }] : undefined,
    },
    twitter: { card: banner ? "summary_large_image" : "summary", title: "JoHood Dashboard", description },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0a10",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={dirOf(locale)} className="h-full">
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
