"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { RatingStars } from "@/components/ui/RatingStars";
import {
  getAdminData,
  suspendUser,
  unsuspendUser,
  deactivateUser,
  softDeleteUser,
} from "@/lib/api/admin";
import { formatDate } from "@/lib/format";
import type { User } from "@/lib/types";

export default function UserManagementPage() {
  const [data, setData] = useState<ReturnType<typeof getAdminData> | null>(null);
  const [tab, setTab] = useState<"all" | "buyer" | "specialist">("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "deactivated" | "deleted">("all");
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection & Modal States
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDays, setSuspendDays] = useState<number | null>(7); // null for permanent
  const [actionLoading, setActionLoading] = useState(false);

  function load() {
    setData(getAdminData());
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, tab]);

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
      const status = modDetail?.status || (isBlocked ? "suspended" : "active");

      if (statusFilter !== "all" && status !== statusFilter) return false;

      // 3. Search Filter
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
  }, [data, tab, statusFilter, search]);

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, currentPage, rowsPerPage]);

  const userModerationInfo = (userId: string) => {
    if (!data) return { status: "active", label: "Faol", tone: "success" as BadgeTone };
    const mod = data.moderationDetails[userId];
    const isBlocked = data.blockedUserIds.includes(userId);

    if (mod?.status === "deleted") {
      return { status: "deleted", label: "O'chirilgan", tone: "danger" as BadgeTone, mod };
    }
    if (mod?.status === "deactivated") {
      return { status: "deactivated", label: "Deaktiv", tone: "neutral" as BadgeTone, mod };
    }
    if (isBlocked || mod?.status === "suspended") {
      return { status: "suspended", label: "Bloklangan", tone: "danger" as BadgeTone, mod };
    }
    return { status: "active", label: "Faol", tone: "success" as BadgeTone, mod };
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      suspendUser(selectedUser.id, suspendReason, suspendDays);
      setSuspendModalOpen(false);
      setSuspendReason("");
      // Refresh details
      const refreshedData = getAdminData();
      setData(refreshedData);
      const updated = refreshedData.users.find((u) => u.id === selectedUser.id);
      if (updated) setSelectedUser(updated);
    } catch {
      alert("Xato yuz berdi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!selectedUser) return;
    if (!confirm("Ushbu foydalanuvchini blokdan chiqarishni tasdiqlaysizmi?")) return;
    setActionLoading(true);
    try {
      unsuspendUser(selectedUser.id);
      const refreshedData = getAdminData();
      setData(refreshedData);
      const updated = refreshedData.users.find((u) => u.id === selectedUser.id);
      if (updated) setSelectedUser(updated);
    } catch {
      alert("Xato yuz berdi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedUser) return;
    if (!confirm("Ushbu foydalanuvchini deaktivatsiya qilishni tasdiqlaysizmi? Tizimga kirish bloklanadi.")) return;
    setActionLoading(true);
    try {
      deactivateUser(selectedUser.id);
      const refreshedData = getAdminData();
      setData(refreshedData);
      const updated = refreshedData.users.find((u) => u.id === selectedUser.id);
      if (updated) setSelectedUser(updated);
    } catch {
      alert("Xato yuz berdi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!selectedUser) return;
    if (!confirm("Foydalanuvchi akkauntini o'chirishni (soft delete) tasdiqlaysizmi? Bu amal orqaga qaytarilmaydi!")) return;
    setActionLoading(true);
    try {
      softDeleteUser(selectedUser.id);
      const refreshedData = getAdminData();
      setData(refreshedData);
      const updated = refreshedData.users.find((u) => u.id === selectedUser.id);
      if (updated) setSelectedUser(updated);
    } catch {
      alert("Xato yuz berdi");
    } finally {
      setActionLoading(false);
    }
  };

  const selectedUserProfile = useMemo(() => {
    if (!selectedUser || !data) return null;
    // Find profile
    if (selectedUser.role === "mutaxassis") {
      // Look in sb2_profiles in localStorage
      try {
        const profiles = JSON.parse(localStorage.getItem("sb2_profiles") || "{}");
        return profiles[selectedUser.id] || null;
      } catch {
        return null;
      }
    }
    return null;
  }, [selectedUser, data]);

  const selectedUserContracts = useMemo(() => {
    if (!selectedUser || !data) return [];
    return data.contracts.filter(
      (c) => c.buyerId === selectedUser.id || c.sellerId === selectedUser.id
    );
  }, [selectedUser, data]);

  const selectedUserTickets = useMemo(() => {
    if (!selectedUser || !data) return [];
    return data.tickets.filter((t) => t.userId === selectedUser.id);
  }, [selectedUser, data]);

  const columns: TableColumn<User>[] = [
    {
      key: "name",
      header: "Foydalanuvchi",
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.fullName} src={u.avatarUrl} size="sm" />
          <div>
            <p className="font-semibold text-ink">{u.fullName}</p>
            <p className="text-2xs text-muted">ID: {u.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Telefon raqam",
      render: (u) => <span className="font-mono text-sm text-ink">{u.phone}</span>,
    },
    {
      key: "role",
      header: "Roli",
      render: (u) => (
        <Badge tone={u.role === "mutaxassis" ? "accent" : "primary"}>
          {u.role === "mutaxassis" ? "Mutaxassis" : "Xaridor"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Holati",
      render: (u) => {
        const info = userModerationInfo(u.id);
        return <Badge tone={info.tone}>{info.label}</Badge>;
      },
    },
    {
      key: "createdAt",
      header: "Ro'yxatdan o'tdi",
      render: (u) => <span className="text-xs text-muted">{formatDate(u.createdAt)}</span>,
    },
    {
      key: "action",
      header: "Batafsil",
      render: (u) => (
        <Button size="sm" variant="secondary" onClick={() => setSelectedUser(u)}>
          Boshqarish
        </Button>
      ),
    },
  ];

  if (!data) return <p className="text-muted">Yuklanmoqda...</p>;

  return (
    <>
      <AdminPageHeader
        title="Foydalanuvchilar boshqaruvi"
        description="Platforma xaridorlari va mustaqil mutaxassislar ro'yxati, profil nazorati va sanktsiyalar boshqaruvi."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jami Foydalanuvchilar" value={stats.total} detail="Tizimdagi barcha akkauntlar" />
        <MetricCard label="Xaridorlar" value={stats.buyers} detail="Buyurtma beruvchi kompaniyalar" tone="primary" />
        <MetricCard label="Mutaxassislar" value={stats.specialists} detail="Freelancer mutaxassislar" tone="success" />
        <MetricCard label="Bloklanganlar" value={stats.blocked} detail="Faolligi cheklangan foydalanuvchilar" tone="danger" />
      </section>

      {/* Filters and Search */}
      <Card padding="md" className="mt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Tab buttons */}
          <div className="flex border-b border-line pb-0.5">
            {[
              { id: "all", label: "Hamma foydalanuvchilar" },
              { id: "buyer", label: "Xaridorlar" },
              { id: "specialist", label: "Mutaxassislar" },
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
            <div className="min-w-[150px]">
              <select
                aria-label="Holat bo'yicha filtr"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "suspended" | "deactivated" | "deleted")}
                className="w-full rounded-input border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-primary"
              >
                <option value="all">Barcha holatlar</option>
                <option value="active">Faol</option>
                <option value="suspended">Bloklangan</option>
                <option value="deactivated">Deaktiv</option>
                <option value="deleted">{"O'chirilgan"}</option>
              </select>
            </div>
            <div className="w-full sm:w-64">
              <Input
                aria-label="Qidirish"
                placeholder="Ism, telefon yoki ID bo'yicha qidirish..."
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
                const info = userModerationInfo(u.id);
                return (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-2">
                      <Avatar name={u.fullName} src={u.avatarUrl} size="sm" />
                      <div>
                        <p className="font-semibold text-ink">{u.fullName}</p>
                        <p className="text-2xs text-muted">ID: {u.id}</p>
                        <p className="text-xs text-ink font-mono mt-1">{u.phone}</p>
                        <div className="mt-2 flex gap-1">
                          <Badge tone={u.role === "mutaxassis" ? "accent" : "primary"}>
                            {u.role === "mutaxassis" ? "Mutaxassis" : "Xaridor"}
                          </Badge>
                          <Badge tone={info.tone}>{info.label}</Badge>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setSelectedUser(u)}>
                      Boshqarish
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
          <Card className="py-12 text-center text-muted">Bunday shartlar ostida foydalanuvchilar topilmadi.</Card>
        )}
      </div>

      {/* User Details Modal */}
      <Modal
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="Foydalanuvchi kartasi"
      >
        {selectedUser && (
          <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header / Avatar */}
            <div className="flex items-center gap-3 border-b border-line pb-3">
              <Avatar name={selectedUser.fullName} src={selectedUser.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-sm font-bold text-ink truncate">{selectedUser.fullName}</h3>
                <p className="text-2xs text-muted">ID: {selectedUser.id}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge tone={selectedUser.role === "mutaxassis" ? "accent" : "primary"}>
                  {selectedUser.role === "mutaxassis" ? "Mutaxassis" : "Xaridor"}
                </Badge>
                <Badge tone={userModerationInfo(selectedUser.id).tone}>
                  {userModerationInfo(selectedUser.id).label}
                </Badge>
              </div>
            </div>

            {/* Moderation Details if banned */}
            {userModerationInfo(selectedUser.id).status !== "active" && (
              <div className="rounded-input border border-line bg-card-hover p-2.5 text-2xs">
                <p className="font-semibold text-danger">Moderatsiya qaydlari:</p>
                <p className="mt-0.5 text-ink">
                  <span className="text-muted">Holat: </span>
                  {userModerationInfo(selectedUser.id).label}
                </p>
                {userModerationInfo(selectedUser.id).mod?.reason && (
                  <p className="mt-0.5 text-ink">
                    <span className="text-muted">Sabab: </span>
                    {userModerationInfo(selectedUser.id).mod?.reason}
                  </p>
                )}
                {userModerationInfo(selectedUser.id).mod?.suspendedUntil && (
                  <p className="mt-0.5 text-ink">
                    <span className="text-muted">Muddati: </span>
                    {formatDate(userModerationInfo(selectedUser.id).mod?.suspendedUntil || "")} gacha
                  </p>
                )}
              </div>
            )}

            {/* Contact details */}
            <div>
              <h4 className="font-heading text-[10px] font-bold text-ink border-b border-line pb-1.5 uppercase tracking-wider text-muted font-sans">{"Kontakt ma'lumotlari"}</h4>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-2xs text-muted font-semibold uppercase">Telefon raqam</dt>
                  <dd className="mt-0.5 text-ink font-mono font-medium">{selectedUser.phone}</dd>
                </div>
                <div>
                  <dt className="text-2xs text-muted font-semibold uppercase">{"Qo'shilgan sana"}</dt>
                  <dd className="mt-0.5 text-ink">{formatDate(selectedUser.createdAt)}</dd>
                </div>
              </dl>
            </div>

            {/* Specialist Profile Details */}
            {selectedUser.role === "mutaxassis" && selectedUserProfile && (
              <div className="flex flex-col gap-3">
                <h4 className="font-heading text-[10px] font-bold text-ink border-b border-line pb-1.5 uppercase tracking-wider text-muted font-sans">Mutaxassis profili</h4>
                <div className="flex flex-col gap-2.5 text-xs">
                  <div>
                    <p className="text-2xs text-muted font-semibold uppercase">Headline (Sarlavha)</p>
                    <p className="mt-0.5 text-ink font-medium">{selectedUserProfile.headline}</p>
                  </div>
                  <div>
                    <p className="text-2xs text-muted font-semibold uppercase">Tarjimai hol (Bio)</p>
                    <p className="mt-0.5 text-ink text-2xs whitespace-pre-line leading-relaxed text-muted bg-card-hover p-2 rounded-input border border-line/20">
                      {selectedUserProfile.bio}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-2xs text-muted font-semibold uppercase">Manzili</p>
                      <p className="mt-0.5 text-ink">{selectedUserProfile.location || "Ko'rsatilmagan"}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-muted font-semibold uppercase">Reytingi</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <RatingStars value={selectedUserProfile.rating} showValue />
                        <span className="text-2xs text-muted">({selectedUserProfile.completedContracts} ta ish)</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-2xs text-muted font-semibold uppercase">{"Ko'nikmalari (Skills)"}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedUserProfile.skills.map((skill: string) => (
                        <Badge key={skill} tone="neutral">{skill}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Portfolio Items */}
                  {selectedUserProfile.portfolio && selectedUserProfile.portfolio.length > 0 && (
                    <div>
                      <p className="text-2xs text-muted font-semibold uppercase mb-1.5">Portfolio ({selectedUserProfile.portfolio.length} ta namuna)</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedUserProfile.portfolio.map((item: { id: string; title: string; image?: string }) => (
                          <div key={item.id} className="rounded-input border border-line bg-card-hover overflow-hidden p-1.5">
                            {item.image && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image} alt={item.title} className="h-16 w-full object-cover rounded" />
                            )}
                            <p className="mt-1 text-2xs font-semibold text-ink truncate">{item.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contracts History */}
            <div>
              <h4 className="font-heading text-[10px] font-bold text-ink border-b border-line pb-1.5 uppercase tracking-wider text-muted font-sans">
                Shartnomalar tarixi ({selectedUserContracts.length} ta)
              </h4>
              {selectedUserContracts.length ? (
                <div className="mt-2 max-h-32 overflow-y-auto border border-line rounded-input bg-card divide-y divide-line">
                  {selectedUserContracts.map((c) => (
                    <div key={c.id} className="p-2 flex items-center justify-between text-2xs hover:bg-card-hover">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate">{c.title}</p>
                        <p className="text-3xs text-muted mt-0.5">
                          {c.buyerName} → {c.sellerName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-ink">
                          {c.totalAmount.toLocaleString()} UZS
                        </span>
                        <Badge tone={c.status === "faol" ? "success" : c.status === "yakunlangan" ? "neutral" : "warning"}>
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-2xs text-muted">Ishtirok etmagan.</p>
              )}
            </div>

            {/* Support History */}
            <div>
              <h4 className="font-heading text-[10px] font-bold text-ink border-b border-line pb-1.5 uppercase tracking-wider text-muted font-sans">
                {"Yordam so'rovlari ("}{selectedUserTickets.length}{" ta)"}
              </h4>
              {selectedUserTickets.length ? (
                <div className="mt-2 max-h-32 overflow-y-auto border border-line rounded-input bg-card divide-y divide-line">
                  {selectedUserTickets.map((t) => (
                    <div key={t.id} className="p-2 flex items-center justify-between text-2xs hover:bg-card-hover">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate">{t.subject}</p>
                        <p className="text-3xs text-muted mt-0.5">Mavzu: {t.topic}</p>
                      </div>
                      <Badge tone={t.status === "ochiq" ? "warning" : "success"}>
                        {t.status === "ochiq" ? "Ochiq" : "Yopilgan"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-2xs text-muted">Murojaat qilmagan.</p>
              )}
            </div>

            {/* Actions panel */}
            <div className="flex flex-col gap-2 border-t border-line pt-3 mt-1">
              <h4 className="font-heading text-[10px] font-bold text-ink uppercase tracking-wider text-muted font-sans">Moderatsiya amallari</h4>
              <div className="grid grid-cols-2 gap-2">
                {userModerationInfo(selectedUser.id).status === "suspended" ? (
                  <Button variant="primary" className="justify-center" onClick={handleUnsuspend} disabled={actionLoading}>
                    Blokdan yechish
                  </Button>
                ) : (
                  <Button variant="danger" className="justify-center" onClick={() => setSuspendModalOpen(true)} disabled={actionLoading}>
                    Bloklash (Suspend)
                  </Button>
                )}

                {userModerationInfo(selectedUser.id).status !== "deactivated" ? (
                  <Button variant="secondary" className="justify-center text-danger border-danger/40 hover:bg-danger/10 text-xs" onClick={handleDeactivate} disabled={actionLoading}>
                    Deaktivatsiya
                  </Button>
                ) : (
                  <div className="text-2xs text-muted flex items-center justify-center border border-line rounded px-2">Deaktiv qilingan</div>
                )}

                {userModerationInfo(selectedUser.id).status !== "deleted" && (
                  <Button variant="ghost" className="col-span-2 justify-center text-2xs text-danger/80 hover:text-danger hover:bg-danger/5" onClick={handleSoftDelete} disabled={actionLoading}>
                    {"Akkauntni o'chirish (Soft delete)"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Suspend Form Modal */}
      <Modal
        open={suspendModalOpen}
        onClose={() => setSuspendModalOpen(false)}
        title="Foydalanuvchini vaqtincha bloklash (Suspend)"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            <strong className="text-ink">{selectedUser?.fullName}</strong> akkauntini vaqtincha bloklaysiz. Foydalanuvchi tizimga kira olmaydi.
          </p>

          <div>
            <label className="text-xs font-semibold text-muted block mb-1">Bloklash muddati</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "1 kun", value: 1 },
                { label: "7 kun", value: 7 },
                { label: "30 kun", value: 30 },
                { label: "Doimiy", value: null },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSuspendDays(opt.value)}
                  className={`border rounded-input px-3 py-2 text-xs font-semibold transition-all ${
                    suspendDays === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-line bg-card hover:border-muted text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Bloklash sababi (Foydalanuvchiga va audit uchun ko'rinadi)"
            placeholder="Tizim qoidalarini buzganligi uchun..."
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            required
            maxLength={500}
          />

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setSuspendModalOpen(false)}>Bekor qilish</Button>
            <Button variant="danger" onClick={handleSuspend} disabled={!suspendReason.trim() || actionLoading}>
              Bloklashni tasdiqlash
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
