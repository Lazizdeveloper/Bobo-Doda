import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Onest, Unbounded } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/Toast";

/* Sarlavha: Unbounded — keng, geometrik, o'ziga xos (kam ishlatiladi) */
const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["700", "800"],
  variable: "--font-unbounded",
});

/* Matn: Onest — kirill uchun mo'ljallab chizilgan, iliq gumanistik */
const onest = Onest({
  subsets: ["latin", "cyrillic"],
  variable: "--font-onest",
});

/* Raqam/summa: bir xil kenglikdagi raqamlar (.sb-num) */
const mono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Bobo&Doda — Mutaxassislar bozori",
  description:
    "Markaziy Osiyo mutaxassislari uchun to'lov kafolati bilan ishlaydigan onlayn bozor",
  /* Statik landing (public/landing.html) bilan bitta manba */
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#08211A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body
        className={`${onest.variable} ${unbounded.variable} ${mono.variable} font-sans antialiased`}
      >
        <LanguageProvider>
          <ToastProvider>{children}</ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
