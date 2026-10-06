"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/shared/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { LangSwitch } from "@/components/shared/LangSwitch";
import { authService, usersService, DATA_CHANGED_EVENT } from "@/lib/api";
import { useT } from "@/lib/i18n";

export interface TopNavProps {
  base: string;
}

export function TopNav({ base }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  const [name, setName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  function handleLogout() {
    authService.logout();
    router.push("/kirish");
  }

  useEffect(() => {
    function refresh() {
      usersService.getCurrent().then((user) => {
        if (user) setName(user.fullName);
      }).catch(() => {});
    }
    refresh();
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen && !activeDropdown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setActiveDropdown(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, activeDropdown]);

  function handleDropdownEnter(key: string) {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(key);
  }

  function handleDropdownLeave() {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  }

  const bozorSubItems = [
    { href: "/xaridor/bozor?tab=services", label: t("nav.bozorServices"), icon: "🛍️" },
    { href: "/xaridor/bozor?tab=jobs", label: t("nav.bozorJobs"), icon: "💼" },
    { href: "/xaridor/bozor?tab=specialists", label: t("nav.bozorSpecialists"), icon: "👥" },
  ];



  const isBozorActive = pathname.startsWith("/xaridor/bozor");
  const isContractsActive = pathname.startsWith("/xaridor/shartnomalar");
  const isMessagesActive = pathname.startsWith("/xaridor/xabarlar");
  const isDashboardActive = pathname === "/xaridor";

  return (
    <header className="sticky top-0 z-30 w-full border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6 lg:gap-8">
          <Logo href={base} />

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Boshqaruv */}
            <Link
              href="/xaridor"
              className={`px-3 py-2 rounded-btn text-sm font-medium transition-colors ${
                isDashboardActive
                  ? "bg-primary/10 text-primary-deep font-semibold"
                  : "text-muted hover:bg-card-hover hover:text-ink"
              }`}
            >
              {t("nav.dashboard")}
            </Link>

            {/* Bozor Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleDropdownEnter("bozor")}
              onMouseLeave={handleDropdownLeave}
            >
              <Link
                href="/xaridor/bozor"
                className={`flex items-center gap-1 px-3 py-2 rounded-btn text-sm font-medium transition-colors ${
                  isBozorActive
                    ? "bg-primary/10 text-primary-deep font-semibold"
                    : "text-muted hover:bg-card-hover hover:text-ink"
                }`}
                aria-expanded={activeDropdown === "bozor"}
              >
                <span>{t("nav.market")}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className={`transition-transform duration-200 ${
                    activeDropdown === "bozor" ? "rotate-180 text-primary" : "text-muted"
                  }`}
                >
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>

              {activeDropdown === "bozor" && (
                <div className="absolute left-0 top-full pt-1.5 w-56 z-50 animate-in fade-in-0 zoom-in-95">
                  <div className="rounded-xl border border-line bg-surface p-1.5 shadow-lg">
                    {bozorSubItems.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-btn text-xs font-semibold text-ink hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <span className="text-base">{sub.icon}</span>
                        <span>{sub.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>



            {/* Shartnomalar */}
            <Link
              href="/xaridor/shartnomalar"
              className={`px-3 py-2 rounded-btn text-sm font-medium transition-colors ${
                isContractsActive
                  ? "bg-primary/10 text-primary-deep font-semibold"
                  : "text-muted hover:bg-card-hover hover:text-ink"
              }`}
            >
              {t("nav.contracts")}
            </Link>

            {/* Xabarlar */}
            <Link
              href="/xaridor/xabarlar"
              className={`px-3 py-2 rounded-btn text-sm font-medium transition-colors ${
                isMessagesActive
                  ? "bg-primary/10 text-primary-deep font-semibold"
                  : "text-muted hover:bg-card-hover hover:text-ink"
              }`}
            >
              {t("nav.messages")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/xaridor/elonlarim/yangi"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-btn bg-primary text-white hover:bg-primary-deep transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {t("bjobs.post")}
          </Link>


          <LangSwitch />

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 text-muted hover:text-ink"
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
            <Link href="/xaridor/xarajatlar" className="text-xs font-medium text-muted hover:text-ink">
              {t("nav.spending")}
            </Link>
            <Link href="/xaridor/yordam" className="text-xs font-medium text-muted hover:text-ink">
              {t("nav.help")}
            </Link>
            <Link
              href="/xaridor/sozlamalar"
              aria-label={t("nav.settings")}
              className="rounded-full"
            >
              <Avatar name={name || "?"} size="sm" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-medium text-muted hover:text-danger"
            >
              {t("common.logout")}
            </button>
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
            <Link
              href="/xaridor/elonlarim/yangi"
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-btn text-sm font-semibold bg-primary text-white hover:bg-primary-deep shadow-sm mb-1"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {t("bjobs.post")}
            </Link>

            <Link href="/xaridor" className="block px-3 py-2 rounded-btn text-sm font-semibold text-ink hover:bg-card-hover">
              {t("nav.dashboard")}
            </Link>

            {/* Bozor with sub-items */}
            <div className="flex flex-col gap-1 border-y border-line/60 py-2 my-1">
              <Link href="/xaridor/bozor" className="px-3 py-1 text-sm font-bold text-ink">
                {t("nav.market")}
              </Link>
              <div className="pl-4 flex flex-col gap-1">
                {bozorSubItems.map((sub) => (
                  <Link key={sub.href} href={sub.href} className="px-3 py-1.5 rounded-btn text-xs font-medium text-muted hover:text-ink hover:bg-card-hover flex items-center gap-2">
                    <span>{sub.icon}</span>
                    <span>{sub.label}</span>
                  </Link>
                ))}
              </div>
            </div>



            <Link href="/xaridor/shartnomalar" className="block px-3 py-2 rounded-btn text-sm font-medium text-ink hover:bg-card-hover">
              {t("nav.contracts")}
            </Link>
            <Link href="/xaridor/xabarlar" className="block px-3 py-2 rounded-btn text-sm font-medium text-ink hover:bg-card-hover">
              {t("nav.messages")}
            </Link>
            <Link href="/xaridor/xarajatlar" className="block px-3 py-2 rounded-btn text-sm font-medium text-ink hover:bg-card-hover">
              {t("nav.spending")}
            </Link>
            <Link href="/xaridor/yordam" className="block px-3 py-2 rounded-btn text-sm font-medium text-ink hover:bg-card-hover">
              {t("nav.help")}
            </Link>
            <Link href="/xaridor/sozlamalar" className="block px-3 py-2 rounded-btn text-sm font-medium text-ink hover:bg-card-hover">
              {t("nav.settings")}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-btn text-sm font-medium text-danger hover:bg-card-hover"
            >
              {t("common.logout")}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
