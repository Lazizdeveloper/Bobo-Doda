"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import { Logo } from "@/components/shared/Logo";
import { SkipLink } from "@/components/shared/SkipLink";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";
import { adminLogout, getCurrentAdmin, getAdminData } from "@/lib/api/admin";
import type { AdminAccount, AdminPermission } from "@/lib/admin-types";

interface NavItem {
  permission: AdminPermission;
  href: string;
  label: string;
  icon: string;
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
  }, [isLogin, pathname, router]);

  // Real-time badge indicators for actionable operations
  const counts = useMemo(() => {
    if (typeof window === "undefined") return { kyc: 0, disputes: 0, payouts: 0, reports: 0, tickets: 0, appeals: 0 };
    try {
      const data = getAdminData();
      return {
        kyc: data.verifications.filter((v) => v.status === "korib_chiqilmoqda").length,
        disputes: data.disputes.filter((d) => d.status === "ochiq" || d.status === "korib_chiqilmoqda").length,
        payouts: data.withdrawals.filter((w) => w.status === "kutilmoqda").length,
        reports: data.reports.filter((r) => r.status === "new" || r.status === "investigating").length,
        tickets: data.tickets.filter((t) => t.status === "ochiq").length,
        appeals: data.appeals.filter((a) => a.status === "pending").length,
      };
    } catch {
      return { kyc: 0, disputes: 0, payouts: 0, reports: 0, tickets: 0, appeals: 0 };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!ready) return null;
  if (isLogin) return children;

  const navGroups: NavGroup[] = [
    {
      title: "Boshqaruv",
      items: [
        { permission: "dashboard", href: "/admin", label: "Boshqaruv Paneli", icon: "📊", exact: true },
      ],
    },
    {
      title: "Bozor & Loyihalar",
      items: [
        { permission: "users", href: "/admin/foydalanuvchilar", label: "Foydalanuvchilar", icon: "👥" },
        { permission: "services", href: "/admin/xizmatlar", label: "Xizmatlar Moderatsiyasi", icon: "💼" },
        { permission: "jobs", href: "/admin/loyihalar", label: "Mijoz Loyihalari", icon: "📌" },
        { permission: "orders", href: "/admin/shartnomalar", label: "Shartnomalar & Buyurtmalar", icon: "📋" },
      ],
    },
    {
      title: "Ishonch & Xavfsizlik",
      items: [
        { permission: "kyc", href: "/admin/verifikatsiya", label: "KYC & Shaxs Tasdig‘i", icon: "🛡️", badgeCount: counts.kyc },
        { permission: "disputes", href: "/admin/nizolar", label: "Nizolar & Arbitraj", icon: "⚖️", badgeCount: counts.disputes },
        { permission: "reports", href: "/admin/shikoyatlar", label: "Shikoyatlar & Xavflar", icon: "🚨", badgeCount: counts.reports },
        { permission: "appeals", href: "/admin/apellyatsiyalar", label: "Apellyatsiyalar", icon: "🔄", badgeCount: counts.appeals },
        { permission: "reviews", href: "/admin/sharhlar", label: "Sharhlar Moderatsiyasi", icon: "⭐" },
      ],
    },
    {
      title: "Moliya & Xizmat",
      items: [
        { permission: "payments", href: "/admin/tolovlar", label: "To‘lovlar & Escrow", icon: "💳", badgeCount: counts.payouts },
        { permission: "support", href: "/admin/yordam", label: "Yordam Chiptalari", icon: "🎫", badgeCount: counts.tickets },
      ],
    },
    {
      title: "Tizim & Sozlamalar",
      items: [
        { permission: "categories", href: "/admin/kategoriyalar", label: "Kategoriyalar", icon: "🗂️" },
        { permission: "settings", href: "/admin/sozlamalar", label: "Platforma Sozlamalari", icon: "⚙️" },
        { permission: "audit", href: "/admin/audit", label: "Audit Jurnali", icon: "📜" },
        ...(admin?.role === "super_admin"
          ? [{ permission: "admins" as AdminPermission, href: "/admin/super/adminlar", label: "Adminlar & Rollar", icon: "👑" }]
          : []),
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
                    <span className="text-sm shrink-0">{item.icon}</span>
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
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted hover:text-ink"
              >
                ✕
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
  if (pathname.startsWith("/admin/kategoriyalar")) return "categories";
  if (pathname.startsWith("/admin/sozlamalar")) return "settings";
  if (pathname.startsWith("/admin/audit")) return "audit";
  if (pathname.startsWith("/admin/super/adminlar")) return "admins";
  return null;
}

