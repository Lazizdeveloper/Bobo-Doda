"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, type TableColumn } from "@/components/ui/Table";
import { getAdminData, addAudit } from "@/lib/api/admin";
import { formatMoney, formatDate } from "@/lib/format";
import type { Service } from "@/lib/types";
import { DangerousActionModal } from "@/components/admin/DangerousActionModal";

export default function ServicesModerationPage() {
  const [data, setData] = useState<ReturnType<typeof getAdminData> | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selected Service Detail Modal
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [flagModalOpen, setFlagModalOpen] = useState(false);

  function load() {
    setData(getAdminData());
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    if (!data) return { total: 0, active: 0, paused: 0, draft: 0 };
    return {
      total: data.services.length,
      active: data.services.filter((s) => s.status === "active").length,
      paused: data.services.filter((s) => s.status === "paused").length,
      draft: data.services.filter((s) => s.status === "draft").length,
    };
  }, [data]);

  const filteredServices = useMemo(() => {
    if (!data) return [];
    return data.services.filter((s) => {
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.sellerId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, categoryFilter, statusFilter, search]);

  const totalPages = Math.ceil(filteredServices.length / rowsPerPage);
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredServices.slice(start, start + rowsPerPage);
  }, [filteredServices, currentPage, rowsPerPage]);

  function handleToggleStatus(serviceId: string, newStatus: Service["status"]) {
    try {
      const services = JSON.parse(localStorage.getItem("sb2_services") || "[]") as Service[];
      const idx = services.findIndex((s) => s.id === serviceId);
      if (idx !== -1) {
        services[idx].status = newStatus;
        localStorage.setItem("sb2_services", JSON.stringify(services));
        load();
        if (selectedService?.id === serviceId) {
          setSelectedService({ ...selectedService, status: newStatus });
        }
      }
    } catch {
      // ignore
    }
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

  if (!data) return <p className="text-muted">Yuklanmoqda...</p>;

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
        {filteredServices.length ? (
          <>
            <Table
              columns={columns}
              rows={paginatedServices}
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
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalRows={filteredServices.length}
              rowsPerPage={rowsPerPage}
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
          onClose={() => setSelectedService(null)}
          title={`Xizmat tekshiruvi: ${selectedService.title}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {selectedService.status === "paused" ? (
                  <Button
                    type="button"
                    size="sm"
                    tone="success"
                    onClick={() => handleToggleStatus(selectedService.id, "active")}
                  >
                    Faollashtirish (Approve)
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    tone="warning"
                    onClick={() => handleToggleStatus(selectedService.id, "paused")}
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
          onConfirm={(reason) => {
            handleToggleStatus(selectedService.id, "paused");
            addAudit("Xizmat qoidabuzarlik tufayli to'xtatildi", selectedService.id, `Sabab: ${reason}`);
            setFlagModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
