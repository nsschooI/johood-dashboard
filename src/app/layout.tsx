import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "./globals.css";
import { dirOf } from "@/lib/i18n";
import { getLocale } from "@/lib/server/i18n";

export const metadata: Metadata = {
  title: { default: "JoHood Dashboard", template: "%s · JoHood" },
  description: "Control center for the JoHood Discord bots and the JoHood Catalog game.",
  robots: { index: false, follow: false },
};

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
