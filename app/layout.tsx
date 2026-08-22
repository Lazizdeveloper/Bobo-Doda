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

export const metadata: Metadata = {
  title: "Bobo&Doda — Mutaxassislar bozori",
  description:
    "Markaziy Osiyo mutaxassislari uchun to'lov kafolati bilan ishlaydigan onlayn bozor",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className="font-sans antialiased">
        <LanguageProvider>
          <ToastProvider>
            <SupportModalProvider>
              <OfflineSupport />
              {children}
            </SupportModalProvider>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
