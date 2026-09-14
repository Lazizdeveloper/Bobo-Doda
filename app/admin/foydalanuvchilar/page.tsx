"use client";

/**
 * Bosqich 17 — real backend: `GET /staff/users` (offset sahifalash),
 * `GET /staff/users/:id`, `POST /staff/users/:id/{suspend,block,reactivate}`.
 * Eski mock `AdminUserRow`/`listUsersQueue` bilan ALMASHTIRILDI — real
 * foydalanuvchida KYC holati, ko'nikma/kategoriya, boy profil YO'Q (bo'lim
 * 91-B mock audit) — faqat status/sellerStatus/rollar/hisoblagichlar.
 */
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  staffListUsers,
  staffGetUser,
  staffSuspendUser,
  staffBlockUser,
  staffReactivateUser,
  type StaffUserRow,
  type StaffUserDetail,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { formatDate } from "@/lib/format";

const STATUS_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Faol", tone: "success" },
  SUSPENDED: { label: "To'xtatilgan", tone: "warning" },
  BLOCKED: { label: "Bloklangan", tone: "danger" },
};

export default function UserManagementPage() {
  const { toast } = useToast();
  const [page, setPage] = useState<{ items: StaffUserRow[]; page: number; perPage: number; total: number; totalPages: number } | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [roleFilter, setRoleFilter] = useState<"all" | "BUYER" | "SELLER">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "SUSPENDED" | "BLOCKED">("all");
  const [phone, setPhone] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selected, setSelected] = useState<StaffUserRow | null>(null);
  const [detail, setDetail] = useState<StaffUserDetail | null>(null);
  const [actionOpen, setActionOpen] = useState<"suspend" | "block" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const debouncedPhone = useDebouncedValue(phone, 300);

  const load = useCallback(() => {
    setLoadError(null);
    staffListUsers({
      page: currentPage,
      perPage: rowsPerPage,
      phone: debouncedPhone || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      role: roleFilter === "all" ? undefined : roleFilter,
    })
      .then(setPage)
      .catch(setLoadError);
  }, [currentPage, rowsPerPage, debouncedPhone, statusFilter, roleFilter]);

  useEffect(load, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedPhone, statusFilter, roleFilter, rowsPerPage]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    staffGetUser(selected.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  function refreshDetail() {
    if (!selected) return;
    staffGetUser(selected.id)
      .then(setDetail)
      .catch(() => {});
  }

  async function handleReactivate() {
    if (!selected) return;
    setBusy(true);
    try {
      await staffReactivateUser(selected.id);
      toast("Foydalanuvchi faollashtirildi");
      load();
      refreshDetail();
    } catch {
      toast("Xatolik yuz berdi", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleAction() {
    if (!selected || !actionOpen) return;
    if (reason.trim().length < 5) {
      toast("Sababni kamida 5 belgi bilan kiriting", "error");
      return;
    }
    setBusy(true);
    try {
      if (actionOpen === "suspend") await staffSuspendUser(selected.id, reason.trim());
      else await staffBlockUser(selected.id, reason.trim());
      toast("Amal bajarildi");
      setActionOpen(null);
      setReason("");
      load();
      refreshDetail();
    } catch {
      toast("Xatolik yuz berdi", "error");
    } finally {
      setBusy(false);
    }
  }

  const columns: TableColumn<StaffUserRow>[] = [
    {
      key: "fullName",
      header: "Foydalanuvchi",
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.fullName || u.phone} size="sm" />
          <div className="min-w-0">
            <span className="font-semibold text-ink truncate block">{u.fullName || "—"}</span>
            <p className="text-2xs text-muted font-mono">{u.id.slice(0, 8)}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Telefon", render: (u) => <span className="font-mono text-xs text-ink">{u.phone}</span> },
    {
      key: "roles",
      header: "Rollar",
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.map((r) => (
            <Badge key={r} tone={r === "SELLER" ? "primary" : "neutral"} size="sm">
              {r === "SELLER" ? "Sotuvchi" : "Xaridor"}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Holat",
      render: (u) => {
        const info = STATUS_LABEL[u.status] ?? { label: u.status, tone: "neutral" as BadgeTone };
        return <Badge tone={info.tone} size="sm">{info.label}</Badge>;
      },
    },
    { key: "sellerStatus", header: "Sotuvchi arizasi", render: (u) => <span className="text-2xs text-muted">{u.sellerStatus}</span> },
    { key: "createdAt", header: "Ro'yxatdan o'tgan", render: (u) => <span className="text-xs text-muted">{formatDate(u.createdAt)}</span> },
    {
      key: "action",
      header: "Amallar",
      render: (u) => (
        <Button size="sm" variant="outline" onClick={() => setSelected(u)} className="text-xs">
          Boshqarish →
        </Button>
      ),
    },
  ];

  if (loadError) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Foydalanuvchilar" description="Bozor ishtirokchilari, holatlari va sanktsiyalar." />
        <ErrorState error={loadError} onRetry={load} />
      </div>
    );
  }

  if (!page) return <p className="text-muted">Yuklanmoqda...</p>;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Foydalanuvchilar" description="Bozor ishtirokchilari, holatlari va sanktsiyalar." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Filtrga mos foydalanuvchilar" value={page.total} detail="Joriy filtr bo'yicha" />
      </section>

      <Card padding="md" className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Select
            aria-label="Rol bo'yicha filtr"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            options={[
              { value: "all", label: "Barcha rollar" },
              { value: "BUYER", label: "Xaridorlar" },
              { value: "SELLER", label: "Sotuvchilar" },
            ]}
            className="sm:w-48"
          />
          <Select
            aria-label="Holat bo'yicha filtr"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            options={[
              { value: "all", label: "Barcha holatlar" },
              { value: "ACTIVE", label: "Faol" },
              { value: "SUSPENDED", label: "To'xtatilgan" },
              { value: "BLOCKED", label: "Bloklangan" },
            ]}
            className="sm:w-48"
          />
          <div className="w-full sm:w-64">
            <Input aria-label="Telefon bo'yicha qidirish" placeholder="Telefon raqami..." value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
      </Card>

      <div className="mt-4">
        {page.items.length ? (
          <>
            <Table columns={columns} rows={page.items} rowKey={(u) => u.id} />
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
          <Card className="py-12 text-center text-xs text-muted">Tanlangan filtrlarga mos foydalanuvchi topilmadi.</Card>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.fullName || selected?.phone || "Foydalanuvchi"}>
        {detail ? (
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted">Telefon</p>
                <p className="font-mono text-ink">{detail.phone}</p>
              </div>
              <div>
                <p className="text-muted">Holat</p>
                <Badge tone={STATUS_LABEL[detail.status]?.tone ?? "neutral"} size="sm">
                  {STATUS_LABEL[detail.status]?.label ?? detail.status}
                </Badge>
              </div>
              <div>
                <p className="text-muted">Sotuvchi arizasi</p>
                <p className="text-ink">{detail.sellerStatus}</p>
              </div>
              <div>
                <p className="text-muted">Ro'yxatdan o'tgan</p>
                <p className="text-ink">{formatDate(detail.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted">Shartnomalar (xaridor)</p>
                <p className="text-ink">{detail.contractsAsBuyerCount}</p>
              </div>
              <div>
                <p className="text-muted">Shartnomalar (sotuvchi)</p>
                <p className="text-ink">{detail.contractsAsSellerCount}</p>
              </div>
              <div>
                <p className="text-muted">To'lovlar soni</p>
                <p className="text-ink">{detail.paymentsCount}</p>
              </div>
            </div>
            {detail.statusReason && (
              <div className="rounded-input border border-line bg-surface p-3 text-xs">
                <p className="text-muted">Sabab</p>
                <p className="text-ink mt-1">{detail.statusReason}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              {detail.status !== "ACTIVE" && (
                <Button size="sm" onClick={handleReactivate} loading={busy}>
                  Faollashtirish
                </Button>
              )}
              {detail.status !== "SUSPENDED" && (
                <Button size="sm" variant="secondary" onClick={() => setActionOpen("suspend")} disabled={busy}>
                  To'xtatish
                </Button>
              )}
              {detail.status !== "BLOCKED" && (
                <Button size="sm" variant="danger" onClick={() => setActionOpen("block")} disabled={busy}>
                  Bloklash
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted">Yuklanmoqda...</p>
        )}
      </Modal>

      <Modal
        open={!!actionOpen}
        onClose={() => setActionOpen(null)}
        title={actionOpen === "suspend" ? "Foydalanuvchini to'xtatish" : "Foydalanuvchini bloklash"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setActionOpen(null)} disabled={busy}>
              Bekor qilish
            </Button>
            <Button variant="danger" loading={busy} onClick={handleAction}>
              Tasdiqlash
            </Button>
          </>
        }
      >
        <Textarea label="Sabab" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Kamida 5 belgi" />
      </Modal>
    </div>
  );
}
