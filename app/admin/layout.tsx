"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Sidebar, type SidebarItem } from "@/components/ui/Sidebar";
import { Logo } from "@/components/shared/Logo";
import { SkipLink } from "@/components/shared/SkipLink";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { adminLogout, getCurrentAdmin } from "@/lib/api/admin";
import type { AdminAccount, AdminPermission } from "@/lib/admin-types";

function Icon({ children }: { children: string }) {
  return (
    <span className="grid h-5 w-5 place-items-center rounded bg-card-hover text-[10px] font-bold">
      {children}
    </span>
  );
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

  if (!ready) return null;
  if (isLogin) return children;

  const operationalItems: SidebarItem[] = [
    ["dashboard", "/admin", "Boshqaruv", "DB", true],
    ["users", "/admin/foydalanuvchilar", "Foydalanuvchilar", "US"],
    ["kyc", "/admin/verifikatsiya", "KYC navbati", "ID"],
    ["disputes", "/admin/nizolar", "Nizolar", "DS"],
    ["payments", "/admin/tolovlar", "To‘lovlar", "₿"],
    ["support", "/admin/yordam", "Yordam so‘rovlari", "SP"],
  ].filter(([permission]) => admin?.permissions.includes(permission as AdminPermission)).map(([, href, label, icon, exact]) => ({
    href: String(href), label: String(label), icon: <Icon>{String(icon)}</Icon>, exact: Boolean(exact),
  }));
  const items: SidebarItem[] = [
    ...operationalItems,
    ...(admin?.role === "super_admin"
      ? [{ href: "/admin/super/adminlar", label: "Adminlar", icon: <Icon>SA</Icon> }]
      : []),
  ];

  function logout() {
    const loginPath = admin?.role === "super_admin" ? "/rahbariyat/kirish" : "/admin/kirish";
    adminLogout();
    router.replace(loginPath);
  }

  return (
    <div className="min-h-screen bg-bg">
      <SkipLink />
      <Sidebar
        items={items}
        brand={<Logo href="/admin" />}
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex flex-col gap-2">
            <div className="min-w-0 px-2">
              <Badge tone={admin?.role === "super_admin" ? "danger" : "primary"}>
                {admin?.role === "super_admin" ? "Super Admin" : "Admin"}
              </Badge>
              <p className="mt-2 truncate text-xs font-semibold text-ink">{admin?.fullName}</p>
              <p className="truncate text-2xs text-faint">{admin?.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>Chiqish</Button>
          </div>
        }
      />
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label="Menyuni ochish"
            onClick={() => setOpen(true)}
            className="rounded-btn border border-line bg-card p-2 text-ink lg:hidden"
          >
            <span aria-hidden="true">☰</span>
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:inline">Operatsion markaz</span>
            <span className="h-2 w-2 rounded-full bg-success" aria-label="Tizim ishlayapti" />
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
  if (pathname.startsWith("/admin/verifikatsiya")) return "kyc";
  if (pathname.startsWith("/admin/nizolar")) return "disputes";
  if (pathname.startsWith("/admin/tolovlar")) return "payments";
  if (pathname.startsWith("/admin/yordam")) return "support";
  if (pathname.startsWith("/admin/super/adminlar")) return "admins";
  return null;
}
