"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Sidebar, type SidebarItem } from "@/components/ui/Sidebar";
import { Header } from "@/components/shared/Header";
import { Logo } from "@/components/shared/Logo";
import { SkipLink } from "@/components/shared/SkipLink";
import { getSession } from "@/lib/api";
import { useT } from "@/lib/i18n";

function NavIcon({ path }: { path: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const icons = {
  dashboard: "M3 10.5 10 4l7 6.5M5 9v7h4v-4h2v4h4V9",
  market: "M3 8l1-4h12l1 4M3 8v8h14V8M3 8h14M8 12h4",
  offers: "M17 3 3 8.2l4.5 1.8L9.5 16l3-4.2L17 3Zm-9.5 7L17 3",
  jobs: "M7 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 6h14v10H3V6Zm0 4h14",
  contracts: "M6 2h6l3 3v13H6V2Zm6 0v3h3M9 9h5M9 12h5M9 15h3",
  messages: "M3 4h14v9H7l-4 3V4Z",
  spending: "M3 6h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3V6Zm0 0V4h11M13 11h1.5",
  settings:
    "M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6.5-2.5-1.7-.5.4-1.7-1.5-1.5-1.7.4L11.5 5h-3l-.5 1.7-1.7-.4-1.5 1.5.4 1.7L3.5 10l1.7.5-.4 1.7 1.5 1.5 1.7-.4.5 1.7h3l.5-1.7 1.7.4 1.5-1.5-.4-1.7 1.7-.5Z",
  verify: "M10 2 16 4.5v4.2c0 4-2.5 7.3-6 8.8-3.5-1.5-6-4.8-6-8.8V4.5L10 2Zm-2.5 7 1.7 1.7 3.4-3.4",
  help: "M10 17h.01M7.8 7.5A2.3 2.3 0 0 1 10.1 5c1.4 0 2.5.9 2.5 2.2 0 1.8-2.6 2-2.6 4",
};

export default function XaridorLayout({ children }: { children: ReactNode }) {
  const { t } = useT();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/kirish");
      return;
    }
    if (session.role !== "xaridor") {
      router.replace(session.role === "mutaxassis" ? "/mutaxassis" : "/rol-tanlash");
      return;
    }
    if (!session.verified) {
      router.replace("/kirish/tasdiqlash");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  /* Tartib — yollash oqimi bo'yicha: topish → e'lon → shartnoma → muloqot → pul */
  const items: SidebarItem[] = [
    { href: "/xaridor", label: t("nav.dashboard"), icon: <NavIcon path={icons.dashboard} />, exact: true },
    { href: "/xaridor/bozor", label: t("nav.market"), icon: <NavIcon path={icons.market} /> },
    { href: "/xaridor/takliflarim", label: t("nav.myOffers"), icon: <NavIcon path={icons.offers} /> },
    { href: "/xaridor/elonlarim", label: t("nav.myJobs"), icon: <NavIcon path={icons.jobs} /> },
    { href: "/xaridor/shartnomalar", label: t("nav.contracts"), icon: <NavIcon path={icons.contracts} /> },
    { href: "/xaridor/xabarlar", label: t("nav.messages"), icon: <NavIcon path={icons.messages} /> },
    { href: "/xaridor/xarajatlar", label: t("nav.spending"), icon: <NavIcon path={icons.spending} /> },
    { href: "/xaridor/verifikatsiya", label: t("nav.verification"), icon: <NavIcon path={icons.verify} /> },
    { href: "/xaridor/yordam", label: t("nav.help"), icon: <NavIcon path={icons.help} /> },
    { href: "/xaridor/sozlamalar", label: t("nav.settings"), icon: <NavIcon path={icons.settings} /> },
  ];

  return (
    <div className="min-h-screen">
      <SkipLink />
      <Sidebar
        items={items}
        brand={<Logo href="/xaridor" />}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="lg:pl-60">
        <Header onMenuClick={() => setMenuOpen(true)} base="/xaridor" />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl px-4 py-6 focus:outline-none sm:px-6 sm:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
