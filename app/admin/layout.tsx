"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/shared/Logo";
import { SkipLink } from "@/components/shared/SkipLink";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";
import { AdminIcon, type AdminIconName } from "@/components/admin/AdminIcon";
import { adminLogout, getCurrentAdmin, getAdminCounters } from "@/lib/api/admin";
import { DATA_CHANGED_EVENT } from "@/lib/api";
import type { AdminAccount, AdminPermission } from "@/lib/admin-types";

import { feedbackService } from "@/lib/feedback";

/** Badge hisoblagichlarining boshlang'ich (yuklanmagan) holati */
const EMPTY_COUNTS = {
  kyc: 0,
  disputes: 0,
  payouts: 0,
  reports: 0,
  tickets: 0,
  appeals: 0,
  feedbacks: 0,
};

interface NavItem {
  permission: AdminPermission;
  href: string;
  label: string;
  icon: AdminIconName;
  badgeCount?: number;
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const isLogin = pathname === "/admin/kirish";
  /* Bo'lim 91-J — `mustChangePassword` qattiq darvoza: backend HAR QANDAY
     boshqa amalni `PASSWORD_CHANGE_REQUIRED` bilan rad etadi, shuning
     uchun UI ham shu holatda faqat shu sahifaga ruxsat beradi. */
  const isChangePassword = pathname === "/admin/parolni-almashtirish";

  useEffect(() => {
    const current = getCurrentAdmin();
    if (isLogin) {
      if (current) router.replace("/admin");
      else setReady(true);
      return;
    }
    if (!current) {
      const dest = pathname.startsWith("/admin/super")
        ? "/rahbariyat/kirish"
        : "/admin/kirish";
      if (pathname !== dest) router.replace(dest);
      return;
    }
    if (current.mustChangePassword && !isChangePassword) {
      router.replace("/admin/parolni-almashtirish");
      return;
    }
    if (isChangePassword) {
      setAdmin(current);
      setReady(true);
      return;
    }
    if (pathname.startsWith("/admin/super") && current.role !== "super_admin") {
      if (pathname !== "/admin/ruxsat-yoq") router.replace("/admin/ruxsat-yoq");
      return;
    }
    const permission = routePermission(pathname);
    if (permission && !current.permissions.includes(permission)) {
      if (pathname !== "/admin/ruxsat-yoq") router.replace("/admin/ruxsat-yoq");
      return;
    }
    setAdmin(current);
    setReady(true);
  }, [isLogin, isChangePassword, pathname, router]);

  /* Mobil menyu Escape bilan yopiladi — modal xatti-harakati (`aria-modal`)
     e'lon qilingan joyda klaviatura bilan chiqib ketolmaslik a11y xatosi. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const [dataVersion, setDataVersion] = useState(0);
  useEffect(() => {
    const bump = () => setDataVersion((v) => v + 1);
    window.addEventListener(DATA_CHANGED_EVENT, bump);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, bump);
  }, []);

  /* Badge hisoblagichlari AGREGAT chaqiruvidan keladi. Ilgari bu yerda
     `getAdminData()` chaqirilardi — ya'ni HAR BIR sahifa almashganda butun
     baza (barcha foydalanuvchi, shartnoma, bosqich, xabar) o'qib chiqilardi,
     faqat oltita raqamni olish uchun. Backend'da bu har navigatsiyada
     o'nlab megabayt tortib olishni anglatardi; `getAdminCounters()` esa
     `COUNT(*) … GROUP BY status` ga to'g'ri keladi.
     `dataVersion` — admin amal bajarganda badge darhol yangilanadi (KYC
     tasdiqlansa boshqa sahifaga o'tmasdan ham raqam kamayadi). */
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  useEffect(() => {
    let cancelled = false;
    getAdminCounters()
      .then((c) => {
        if (cancelled) return;
        setCounts({
          kyc: c.pendingKyc,
          disputes: c.openDisputes,
          payouts: c.pendingWithdrawals,
          reports: c.openReports,
          tickets: c.openTickets,
          appeals: c.pendingAppeals,
          feedbacks: feedbackService.getStats().pending,
        });
      })
      /* Badge — ikkilamchi ma'lumot: yiqilsa eski raqam qoladi va ekranga
         xato chiqarilmaydi (sessiya tugagan bo'lsa guard yo'naltiradi). */
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, dataVersion]);

  if (!ready) return null;
  if (isLogin || isChangePassword) return children;

