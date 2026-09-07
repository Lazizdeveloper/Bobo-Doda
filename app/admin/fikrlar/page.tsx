"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader, MetricCard } from "@/components/admin/AdminUI";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { feedbackService, type FeedbackStatus, type FeedbackType, type PageFeedback } from "@/lib/feedback";
import { formatDate } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { DATA_CHANGED_EVENT } from "@/lib/api/client";

export default function AdminFikrlarPage() {
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<PageFeedback[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | FeedbackType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>("all");
  const [selectedItem, setSelectedItem] = useState<PageFeedback | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const debouncedSearch = useDebouncedValue(search, 250);

  const load = useCallback(async () => {
    const list = await feedbackService.list();
    setFeedbacks(list);
  }, []);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  useEffect(() => {
    const bump = () => setDataVersion((v) => v + 1);
    window.addEventListener(DATA_CHANGED_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const stats = feedbackService.getStats();

  const filtered = feedbacks.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (!debouncedSearch.trim()) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      item.message.toLowerCase().includes(q) ||
      item.pageUrl.toLowerCase().includes(q) ||
      item.pageTitle.toLowerCase().includes(q) ||
      (item.userName && item.userName.toLowerCase().includes(q))
    );
  });

  function openDetail(item: PageFeedback) {
    setSelectedItem(item);
    setAdminNote(item.adminNote || "");
    setModalOpen(true);
  }

  async function handleStatusChange(status: FeedbackStatus) {
    if (!selectedItem) return;
    setSaving(true);
    try {
      const updated = await feedbackService.updateStatus(selectedItem.id, status, adminNote.trim());
      if (updated) {
        setSelectedItem(updated);
        toast("Murojaat holati yangilandi", "success");
        load();
      }
    } catch {
      toast("Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Haqiqatan ham ushbu murojaatni o'chirmoqchimisiz?")) return;
    try {
      await feedbackService.delete(id);
      toast("Murojaat o'chirildi", "success");
      setModalOpen(false);
      load();
    } catch {
      toast("O'chirishda xatolik yuz berdi", "error");
    }
  }

  const typeTone = (t: FeedbackType): BadgeTone => (t === "kamchilik" ? "danger" : "primary");
  const statusTone = (s: FeedbackStatus): BadgeTone => {
    switch (s) {
      case "yangi":
        return "accent";
      case "korildi":
        return "warning";
      case "hal_qilindi":
        return "success";
      case "rad_etildi":
        return "neutral";
    }
  };

  const statusLabel = (s: FeedbackStatus): string => {
    switch (s) {
      case "yangi":
        return "Yangi";
      case "korildi":
        return "Ko'rib chiqildi";
      case "hal_qilindi":
        return "Hal qilindi";
      case "rad_etildi":
        return "Rad etildi";
    }
  };

  const columns: TableColumn<PageFeedback>[] = [
    {
      key: "type",
      header: "Turi",
      render: (r) => (
        <Badge tone={typeTone(r.type)}>
          {r.type === "kamchilik" ? "Kamchilik" : "Taklif"}
        </Badge>
      ),
    },
    {
      key: "page",
      header: "Kelgan Sahifa",
      render: (r) => (
        <div className="flex flex-col gap-0.5 max-w-[200px] sm:max-w-xs">
          <span className="font-semibold text-xs text-ink truncate" title={r.pageTitle}>
            {r.pageTitle}
          </span>
          <Link
            href={r.pageUrl}
            target="_blank"
            className="inline-flex items-center gap-1 font-mono text-2xs text-primary hover:underline truncate"
            title={r.pageUrl}
          >
            <span>{r.pageUrl}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>
        </div>
      ),
    },
    {
      key: "message",
      header: "Xabar Matni",
      render: (r) => (
        <button
          type="button"
          onClick={() => openDetail(r)}
          className="text-left font-medium text-xs text-ink hover:text-primary transition line-clamp-2 max-w-sm"
          title="Batafsil ko'rish"
        >
          {r.message}
        </button>
      ),
    },
    {
      key: "user",
      header: "Foydalanuvchi",
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-ink">{r.userName || "Mehmon"}</span>
          <span className="text-2xs text-muted uppercase font-mono">{r.userRole || "mehmon"}</span>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Sana",
      render: (r) => (
        <span className="text-2xs text-muted whitespace-nowrap">
          {formatDate(r.createdAt, "uz")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Holati",
      render: (r) => <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>,
    },
    {
      key: "actions",
      header: "Amal",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => openDetail(r)} className="text-2xs">
          Ko&apos;rish
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Fikrlar & Sahifa Kamchiliklari"
        description="Foydalanuvchilar tomonidan barcha sahifalardagi vidjet orqali yuborilgan xatolar, kamchiliklar va takliflar."
      />

      {/* KPI Metrikalari */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Jami murojaatlar" value={stats.total} detail="Barcha sahifalardan" tone="primary" />
        <MetricCard label="Kamchiliklar (Bugs)" value={stats.bugs} detail="Saytdagi xatolar" tone="danger" />
        <MetricCard label="Takliflar (Ideas)" value={stats.suggestions} detail="Foydalanuvchi g'oyalari" tone="success" />
        <MetricCard label="Yangi (Ko'rilmagan)" value={stats.pending} detail="Ko'rib chiqilishi kerak" tone="warning" />
      </div>

      {/* Filtrlar va Qidiruv */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Xabar, sahifa yoki foydalanuvchini qidirish..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tur filtri */}
            <div className="inline-flex rounded-xl border border-line bg-surface/60 p-1 text-xs font-semibold">
              {(["all", "kamchilik", "taklif"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-lg px-2.5 py-1 transition ${
                    typeFilter === t ? "bg-card text-ink shadow-xs" : "text-muted hover:text-ink"
                  }`}
                >
                  {t === "all" ? "Barchasi" : t === "kamchilik" ? "Kamchiliklar" : "Takliflar"}
                </button>
              ))}
            </div>

            {/* Holat filtri */}
            <div className="inline-flex rounded-xl border border-line bg-surface/60 p-1 text-xs font-semibold">
              {(["all", "yangi", "korildi", "hal_qilindi"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-2.5 py-1 transition ${
                    statusFilter === s ? "bg-card text-ink shadow-xs" : "text-muted hover:text-ink"
                  }`}
                >
                  {s === "all" ? "Barchasi" : statusLabel(s)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Murojaatlar Jadvali */}
        <Table<PageFeedback> columns={columns} rows={filtered} rowKey={(r) => r.id} />
      </Card>

      {/* Murojaat Tafsilotlari Modali */}
      {selectedItem && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={
            selectedItem.type === "kamchilik"
              ? "🐞 Sahifadagi Kamchilik Murojaati"
              : "💡 Foydalanuvchi Taklifi"
          }
          footer={
            <div className="flex w-full items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger hover:bg-danger/10"
                onClick={() => handleDelete(selectedItem.id)}
              >
                O&apos;chirish
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Yopish
                </Button>
                {selectedItem.status === "yangi" && (
                  <Button
                    size="sm"
                    loading={saving}
                    onClick={() => handleStatusChange("korildi")}
                  >
                    Ko&apos;rib chiqildi deb belgilash
                  </Button>
                )}
                {selectedItem.status !== "hal_qilindi" && (
                  <Button
                    size="sm"
                    tone="success"
                    loading={saving}
                    onClick={() => handleStatusChange("hal_qilindi")}
                  >
                    Hal qilindi deb belgilash
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Manzil va sahifa havolasi */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
              <p className="text-2xs font-bold uppercase tracking-wider text-primary">
                Qaysi sahifadan yuborilgan:
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div>
                  <p className="font-heading text-sm font-bold text-ink">{selectedItem.pageTitle}</p>
                  <p className="font-mono text-xs text-muted">{selectedItem.pageUrl}</p>
                </div>
                <Link
                  href={selectedItem.pageUrl}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-primary/90 transition shrink-0"
                >
                  <span>Sahifaga o&apos;tish</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Murojaat matni */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted">Foydalanuvchi yozgan xabar:</label>
              <div className="rounded-xl border border-line bg-surface/50 p-4 text-sm text-ink leading-relaxed font-medium">
                {selectedItem.message}
              </div>
            </div>

            {/* Foydalanuvchi ma'lumotlari */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-line p-3 text-xs">
              <div>
                <span className="text-muted">Yuboruvchi:</span>
                <p className="font-semibold text-ink mt-0.5">{selectedItem.userName || "Mehmon"}</p>
              </div>
              <div>
                <span className="text-muted">Roli:</span>
                <p className="font-semibold text-ink mt-0.5 capitalize">{selectedItem.userRole || "mehmon"}</p>
              </div>
              <div>
                <span className="text-muted">Vaqti:</span>
                <p className="font-semibold text-ink mt-0.5">{formatDate(selectedItem.createdAt, "uz")}</p>
              </div>
              <div>
                <span className="text-muted">Holati:</span>
                <div className="mt-0.5">
                  <Badge tone={statusTone(selectedItem.status)}>{statusLabel(selectedItem.status)}</Badge>
                </div>
              </div>
            </div>

            {/* Admin ichki izohi */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Admin ichki izohi (qaror / vazifa):</label>
              <Textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Masalan: Dizaynerga topshirildi, v2.4 versiyada chiqadi..."
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
