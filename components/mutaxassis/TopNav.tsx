"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shared/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { LangSwitch } from "@/components/shared/LangSwitch";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { usersService, DATA_CHANGED_EVENT } from "@/lib/api";
import { useT } from "@/lib/i18n";

export interface TopNavProps {
  base: string;
}

export function TopNav({ base }: TopNavProps) {
  const pathname = usePathname();
  const { t } = useT();
  const [name, setName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function refresh() {
      usersService.getCurrent().then((user) => {
        if (user) setName(user.fullName);
      }).catch(() => {});
    }
    refresh();
    /* Sozlamalarda ism o'zgarsa avatar harflari ham darhol yangilansin —
       ilgari `refresh` faqat bir marta chaqirilar va sahifa qayta
       yuklanmaguncha eski ism qolardi. */
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, []);

  /* TopNav layout ichida bo'lgani uchun sahifalar orasida qayta mount bo'lmaydi —
     menyu o'zi yopilmasa, yangi sahifa ustida ochiq qolib ketadi. */
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const items = [
    { href: "/mutaxassis", label: t("nav.dashboard"), exact: true },
    { href: "/mutaxassis/ish-elonlari", label: t("nav.jobs") },
    { href: "/mutaxassis/takliflarim", label: t("nav.proposals") },
    { href: "/mutaxassis/xizmatlarim", label: t("nav.services") },
    { href: "/mutaxassis/shartnomalar", label: t("nav.contracts") },
    { href: "/mutaxassis/xabarlar", label: t("nav.messages") },
  ];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo href={base} />

          {/* Desktop Nav */}
          <nav className="hidden lg:flex gap-1">
            {items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-btn text-sm font-medium transition-colors ${
                    active ? "bg-primary/10 text-primary-deep" : "text-muted hover:bg-card-hover hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LangSwitch />
          <NotificationBell />

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 text-muted"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? t("a11y.closeMenu") : t("a11y.openMenu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
             <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          <div className="hidden lg:flex items-center gap-3">
            <Link href="/mutaxassis/daromad" className="text-xs font-medium text-muted hover:text-ink">
              {t("nav.earnings")}
            </Link>
            {/* Yordam sahifasi mavjud edi, lekin unga hech qaysi ekrandan
                havola yo'q edi — mutaxassis yordamga umuman kira olmasdi. */}
            <Link href="/mutaxassis/yordam" className="text-xs font-medium text-muted hover:text-ink">
              {t("nav.help")}
            </Link>
            {/* Avatar `aria-hidden` — havola nomsiz qolmasligi uchun
                aria-label SHART (axe: link-name). */}
            <Link
              href="/mutaxassis/sozlamalar"
              aria-label={t("nav.settings")}
              className="rounded-full"
            >
              <Avatar name={name || "?"} size="sm" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <div
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label={t("a11y.openMenu")}
          className="border-t border-line bg-surface px-4 py-3 lg:hidden"
        >
          <nav className="flex flex-col gap-2">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className="block px-3 py-2 rounded-btn text-sm font-medium text-ink hover:bg-card-hover">
                {item.label}
              </Link>
            ))}
            <Link href="/mutaxassis/daromad" className="block px-3 py-2 rounded-btn text-sm font-medium text-ink hover:bg-card-hover">
               {t("nav.earnings")}
            </Link>
            <Link href="/mutaxassis/yordam" className="block px-3 py-2 rounded-btn text-sm font-medium text-ink hover:bg-card-hover">
               {t("nav.help")}
            </Link>
            <Link href="/mutaxassis/sozlamalar" className="block px-3 py-2 rounded-btn text-sm font-medium text-ink hover:bg-card-hover">
               {t("nav.settings")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