  /* Bosqich 17 — nav FAQAT real backend'da mavjud bo'lgan bo'limlarga
     qisqartirildi (bo'lim 91-J). Job/Proposal, KYC, Shikoyat/Apellyatsiya/
     Sharh moderatsiyasi, Yordam chiptalari, Platforma sozlamalari, Fikrlar
     — real backendda modeli yo'q. Xizmatlar/Kategoriyalar/Xodimlar
     boshqaruvi HALI ko'chirilmagan (Bosqich 17'ning keyingi bosqichi —
     bo'lim boshidagi `lib/api/admin.ts` izohiga qarang). */
  const navGroups: NavGroup[] = [
    {
      title: "Boshqaruv",
      items: [
        { permission: "dashboard", href: "/admin", label: "Boshqaruv Paneli", icon: "dashboard", exact: true },
      ],
    },
    {
      title: "Bozor",
      items: [
        { permission: "users", href: "/admin/foydalanuvchilar", label: "Foydalanuvchilar", icon: "users" },
        { permission: "orders", href: "/admin/shartnomalar", label: "Shartnomalar", icon: "orders" },
      ],
    },
    {
      title: "Moliya & Nizolar",
      items: [
        { permission: "disputes", href: "/admin/nizolar", label: "Nizolar & Arbitraj", icon: "disputes", badgeCount: counts.disputes },
        { permission: "payments", href: "/admin/tolovlar", label: "To‘lovlar, Qaytarish & Chiqarish", icon: "payments" },
      ],
    },
    {
      title: "Tizim",
      items: [
        { permission: "audit", href: "/admin/audit", label: "Audit Jurnali", icon: "audit" },
        // Bosqich 24 — QA audit: staff-boshqaruv backend'i (`getAdminAccounts`/
        // `addAdmin`/...) hali real emas (`disabledAsync`) — bu yagona
        // sidebar-havola bo'lib, super_admin uni bosganda doim xato
        // ko'rardi. Boshqa "hali ulanmagan" bo'limlar (buyer/seller
        // TopNav'dagi Ish e'lonlari/Takliflar/Xabarlar) bilan bir xil
        // konvensiya: marshrut o'zi qoladi (to'g'ridan-to'g'ri URL orqali
        // ochilsa ErrorState ko'rsatadi), faqat navigatsiyadan olib
        // tashlanadi — real ulanmaguncha qayta qo'shilmasin.
      ],
    },
  ];

  function logout() {
    const loginPath =
      admin?.role === "super_admin" ? "/rahbariyat/kirish" : "/admin/kirish";
    adminLogout();
    router.replace(loginPath);
  }

  const renderNav = (
    <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-3 text-xs">
      {navGroups.map((group) => {
        const permittedItems = group.items.filter((item) =>
          admin?.permissions.includes(item.permission)
        );
        if (permittedItems.length === 0) return null;
        return (
          <div key={group.title} className="space-y-1">
            <p className="px-3 text-3xs font-bold uppercase tracking-wider text-faint">
              {group.title}
            </p>
            {permittedItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                    active
                      ? "bg-primary text-white font-semibold shadow-xs"
                      : "text-muted hover:bg-card-hover hover:text-ink"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <AdminIcon name={item.icon} className="text-current" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badgeCount && item.badgeCount > 0 ? (
                    <span
                      className={`ml-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-3xs font-bold ${
                        active
                          ? "bg-white text-primary"
                          : "bg-danger text-white animate-pulse"
                      }`}
                    >
                      {item.badgeCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-bg">
      <SkipLink />

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center px-6 border-b border-line/60">
          <Logo href="/admin" />
        </div>
        <div className="flex-1 overflow-y-auto py-3">{renderNav}</div>
        <div className="border-t border-line p-3 bg-surface/50">
          <div className="flex flex-col gap-2">
            <div className="min-w-0 px-2">
              <Badge tone={admin?.role === "super_admin" ? "danger" : "primary"}>
                {admin?.role === "super_admin" ? "Super Admin" : "Operator Admin"}
              </Badge>
              <p className="mt-1.5 truncate text-xs font-semibold text-ink">
                {admin?.fullName}
              </p>
              <p className="truncate text-2xs text-faint">{admin?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout} className="w-full text-xs">
              Chiqish
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-xs"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-surface shadow-2xl">
            <div className="flex h-16 items-center justify-between px-6 border-b border-line">
              <Logo href="/admin" />
              <button
                type="button"
                aria-label="Menyuni yopish"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted hover:text-ink"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3">{renderNav}</div>
            <div className="border-t border-line p-3">
              <Button variant="outline" size="sm" onClick={logout} className="w-full text-xs">
                Chiqish
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Global Operations Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-card/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              type="button"
              aria-label="Menyuni ochish"
              onClick={() => setOpen(true)}
              className="rounded-lg border border-line bg-surface p-2 text-ink lg:hidden"
            >
              <span aria-hidden="true">☰</span>
            </button>
            <AdminGlobalSearch />
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span>Bozor Tizimi: Faol</span>
            </div>
            <div className="flex items-center gap-2 border-l border-line pl-4">
              <span className="hidden md:inline-block text-xs font-semibold text-ink">
                {admin?.fullName}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                {admin?.fullName.slice(0, 1).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="workspace-container px-4 py-6 focus:outline-none sm:px-6 sm:py-8 xl:px-10 2xl:px-14"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function routePermission(pathname: string): AdminPermission | null {
  if (pathname === "/admin") return "dashboard";
  if (pathname.startsWith("/admin/foydalanuvchilar")) return "users";
  if (pathname.startsWith("/admin/xizmatlar")) return "services";
  if (pathname.startsWith("/admin/loyihalar")) return "jobs";
  if (pathname.startsWith("/admin/shartnomalar")) return "orders";
  if (pathname.startsWith("/admin/verifikatsiya")) return "kyc";
  if (pathname.startsWith("/admin/nizolar")) return "disputes";
  if (pathname.startsWith("/admin/shikoyatlar")) return "reports";
  if (pathname.startsWith("/admin/apellyatsiyalar")) return "appeals";
  if (pathname.startsWith("/admin/sharhlar")) return "reviews";
  if (pathname.startsWith("/admin/tolovlar")) return "payments";
  if (pathname.startsWith("/admin/yordam")) return "support";
  if (pathname.startsWith("/admin/fikrlar")) return "support";
  if (pathname.startsWith("/admin/kategoriyalar")) return "categories";
  if (pathname.startsWith("/admin/sozlamalar")) return "settings";
  if (pathname.startsWith("/admin/audit")) return "audit";
  if (pathname.startsWith("/admin/super/adminlar")) return "admins";
  return null;
}

