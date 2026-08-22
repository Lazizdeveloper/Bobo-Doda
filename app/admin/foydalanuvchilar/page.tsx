"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { UserDetailDrawer } from "@/components/admin/UserDetailDrawer";
import { getAdminData } from "@/lib/api/admin";
import { formatDate } from "@/lib/format";
import type { User } from "@/lib/types";

export default function UserManagementPage() {
  const [data, setData] = useState<ReturnType<typeof getAdminData> | null>(null);
  const [tab, setTab] = useState<"all" | "buyer" | "specialist">("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "blocked" | "deactivated">("all");
  const [kycFilter, setKycFilter] = useState<string>("all");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selected User for Drawer inspection
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  function load() {
    setData(getAdminData());
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, kycFilter, tab]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, buyers: 0, specialists: 0, blocked: 0 };
    return {
      total: data.users.length,
      buyers: data.users.filter((u) => u.role === "xaridor").length,
      specialists: data.users.filter((u) => u.role === "mutaxassis").length,
      blocked: data.blockedUserIds.length,
    };
  }, [data]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    return data.users.filter((u) => {
      // 1. Role Filter
      if (tab === "buyer" && u.role !== "xaridor") return false;
      if (tab === "specialist" && u.role !== "mutaxassis") return false;

      // 2. Status Filter
      const isBlocked = data.blockedUserIds.includes(u.id);
      const modDetail = data.moderationDetails[u.id];
      const status = modDetail?.status || (isBlocked ? "blocked" : "active");

      if (statusFilter !== "all" && status !== statusFilter) return false;

      // 3. KYC Filter
      if (kycFilter !== "all") {
        const kyc = data.verifications.find((v) => v.userId === u.id);
        const kycStatus = kyc?.status || "boshlanmagan";
        if (kycStatus !== kycFilter) return false;
      }

      // 4. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [data, tab, statusFilter, kycFilter, search]);

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, currentPage, rowsPerPage]);

  const getUserStatusInfo = (userId: string) => {
    if (!data) return { status: "active", label: "Faol", tone: "success" as BadgeTone };
    const mod = data.moderationDetails[userId];
    const isBlocked = data.blockedUserIds.includes(userId);

    if (mod?.status === "suspended") {
      return { status: "suspended", label: "To‘xtatilgan", tone: "warning" as BadgeTone };
    }
    if (mod?.status === "blocked" || isBlocked) {
      return { status: "blocked", label: "Bloklangan", tone: "danger" as BadgeTone };
    }
    if (mod?.status === "deactivated") {
      return { status: "deactivated", label: "Deaktiv", tone: "neutral" as BadgeTone };
    }
    return { status: "active", label: "Faol", tone: "success" as BadgeTone };
  };

  const columns: TableColumn<User>[] = [
    {
      key: "fullName",
      header: "Foydalanuvchi",
      render: (u) => {
        const kyc = data?.verifications.find((v) => v.userId === u.id);
        return (
          <div className="flex items-center gap-3">
            <Avatar name={u.fullName} src={u.avatarUrl} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-ink truncate">{u.fullName}</span>
                {kyc?.status === "tasdiqlangan" && (
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
        const info = getUserStatusInfo(u.id);
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
        const kyc = data?.verifications.find((v) => v.userId === u.id);
        const statusMap: Record<string, { label: string; tone: BadgeTone }> = {
          tasdiqlangan: { label: "Tasdiqlangan", tone: "success" },
          korib_chiqilmoqda: { label: "Kutilmoqda", tone: "warning" },
          rad_etilgan: { label: "Rad etilgan", tone: "danger" },
          boshlanmagan: { label: "Boshlanmagan", tone: "neutral" },
        };
        const res = statusMap[kyc?.status || "boshlanmagan"] || { label: "Yo'q", tone: "neutral" };
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

  if (!data) return <p className="text-muted">Yuklanmoqda...</p>;

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
          <div className="flex border-b border-line pb-0.5">
            {[
              { id: "all", label: "Barcha foydalanuvchilar" },
              { id: "buyer", label: `Xaridorlar (${stats.buyers})` },
              { id: "specialist", label: `Mutaxassislar (${stats.specialists})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as "all" | "buyer" | "specialist")}
                className={`border-b-2 px-4 py-2 font-heading text-xs font-bold transition-all ${
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
        {filteredUsers.length ? (
          <>
            <Table
              columns={columns}
              rows={paginatedUsers}
              rowKey={(u) => u.id}
              renderMobileCard={(u) => {
                const info = getUserStatusInfo(u.id);
                return (
                  <div className="flex items-start justify-between gap-3 p-3 border border-line rounded-xl bg-card">
                    <div className="flex gap-2.5">
                      <Avatar name={u.fullName} src={u.avatarUrl} size="sm" />
                      <div>
                        <p className="font-semibold text-ink">{u.fullName}</p>
                        <p className="text-2xs text-muted">ID: {u.id}</p>
                        <p className="text-xs text-ink font-mono mt-0.5">{u.phone}</p>
                        <div className="mt-2 flex gap-1.5">
                          <Badge tone={u.role === "mutaxassis" ? "primary" : "neutral"} size="sm">
                            {u.role}
                          </Badge>
                          <Badge tone={info.tone} size="sm">
                            {info.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelectedUser(u)}>
                      Ko‘rish
                    </Button>
                  </div>
                );
              }}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalRows={filteredUsers.length}
              rowsPerPage={rowsPerPage}
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
              const freshData = getAdminData();
              const freshUser = freshData.users.find((u) => u.id === selectedUser.id) || null;
              setSelectedUser(freshUser);
            }
          }}
          allContracts={data.contracts}
          allServices={data.services}
          allJobs={data.jobs}
          allVerifications={data.verifications}
          moderationInfo={data.moderationDetails[selectedUser.id]}
        />
      )}
    </div>
  );
}
