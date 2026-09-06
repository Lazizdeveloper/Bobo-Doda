"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { UserDetailDrawer } from "@/components/admin/UserDetailDrawer";
import {
  listUsersQueue,
  findUserById,
  getUserDetail,
  type AdminPage,
  type AdminUserRow,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useAdminDeepLink } from "@/lib/hooks/useAdminDeepLink";
import { formatDate } from "@/lib/format";

export default function UserManagementPage() {
  const [page, setPage] = useState<AdminPage<AdminUserRow> | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [tab, setTab] = useState<"all" | "buyer" | "specialist">("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "blocked" | "deactivated">("all");
  const [kycFilter, setKycFilter] = useState<string>("all");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selected User for Drawer inspection
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  /* Tanlangan foydalanuvchining bog'liq yozuvlari — ALOHIDA chaqiruv */
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof getUserDetail>
  > | null>(null);

  /* Qidiruv debounce bilan */
  const debouncedSearch = useDebouncedValue(search, 300);

  /* SERVER tomonida filtrlanadi va sahifalanadi; moderatsiya va KYC holati
     qatorga server tomonida biriktirilgan (`AdminUserRow`). */
  const load = useCallback(() => {
    setLoadError(null);
    listUsersQueue({
      page: currentPage,
      perPage: rowsPerPage,
      search: debouncedSearch,
      status: statusFilter,
      category: tab === "buyer" ? "xaridor" : tab === "specialist" ? "mutaxassis" : "all",
      severity: kycFilter,
    })
      .then(setPage)
      .catch(setLoadError);
  }, [currentPage, rowsPerPage, debouncedSearch, statusFilter, tab, kycFilter]);

  useEffect(load, [load]);

  /* Kartochka ochilganda bog'liq yozuvlar yuklanadi */
  useEffect(() => {
    if (!selectedUser) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    getUserDetail(selectedUser.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedUser]);

  /* Global qidiruvdan kelgan deep-link — yozuvni topib ochadi */
  useAdminDeepLink("userId", findUserById, setSelectedUser);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, kycFilter, tab, rowsPerPage]);

  /* KPI — faset sanoqlaridan */
  const facets = page?.facets ?? {};
  const stats = {
    total: facets._all ?? 0,
    buyers: facets["role:xaridor"] ?? 0,
    specialists: facets["role:mutaxassis"] ?? 0,
    blocked: facets.blocked ?? 0,
  };


  /* Holat qatorda tayyor keladi — mijoz endi moderatsiya jadvalini
     ko'rmaydi. */
  const getUserStatusInfo = (u: AdminUserRow) => {
    if (u.moderationStatus === "suspended")
      return { status: "suspended", label: "To‘xtatilgan", tone: "warning" as BadgeTone };
    if (u.moderationStatus === "blocked")
      return { status: "blocked", label: "Bloklangan", tone: "danger" as BadgeTone };
    if (u.moderationStatus === "deactivated")
      return { status: "deactivated", label: "Deaktivatsiya", tone: "neutral" as BadgeTone };
    if (u.moderationStatus === "deleted")
      return { status: "deleted", label: "O‘chirilgan", tone: "neutral" as BadgeTone };
    return { status: "active", label: "Faol", tone: "success" as BadgeTone };
  };

  const columns: TableColumn<AdminUserRow>[] = [
    {
      key: "fullName",
      header: "Foydalanuvchi",
      render: (u) => {
        return (
          <div className="flex items-center gap-3">
            <Avatar name={u.fullName} src={u.avatarUrl} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-ink truncate">{u.fullName}</span>
                {u.kycStatus === "tasdiqlangan" && (
                  <span className="text-primary text-xs" title="Tasdiqlangan shaxs">✓</span>
                )}
              </div>
              <p className="text-2xs text-muted font-mono">{u.id}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "phone",
      header: "Telefon",
      render: (u) => <span className="font-mono text-xs text-ink">{u.phone}</span>,
    },
    {
      key: "role",
      header: "Roli",
      render: (u) => (
        <Badge tone={u.role === "mutaxassis" ? "primary" : "neutral"} size="sm">
          {u.role === "mutaxassis" ? "Mutaxassis" : "Xaridor"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Holat",
      render: (u) => {
        const info = getUserStatusInfo(u);
        return (
          <Badge tone={info.tone} size="sm">
            {info.label}
          </Badge>
        );
      },
    },
    {
      key: "kyc",
      header: "KYC",
      render: (u) => {
        const statusMap: Record<string, { label: string; tone: BadgeTone }> = {
          tasdiqlangan: { label: "Tasdiqlangan", tone: "success" },
          korib_chiqilmoqda: { label: "Kutilmoqda", tone: "warning" },
          rad_etilgan: { label: "Rad etilgan", tone: "danger" },
          boshlanmagan: { label: "Boshlanmagan", tone: "neutral" },
        };
        const res = statusMap[u.kycStatus] || { label: "Yo'q", tone: "neutral" };
        return <Badge tone={res.tone} size="sm">{res.label}</Badge>;
      },
    },
    {
      key: "createdAt",
      header: "Ro‘yxatdan o‘tgan",
      render: (u) => <span className="text-xs text-muted">{formatDate(u.createdAt)}</span>,
    },
    {
      key: "action",
      header: "Amallar",
      render: (u) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedUser(u)}
          className="text-xs"
        >
          Boshqarish →
        </Button>
      ),
    },
  ];

  /* XATO HOLATI YUKLANISH HOLATIDAN OLDIN tekshiriladi. Ilgari tartib
     teskari edi va bu butun admin panelida bir xil xatoga olib kelardi:
     yuklash yiqilsa holat `null` bo'lib qolar, birinchi shart
     ishlab "Yuklanmoqda..." qaytarardi va pastdagi `<ErrorState>` bloki
     HECH QACHON chizilmasdi — operator abadiy "yuklanmoqda" ekranini
     ko'rar, qayta urinish tugmasi esa o'lik kod edi. */
  if (loadError) {
    return (
      <div className="space-y-6">
      <AdminPageHeader
        title="Foydalanuvchilar Boshqaruvi & Nazorati"
        description="Bozor ishtirokchilari profillari, tekshiruv fayllari, faollik ko‘rsatkichlari va sanktsiyalar nazorati."
      />
        <ErrorState error={loadError} onRetry={load} />
      </div>
    );
  }

  if (!page) return <p className="text-muted">Yuklanmoqda...</p>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Foydalanuvchilar Boshqaruvi & Nazorati"
        description="Bozor ishtirokchilari profillari, tekshiruv fayllari, faollik ko‘rsatkichlari va sanktsiyalar nazorati."
      />

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jami Foydalanuvchilar" value={stats.total} detail="Barcha ro'yxatdan o'tganlar" />
        <MetricCard label="Xaridorlar" value={stats.buyers} detail="Buyurtmachi kompaniyalar" tone="primary" />
        <MetricCard label="Mutaxassislar" value={stats.specialists} detail="Freelancer mutaxassislar" tone="success" />
        <MetricCard label="Bloklanganlar" value={stats.blocked} detail="Cheklov o'rnatilgan hisoblar" tone="danger" />
      </section>

      {/* Filters and Search */}
      <Card padding="md" className="space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Tab buttons */}
          <div className="flex border-b border-line overflow-x-auto max-w-full pb-0.5">
            {[
              { id: "all", label: "Barcha foydalanuvchilar" },
              { id: "buyer", label: `Xaridorlar (${stats.buyers})` },
              { id: "specialist", label: `Mutaxassislar (${stats.specialists})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as "all" | "buyer" | "specialist")}
                className={`border-b-2 px-4 py-2 font-heading text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Holat bo'yicha filtr"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "suspended" | "blocked" | "deactivated")}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
            >
              <option value="all">Barcha holatlar</option>
              <option value="active">Faol</option>
              <option value="suspended">To‘xtatilgan</option>
              <option value="blocked">Bloklangan</option>
              <option value="deactivated">Deaktiv</option>
            </select>

            <select
              aria-label="KYC bo'yicha filtr"
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
            >
              <option value="all">Barcha KYC</option>
              <option value="tasdiqlangan">Tasdiqlangan</option>
              <option value="korib_chiqilmoqda">Ko‘rib chiqilmoqda</option>
              <option value="rad_etilgan">Rad etilgan</option>
              <option value="boshlanmagan">Boshlanmagan</option>
            </select>

            <div className="w-full sm:w-64">
              <Input
                aria-label="Qidirish"
                placeholder="Ism, telefon yoki ID bo'yicha qidiruv..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <div className="mt-4">
        {page.items.length ? (
          <>
            <Table
              columns={columns}
              rows={page.items}
              rowKey={(u) => u.id}
              renderMobileCard={(u) => {
                const info = getUserStatusInfo(u);
                return (
                  <div className="flex items-start justify-between gap-3 p-3 border border-line rounded-xl bg-card">
                    <div className="flex gap-2.5 min-w-0 flex-1">
                      <Avatar name={u.fullName} src={u.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate">{u.fullName}</p>
                        <p className="text-2xs text-muted">ID: {u.id}</p>
                        <p className="text-xs text-ink font-mono mt-0.5">{u.phone}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge tone={u.role === "mutaxassis" ? "primary" : "neutral"} size="sm">
                            {u.role}
                          </Badge>
                          <Badge tone={info.tone} size="sm">
                            {info.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelectedUser(u)} className="text-xs shrink-0">
                      Ko‘rish
                    </Button>
                  </div>
                );
              }}
            />
            <Pagination
              currentPage={page.page}
              totalPages={page.totalPages}
              onPageChange={setCurrentPage}
              totalRows={page.total}
              rowsPerPage={page.perPage}
              onRowsPerPageChange={setRowsPerPage}
            />
          </>
        ) : (
          <Card className="py-12 text-center text-xs text-muted">
            Tanlangan filtrlarga mos keluvchi foydalanuvchilar topilmadi.
          </Card>
        )}
      </div>

      {/* User Detail Inspection Drawer Modal */}
      {selectedUser && (
        <UserDetailDrawer
          user={selectedUser}
          open={Boolean(selectedUser)}
          onClose={() => setSelectedUser(null)}
          onUpdated={() => {
            load();
            if (selectedUser) {
              /* Drawer ochiq turgan foydalanuvchining bog'liq yozuvlari
                 amaldan keyin qayta o'qiladi (holat o'zgargan). */
              getUserDetail(selectedUser.id)
                .then(setDetail)
                .catch(() => setDetail(null));
            }
          }}
          allContracts={detail?.contracts ?? []}
          allServices={detail?.services ?? []}
          allJobs={detail?.jobs ?? []}
          allVerifications={detail?.verifications ?? []}
          moderationInfo={detail?.moderation}
        />
      )}
    </div>
  );
}
