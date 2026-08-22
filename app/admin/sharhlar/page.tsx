"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, type TableColumn } from "@/components/ui/Table";
import { getAdminData } from "@/lib/api/admin";
import { formatDate } from "@/lib/format";
import type { Review } from "@/lib/types";

export default function ReviewsModerationPage() {
  const [data, setData] = useState<ReturnType<typeof getAdminData> | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  function load() {
    const adminData = getAdminData();
    setData(adminData);
    try {
      const storedReviews = JSON.parse(localStorage.getItem("sb2_reviews") || "[]") as Review[];
      setReviews(storedReviews);
    } catch {
      setReviews([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    if (!reviews.length) return { total: 0, avg: "5.0", lowRating: 0, highRating: 0 };
    const avg = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
    return {
      total: reviews.length,
      avg,
      lowRating: reviews.filter((r) => r.rating <= 2).length,
      highRating: reviews.filter((r) => r.rating === 5).length,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (ratingFilter !== "all" && r.rating !== Number(ratingFilter)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.comment.toLowerCase().includes(q) ||
          (r.buyerName && r.buyerName.toLowerCase().includes(q)) ||
          r.sellerId.toLowerCase().includes(q) ||
          r.contractId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reviews, ratingFilter, search]);

  const totalPages = Math.ceil(filteredReviews.length / rowsPerPage);
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredReviews.slice(start, start + rowsPerPage);
  }, [filteredReviews, currentPage, rowsPerPage]);

  function handleDeleteReview(reviewId: string) {
    if (!window.confirm("Ushbu sharhni noo‘rin mazmun tufayli o‘chirishga ishonchingiz komilmi?")) return;
    const updated = reviews.filter((r) => r.id !== reviewId);
    setReviews(updated);
    localStorage.setItem("sb2_reviews", JSON.stringify(updated));
    setSelectedReview(null);
  }

  const columns: TableColumn<Review>[] = [
    {
      key: "buyerName",
      header: "Muallif & Mutaxassis",
      render: (r) => (
        <div className="min-w-0">
          <p className="font-bold text-ink truncate">{r.buyerName || "Mijoz"}</p>
          <p className="text-2xs text-muted">
            Mutaxassis ID: <span className="font-mono text-ink">{r.sellerId}</span>
          </p>
          <p className="text-3xs text-muted font-mono">Shartnoma: #{r.contractId}</p>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Baho",
      render: (r) => (
        <div className="flex items-center gap-1">
          <span className="font-bold text-amber-600 text-xs">⭐ {r.rating}.0</span>
        </div>
      ),
    },
    {
      key: "comment",
      header: "Sharh Matni",
      render: (r) => (
        <p className="text-xs text-ink truncate max-w-sm">{r.comment}</p>
      ),
    },
    {
      key: "createdAt",
      header: "Qoldirilgan",
      render: (r) => <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>,
    },
    {
      key: "action",
      header: "Amal",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedReview(r)} className="text-xs">
          Ko‘rish →
        </Button>
      ),
    },
  ];

  if (!data) return <p className="text-muted">Yuklanmoqda...</p>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Sharhlar & Baholashlar Moderatsiyasi"
        description="Buyurtmachilar tomonidan qoldirilgan reytinglar va izohlarning shaffofligi, haqoratli mazmunni olib tashlash."
      />

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jami Sharhlar" value={stats.total} detail="Barcha loyihalar bo'yicha" />
        <MetricCard label="O‘rtacha Reyting" value={`⭐ ${stats.avg}`} detail="Platforma bo'yicha o'rtacha" tone="success" />
        <MetricCard label="A'lo Baholar (5★)" value={stats.highRating} detail="Maksimal qoniqish" tone="primary" />
        <MetricCard label="Salbiy Baholar (≤2★)" value={stats.lowRating} detail="Norozi mijozlar izohlari" tone="warning" />
      </section>

      {/* Filter and Search */}
      <Card padding="md" className="space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <select
              aria-label="Baho bo'yicha filtr"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
            >
              <option value="all">Barcha baholar</option>
              <option value="5">5 yulduz ⭐⭐⭐⭐⭐</option>
              <option value="4">4 yulduz ⭐⭐⭐⭐</option>
              <option value="3">3 yulduz ⭐⭐⭐</option>
              <option value="2">2 yulduz ⭐⭐</option>
              <option value="1">1 yulduz ⭐</option>
            </select>
          </div>

          <div className="w-full sm:w-72">
            <Input
              aria-label="Qidirish"
              placeholder="Sharh matni, muallif yoki mutaxassis ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="mt-4">
        {filteredReviews.length ? (
          <>
            <Table
              columns={columns}
              rows={paginatedReviews}
              rowKey={(r) => r.id}
              renderMobileCard={(r) => (
                <div className="flex items-start justify-between gap-3 p-3 border border-line rounded-xl bg-card">
                  <div>
                    <p className="font-bold text-ink">{r.buyerName || "Mijoz"}</p>
                    <p className="text-xs text-amber-600 font-bold">⭐ {r.rating}.0</p>
                    <p className="text-xs text-ink mt-1 truncate max-w-xs">{r.comment}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedReview(r)}>
                    Ko‘rish
                  </Button>
                </div>
              )}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalRows={filteredReviews.length}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
            />
          </>
        ) : (
          <Card className="py-12 text-center text-xs text-muted">
            Sharhlar topilmadi.
          </Card>
        )}
      </div>

      {/* Modal Detail */}
      {selectedReview && (
        <Modal
          open={Boolean(selectedReview)}
          onClose={() => setSelectedReview(null)}
          title={`Sharh ma'lumotlari #${selectedReview.id}`}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                type="button"
                size="sm"
                variant="outline"
                tone="danger"
                onClick={() => handleDeleteReview(selectedReview.id)}
              >
                Noo‘rin sharhni o‘chirish
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedReview(null)}>
                Yopish
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface/60 p-3">
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Muallif:</span>
                <p className="font-bold text-ink mt-0.5">{selectedReview.buyerName || "Mijoz"}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Baho:</span>
                <p className="font-bold text-amber-600 mt-0.5">⭐ {selectedReview.rating} / 5.0</p>
              </div>
            </div>

            <div>
              <span className="text-3xs uppercase font-bold text-muted block mb-1">To‘liq izoh matni:</span>
              <div className="rounded-xl border border-line bg-card p-3.5 text-xs text-ink leading-relaxed whitespace-pre-wrap">
                {selectedReview.comment}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
