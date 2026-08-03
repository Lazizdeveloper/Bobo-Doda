"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export interface SidebarItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Faqat to'liq mos kelganda faol (masalan, /mutaxassis) */
  exact?: boolean;
}

export interface SidebarProps {
  items: SidebarItem[];
  brand: ReactNode;
  footer?: ReactNode;
  /** Mobil drawer holati */
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ items, brand, footer, open, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Sahifa almashganda mobil drawer yopilsin
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const nav = (
    <nav
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3"
      aria-label="Asosiy"
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm transition-colors duration-150 ${
              active
                ? "relative bg-primary/15 font-semibold text-ink before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-full before:bg-primary"
                : "text-muted hover:bg-card hover:text-ink"
            }`}
          >
            <span className={active ? "text-primary" : "text-faint"} aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-card lg:flex">
        <div className="flex h-16 items-center px-6">{brand}</div>
        {nav}
        {footer && <div className="border-t border-line p-3">{footer}</div>}
      </aside>

      {/* Mobil drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="sb-fade-in absolute inset-0 bg-bg/80"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="sb-fade-in absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-card">
            <div className="flex h-16 items-center justify-between px-6">
              {brand}
              <button
                type="button"
                onClick={onClose}
                aria-label="Menyuni yopish"
                className="rounded p-1 text-muted transition-colors duration-150 hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {nav}
            {footer && <div className="border-t border-line p-3">{footer}</div>}
          </aside>
        </div>
      )}
    </>
  );
}
