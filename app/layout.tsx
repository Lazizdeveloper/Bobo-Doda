import type { Metadata, Viewport } from "next";
import "@fontsource/onest/400.css";
import "@fontsource/onest/500.css";
import "@fontsource/onest/700.css";
import "@fontsource/unbounded/700.css";
import "@fontsource/unbounded/800.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/Toast";
import { OfflineSupport } from "@/components/shared/OfflineSupport";
import { SupportModalProvider } from "@/components/shared/SupportModalProvider";
import { PageFeedbackWidget } from "@/components/shared/PageFeedbackWidget";

const SITE_URL = "https://bobololadono.uz";
const TITLE = "Bobololadono — Mutaxassislar bozori";
const DESCRIPTION =
  "Markaziy Osiyo mutaxassislari uchun to'lov kafolati bilan ishlaydigan onlayn bozor";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bobololadono",
  },
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Bobololadono",
    locale: "uz_UZ",
    type: "website",
    images: [{ url: "/logo.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/logo.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#FF7A1A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <LanguageProvider>
          <ToastProvider>
            <SupportModalProvider>
              <OfflineSupport />
              {children}
              <PageFeedbackWidget />
            </SupportModalProvider>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
