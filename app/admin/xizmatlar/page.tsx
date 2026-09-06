"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, type TableColumn } from "@/components/ui/Table";
import {
  listServicesQueue,
  findServiceById,
  setServiceStatus,
  type AdminPage,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useAdminDeepLink } from "@/lib/hooks/useAdminDeepLink";
import { adminErrorText } from "@/lib/admin-error-text";
import { formatMoney, formatDate } from "@/lib/format";
import type { Service } from "@/lib/types";
import { DangerousActionModal } from "@/components/admin/DangerousActionModal";

export default function ServicesModerationPage() {
  const [page, setPage] = useState<AdminPage<Service> | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionError, setActionError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selected Service Detail Modal
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [flagModalOpen, setFlagModalOpen] = useState(false);

  /* Qidiruv debounce bilan — aks holda backend'da har harfda so'rov ketardi */
  const debouncedSearch = useDebouncedValue(search, 300);

  /* SERVER tomonida filtrlanadi va sahifalanadi: ekran faqat bitta
     sahifani oladi. Ilgari bu yerda `getAdminData()` butun katalogni
     tortib olib, `useMemo` + `slice` bilan brauzerda sahifalardi. */
  const load = useCallback(() => {
    setLoadError(null);
    listServicesQueue({
      page: currentPage,
      perPage: rowsPerPage,
      search: debouncedSearch,
      status: statusFilter,
      category: categoryFilter,
    })
      .then(setPage)
      .catch(setLoadError);
  }, [currentPage, rowsPerPage, debouncedSearch, statusFilter, categoryFilter]);

  useEffect(load, [load]);

  /* Filtr o'zgarganda birinchi sahifaga qaytamiz */
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, categoryFilter, rowsPerPage]);

  /* Global qidiruvdan kelgan deep-link — yozuvni joriy sahifadan topadi */
  useAdminDeepLink("serviceId", findServiceById, setSelectedService);

  /* KPI — faset sanoqlaridan (status filtridan MUSTAQIL, shuning uchun
     tab almashganda raqamlar o'zgarmaydi) */
  const facets = page?.facets ?? {};
  const stats = {
    total: facets._all ?? 0,
    active: facets.active ?? 0,
    paused: facets.paused ?? 0,
    draft: facets.draft ?? 0,
  };

  /* Amal QATLAMDAN o'tadi. Ilgari `localStorage` ga to'g'ridan-to'g'ri
     yozilardi — ruxsat tekshiruvi ham, AUDIT IZI ham umuman yo'q edi
     (xizmatni bozordan olib qo'yish hech qayerda qayd etilmasdi), egasi
     xabardor qilinmasdi va xato `catch {}` ichida yo'qolardi. */
  async function handleToggleStatus(
    serviceId: string,
    newStatus: Service["status"],
    reason?: string
  ) {
    setActionError("");
    await setServiceStatus(serviceId, newStatus, reason);
    load();
    if (selectedService?.id === serviceId) {
      setSelectedService({ ...selectedService, status: newStatus });
    }
  }

  /* Tugmadan chaqiriladigan variant: xato modal ichida ko'rsatiladi, ilova
     xato chegarasiga (`app/error.tsx`) tushib ketmaydi. Amal ASYNC bo'lgani
     uchun xato `Promise` rejection sifatida keladi — `try/catch` emas,
     `.catch()` kerak. */
  function toggleStatusSafely(
    serviceId: string,
    newStatus: Service["status"]
  ) {
    handleToggleStatus(serviceId, newStatus).catch((err) =>
      setActionError(adminErrorText(err))
    );
  }

  const columns: TableColumn<Service>[] = [
    {
      key: "title",
      header: "Xizmat Nomi & Rasmi",
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
            {s.images && s.images[0] ? (
              <Image src={s.images[0]} alt={s.title} fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted">🖼️</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink truncate max-w-xs">{s.title}</p>
            <p className="text-2xs text-muted font-mono">ID: {s.id} · Sotuvchi: {s.sellerId}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Kategoriya",
      render: (s) => (
        <Badge tone="neutral" size="sm" className="capitalize">
          {s.category}
        </Badge>
      ),
    },
    {
      key: "price",
      header: "Narxi",
      render: (s) => <span className="font-bold text-primary text-xs">{formatMoney(s.price)}</span>,
    },
    {
      key: "deliveryDays",
      header: "Muddat",
      render: (s) => <span className="text-xs text-muted">{s.deliveryDays} kun</span>,
    },
    {
      key: "status",
      header: "Holat",
      render: (s) => {
        const tone: BadgeTone = s.status === "active" ? "success" : s.status === "paused" ? "warning" : "neutral";
        return (
          <Badge tone={tone} size="sm">
            {s.status === "active" ? "Faol" : s.status === "paused" ? "To'xtatilgan" : "Qoralama"}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Yaratilgan",
      render: (s) => <span className="text-xs text-muted">{formatDate(s.createdAt)}</span>,
    },
    {
      key: "action",
      header: "Moderatsiya",
      render: (s) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedService(s)} className="text-xs">
          Ko‘rish →
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
        title="Xizmatlar & Giglar Moderatsiyasi"
        description="Mutaxassislar tomonidan taklif etilayotgan xizmatlar katalogi, narxlar, qoidabuzarlik tekshiruvi va faollashtirish."
      />
        <ErrorState error={loadError} onRetry={load} />
      </div>
    );
  }

  if (!page) return <p className="text-muted">Yuklanmoqda...</p>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Xizmatlar & Giglar Moderatsiyasi"
        description="Mutaxassislar tomonidan taklif etilayotgan xizmatlar katalogi, narxlar, qoidabuzarlik tekshiruvi va faollashtirish."
      />

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jami Xizmatlar" value={stats.total} detail="Katalogdagi barcha xizmatlar" />
        <MetricCard label="Faol Xizmatlar" value={stats.active} detail="Xaridorlar ko'ra oladi" tone="success" />
        <MetricCard label="Muzlatilgan" value={stats.paused} detail="Moderator yoki muallif to'xtatgan" tone="warning" />
        <MetricCard label="Qoralamalar" value={stats.draft} detail="Chiqarilmagan xizmatlar" tone="primary" />
      </section>

      {/* Filter and Search */}
      <Card padding="md" className="space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Kategoriya filtri"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
            >
              <option value="all">Barcha kategoriyalar</option>
              <option value="dizayn">Dizayn & Grafika</option>
              <option value="dasturlash">Dasturlash & IT</option>
              <option value="tarjima">Tarjima & Matnlar</option>
              <option value="marketing">SMM & Marketing</option>
              <option value="video">Video & Animatsiya</option>
              <option value="biznes">Biznes & Boshqaruv</option>
            </select>

            <select
              aria-label="Holat filtri"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
            >
              <option value="all">Barcha holatlar</option>
              <option value="active">Faol</option>
              <option value="paused">To‘xtatilgan</option>
              <option value="draft">Qoralama</option>
            </select>
          </div>

          <div className="w-full sm:w-72">
            <Input
              aria-label="Qidirish"
              placeholder="Xizmat nomi yoki ID bo'yicha qidiruv..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="mt-4">
        {page.items.length ? (
          <>
            <Table
              columns={columns}
              rows={page.items}
              rowKey={(s) => s.id}
              renderMobileCard={(s) => (
                <div className="flex items-start justify-between gap-3 p-3 border border-line rounded-xl bg-card">
                  <div>
                    <p className="font-semibold text-ink">{s.title}</p>
                    <p className="text-2xs text-muted">{s.category} · {formatMoney(s.price)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedService(s)}>
                    Ko‘rish
                  </Button>
                </div>
              )}
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
            Xizmatlar topilmadi.
          </Card>
        )}
      </div>

      {/* Service Inspection Modal */}
      {selectedService && (
        <Modal
          open={Boolean(selectedService)}
          onClose={() => {
            setSelectedService(null);
            setActionError("");
          }}
          title={`Xizmat tekshiruvi: ${selectedService.title}`}
          size="lg"
          footer={
            <div className="flex w-full flex-col gap-2">
              {actionError && (
                <p role="alert" className="text-2xs font-medium text-danger-deep">
                  {actionError}
                </p>
              )}
              <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {selectedService.status === "paused" ? (
                  <Button
                    type="button"
                    size="sm"
                    tone="success"
                    onClick={() => toggleStatusSafely(selectedService.id, "active")}
                  >
                    Faollashtirish (Approve)
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    tone="warning"
                    onClick={() => toggleStatusSafely(selectedService.id, "paused")}
                  >
                    Vaqtincha to‘xtatish
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  tone="danger"
                  onClick={() => setFlagModalOpen(true)}
                >
                  Qoidabuzarlik belgilash
                </Button>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedService(null)}>
                Yopish
              </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Gallery Images */}
            {selectedService.images && selectedService.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {selectedService.images.map((img, i) => (
                  <div key={i} className="relative h-28 rounded-xl overflow-hidden border border-line bg-surface">
                    <Image src={img} alt="" fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-line bg-surface/60 p-3">
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Narx:</span>
                <p className="font-bold text-primary text-sm mt-0.5">{formatMoney(selectedService.price)}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Yetkazish:</span>
                <p className="font-semibold text-ink mt-0.5">{selectedService.deliveryDays} kun</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Kategoriya:</span>
                <p className="font-semibold text-ink mt-0.5 capitalize">{selectedService.category}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Holat:</span>
                <p className="font-semibold text-ink mt-0.5 capitalize">{selectedService.status}</p>
              </div>
            </div>

            <div>
              <span className="text-3xs uppercase font-bold text-muted block mb-1">To‘liq tavsif:</span>
              <div className="rounded-xl border border-line bg-card p-3.5 text-xs text-ink leading-relaxed whitespace-pre-wrap">
                {selectedService.description}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Flag / Action Modal */}
      {selectedService && (
        <DangerousActionModal
          open={flagModalOpen}
          onClose={() => setFlagModalOpen(false)}
          title="Xizmatni qoidabuzarlik tufayli to‘xtatish"
          description={`"${selectedService.title}" xizmatini katalogdan olib tashlash va muallifga ogohlantirish yuborish.`}
          impactDetails={[
            "Xizmat qidiruv va kategoriyadan olib tashlanadi",
            "Mavjud buyurtmalar yakunlanguncha davom etadi, yangilari qabul qilinmaydi",
          ]}
          confirmLabel="Qoidabuzarlikni qayd etish"
          confirmTone="danger"
          /* Audit izi endi `setServiceStatus` ichida yoziladi (sabab bilan) —
             sahifa ikkinchi, alohida yozuv qo'shmaydi. */
          onConfirm={async (reason) => {
            await handleToggleStatus(selectedService.id, "paused", reason);
            setFlagModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
