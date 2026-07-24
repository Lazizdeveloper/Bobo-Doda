"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Sidebar, type SidebarItem } from "@/components/ui/Sidebar";
import { Header } from "@/components/shared/Header";
import { Logo } from "@/components/shared/Logo";
import { getSession } from "@/lib/mock-api";
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
  services: "M4 6h12v10H4V6Zm0 3h12M8 4v2",
  jobs: "M7 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 6h14v10H3V6Zm0 4h14",
  proposals: "M17 3 3 8.2l4.5 1.8L9.5 16l3-4.2L17 3Zm-9.5 7L17 3",
  contracts: "M6 2h6l3 3v13H6V2Zm6 0v3h3M9 9h5M9 12h5M9 15h3",
  messages: "M3 4h14v9H7l-4 3V4Z",
  earnings: "M3 6h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3V6Zm0 0V4h11M13 11h1.5",
  profile: "M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 8a6 6 0 0 1 12 0",
  settings:
    "M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6.5-2.5-1.7-.5.4-1.7-1.5-1.5-1.7.4L11.5 5h-3l-.5 1.7-1.7-.4-1.5 1.5.4 1.7L3.5 10l1.7.5-.4 1.7 1.5 1.5 1.7-.4.5 1.7h3l.5-1.7 1.7.4 1.5-1.5-.4-1.7 1.7-.5Z",
};

export default function MutaxassisLayout({ children }: { children: ReactNode }) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const isOnboarding = pathname === "/mutaxassis/royxat";

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/kirish");
      return;
    }
    if (session.role !== "mutaxassis") {
      router.replace(session.role === "xaridor" ? "/xaridor" : "/rol-tanlash");
      return;
    }
    if (!session.profileDone && !isOnboarding) {
      router.replace("/mutaxassis/royxat");
      return;
    }
    if (session.profileDone && !session.verified) {
      router.replace("/kirish/tasdiqlash");
      return;
    }
    setReady(true);
  }, [router, pathname, isOnboarding]);

  if (!ready) return null;

  if (isOnboarding) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center px-4 sm:px-8">
          <Logo href="/mutaxassis" />
        </header>
        <main className="flex flex-1 justify-center px-4 py-8">
          <div className="w-full max-w-lg">{children}</div>
        </main>
      </div>
    );
  }

  /* Tartib — ish topish oqimi bo'yicha: e'lon → taklif → xizmat → shartnoma → muloqot → pul */
  const items: SidebarItem[] = [
    { href: "/mutaxassis", label: t("nav.dashboard"), icon: <NavIcon path={icons.dashboard} />, exact: true },
    { href: "/mutaxassis/ish-elonlari", label: t("nav.jobs"), icon: <NavIcon path={icons.jobs} /> },
    { href: "/mutaxassis/takliflarim", label: t("nav.proposals"), icon: <NavIcon path={icons.proposals} /> },
    { href: "/mutaxassis/xizmatlarim", label: t("nav.services"), icon: <NavIcon path={icons.services} /> },
    { href: "/mutaxassis/shartnomalar", label: t("nav.contracts"), icon: <NavIcon path={icons.contracts} /> },
    { href: "/mutaxassis/xabarlar", label: t("nav.messages"), icon: <NavIcon path={icons.messages} /> },
    { href: "/mutaxassis/daromad", label: t("nav.earnings"), icon: <NavIcon path={icons.earnings} /> },
    { href: "/mutaxassis/profil", label: t("nav.profile"), icon: <NavIcon path={icons.profile} /> },
    { href: "/mutaxassis/sozlamalar", label: t("nav.settings"), icon: <NavIcon path={icons.settings} /> },
  ];

  return (
    <div className="min-h-screen">
      <Sidebar
        items={items}
        brand={<Logo href="/mutaxassis" />}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="lg:pl-60">
        <Header onMenuClick={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
