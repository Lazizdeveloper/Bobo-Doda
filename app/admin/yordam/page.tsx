"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Table, type TableColumn } from "@/components/ui/Table";
import {
  listTicketsQueue,
  findTicketById,
  replyToTicket,
  adminModerate,
  getTicketConversation,
  type AdminPage,
  type AdminTicketRow,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { adminErrorText } from "@/lib/admin-error-text";
import { useAdminDeepLink } from "@/lib/hooks/useAdminDeepLink";
import { formatDate } from "@/lib/format";
import type { TicketMessage } from "@/lib/admin-types";
import { InternalNotesWidget } from "@/components/admin/InternalNotesWidget";

export default function SupportTicketsPage() {
  const [page, setPage] = useState<AdminPage<AdminTicketRow> | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ochiq" | "javob_berildi" | "yopilgan">("ochiq");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection and Reply States
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketRow | null>(null);
  const [replyText, setReplyText] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  /* Qidiruv debounce bilan */
  const debouncedSearch = useDebouncedValue(search, 300);

  /* SERVER tomonida filtrlanadi va sahifalanadi; muallif nomi qatorga
     server tomonida biriktirilgan (`AdminTicketRow`). */
  const load = useCallback(() => {
    setLoadError(null);
    listTicketsQueue({
      page: currentPage,
      perPage: rowsPerPage,
      search: debouncedSearch,
      status: statusFilter,
    })
      .then(setPage)
      .catch(setLoadError);
  }, [currentPage, rowsPerPage, debouncedSearch, statusFilter]);

  useEffect(load, [load]);

  /* Global qidiruvdan kelgan deep-link — yozuvni topib ochadi */
  useAdminDeepLink("ticketId", findTicketById, setSelectedTicket);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, rowsPerPage]);

  /* KPI — faset sanoqlaridan */
  const facets = page?.facets ?? {};
  const stats = {
    total: facets._all ?? 0,
    open: facets.ochiq ?? 0,
    replied: facets.javob_berildi ?? 0,
    closed: facets.yopilgan ?? 0,
  };


  /* Yozishma QATLAMDAN o'qiladi (`getTicketConversation`) — ilgari sahifa
     `sb2_ticket_chat_<id>` kalitini o'zi ochardi, ya'ni backend ulanganda
     operator o'z javoblarini ham ko'rmay qolardi. Chaqiruv ASYNC bo'lgani
     uchun `useMemo` emas, effekt ishlatiladi. */
  const [ticketChatLog, setTicketChatLog] = useState<TicketMessage[]>([]);
  useEffect(() => {
    if (!selectedTicket) {
      setTicketChatLog([]);
      return;
    }
    let cancelled = false;
    getTicketConversation(selectedTicket.id)
      .then((log) => {
        if (!cancelled) setTicketChatLog(log);
      })
      .catch(() => {
        if (!cancelled) setTicketChatLog([]);
      });
    return () => {
      cancelled = true;
    };
    /* `actionLoading` — javob yuborilgach yozishma qayta o'qilsin */
  }, [selectedTicket, actionLoading]);

  const handleReply = async () => {
    if (!selectedTicket || replyText.trim().length < 3) return;
    setActionLoading(true);
    setActionError("");
    try {
      await replyToTicket(selectedTicket.id, replyText.trim());
      setReplyText("");
      // Reload tickets and keep details open
      load();
    } catch (err) {
      setActionError(adminErrorText(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    if (closeNote.trim().length < 3) {
      setActionError("Yopish sababi kamida 3 ta belgidan iborat bo'lishi shart.");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      await adminModerate("support", selectedTicket.id, { outcome: "reject", note: closeNote.trim() });
      setCloseModalOpen(false);
      setSelectedTicket(null);
      setCloseNote("");
      load();
    } catch (err) {
      setActionError(adminErrorText(err));
    } finally {
      setActionLoading(false);
    }
  };

  const topicLabel = (topic: string) => {
    const map: Record<string, string> = {
      tolov: "To'lovlar",
      shartnoma: "Shartnomalar",
      nizo: "Nizolar",
      hisob: "Akkaunt/Hisob",
      texnik: "Texnik muammo",
      boshqa: "Boshqa",
    };
    return map[topic] || topic;
  };

  const statusLabel = (status: string) => {
    const map: Record<string, { label: string; tone: BadgeTone }> = {
      ochiq: { label: "Ochiq", tone: "warning" },
      javob_berildi: { label: "Javob berildi", tone: "success" },
      yopilgan: { label: "Yopilgan", tone: "neutral" },
    };
    return map[status] || { label: status, tone: "neutral" };
  };

  const columns: TableColumn<AdminTicketRow>[] = [
    {
      key: "id",
      header: "Murojaat ID",
      render: (t) => <span className="font-mono text-2xs text-ink">{t.id}</span>,
    },
    {
      key: "user",
      header: "Foydalanuvchi",
      render: (t) => {
        return (
          <div>
            <p className="font-semibold text-ink">{t.userName || t.userId}</p>
            <p className="text-2xs text-muted">ID: {t.userId}</p>
          </div>
        );
      },
    },
    {
      key: "subject",
      header: "Mavzu",
      render: (t) => (
        <div className="min-w-[150px]">
          <p className="font-semibold text-ink truncate max-w-[200px]">{t.subject}</p>
          <Badge tone="neutral" className="mt-0.5">{topicLabel(t.topic)}</Badge>
        </div>
      ),
    },
    {
      key: "status",
      header: "Holati",
      render: (t) => {
        const info = statusLabel(t.status);
        return <Badge tone={info.tone}>{info.label}</Badge>;
      },
    },
    {
      key: "createdAt",
      header: "Sana",
      render: (t) => <span className="text-xs text-muted">{formatDate(t.createdAt)}</span>,
    },
    {
      key: "action",
      header: "Batafsil",
      render: (t) => (
        <Button size="sm" variant="secondary" onClick={() => {
          setSelectedTicket(t);
          setReplyText("");
          setActionError("");
        }}>
          Ochish
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
      <>
      <AdminPageHeader
        title="Yordam so'rovlari va chiptalar"
        description="Foydalanuvchilardan kelgan support chiptalari navbati, hisob-kitob, shartnoma va texnik yordam."
      />
        <ErrorState error={loadError} onRetry={load} />
      </>
    );
  }

  if (!page) return <p className="text-muted font-sans">Yuklanmoqda...</p>;

  return (
    <>
      <AdminPageHeader
        title="Yordam so'rovlari va chiptalar"
        description="Foydalanuvchilardan kelgan support chiptalari navbati, hisob-kitob, shartnoma va texnik yordam."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jami Murojaatlar" value={stats.total} detail="Barcha vaqtlardagi chiptalar" />
        <MetricCard label="Yangi / Ochiq" value={stats.open} detail="Tezkor javob talab etiladi" tone="warning" />
        <MetricCard label="Javob berilganlar" value={stats.replied} detail="Admin javobini kutmoqda" tone="success" />
        <MetricCard label="Yopilganlar" value={stats.closed} detail="Muammosi hal bo'lgan chiptalar" tone="primary" />
      </section>

      {/* Filters and Search */}
      <Card padding="md" className="mt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[150px]">
              <select
                aria-label="Holat bo'yicha filtr"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "ochiq" | "javob_berildi" | "yopilgan")}
                className="w-full rounded-input border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-primary"
              >
                <option value="ochiq">Ochiq chiptalar</option>
                <option value="javob_berildi">Javob berilgan chiptalar</option>
                <option value="yopilgan">Yopilgan chiptalar</option>
                <option value="all">Barcha chiptalar</option>
              </select>
            </div>
            <div className="w-full sm:w-64">
              <Input
                aria-label="Qidirish"
                placeholder="Mavzu, foydalanuvchi yoki ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tickets Table */}
      <div className="mt-4">
        {page.items.length ? (
          <>
            <Table
              columns={columns}
              rows={page.items}
              rowKey={(t) => t.id}
              renderMobileCard={(t) => {
                const info = statusLabel(t.status);
                return (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{t.subject}</p>
                      <p className="text-3xs text-muted">Ticket ID: {t.id}</p>
                      <p className="text-xs text-ink mt-1 font-medium">
                        Foydalanuvchi: {t.userName || t.userId}
                      </p>
                      <p className="text-xs text-ink mt-1">
                        Kategoriya: <span className="font-semibold text-primary">{topicLabel(t.topic)}</span>
                      </p>
                      <p className="text-xs text-muted mt-1">Sana: {formatDate(t.createdAt)}</p>
                      <div className="mt-2">
                        <Badge tone={info.tone}>{info.label}</Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => {
                      setSelectedTicket(t);
                      setReplyText("");
                      setActionError("");
                    }}>
                      Ochish
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
          <Card className="py-12 text-center text-muted font-sans">Murojaat chiptalari topilmadi.</Card>
        )}
      </div>

      {/* Ticket Reply Modal */}
      <Modal
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title="Support chiptasi"
      >
        {selectedTicket && (
          <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header info */}
            <div className="border-b border-line pb-3">
              <div className="flex justify-between items-center">
                <span className="text-2xs text-muted font-semibold uppercase">{topicLabel(selectedTicket.topic)}</span>
                <span className="text-2xs text-muted">{formatDate(selectedTicket.createdAt)}</span>
              </div>
              <h3 className="font-heading text-sm font-bold text-ink mt-1">{selectedTicket.subject}</h3>
              <p className="text-3xs text-muted mt-0.5">
                ID: {selectedTicket.id} · Foydalanuvchi: {selectedTicket.userName}
              </p>
            </div>

            {/* Original message */}
            <div className="bg-card-hover border border-line p-3 rounded-input">
              <p className="text-2xs text-muted font-semibold uppercase mb-1">Murojaat xabari:</p>
              <p className="text-xs text-ink whitespace-pre-wrap leading-relaxed">
                &quot;{selectedTicket.message}&quot;
              </p>
            </div>

            {/* Response/Chat History */}
            {ticketChatLog.length > 0 && (
              <div className="border-t border-line pt-3 flex flex-col gap-2">
                <p className="text-2xs text-muted font-semibold uppercase">Suhbat tarixi:</p>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {ticketChatLog.map((chat, idx) => (
                    <div key={idx} className="rounded bg-card border border-line/10 p-2 text-2xs">
                      <div className="flex justify-between font-semibold text-accent mb-0.5">
                        <span>{chat.sender} (Admin)</span>
                        <span className="text-muted font-normal text-3xs">{formatDate(chat.at)}</span>
                      </div>
                      <p className="text-ink whitespace-pre-wrap">{chat.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Support Agent Private Yellow Notes */}
            <InternalNotesWidget targetId={selectedTicket.id} targetType="ticket" />

            {/* Yopilgan chipta belgisi. Yopish sababi `closeTicket` tomonidan
                ICHKI ESLATMA sifatida yoziladi va yuqoridagi
                `InternalNotesWidget` da ko'rinadi — ilgari bu blok
                `sb2_admin_case_notes` kalitini o'qirdi, uni esa hech kim
                hech qachon yozmagan, ya'ni blok hech qachon chizilmasdi. */}
            {selectedTicket.status === "yopilgan" && (
              <div className="border-t border-line pt-3">
                <div className="rounded bg-danger/10 border border-danger/20 p-2.5 text-2xs text-ink">
                  <p className="font-semibold text-danger-deep">
                    Chipta yopilgan. Yopilish sababi ichki eslatmalarda qayd etilgan.
                  </p>
                </div>
              </div>
            )}

            {/* Answer Input if not closed */}
            {selectedTicket.status !== "yopilgan" && (
              <div className="flex flex-col gap-3 border-t border-line pt-3 mt-1">
                <Textarea
                  label="Javob xabari"
                  placeholder="Foydalanuvchiga yuboriladigan xabarni yozing..."
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    setActionError("");
                  }}
                  error={actionError}
                  required
                  maxLength={1500}
                />

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" className="justify-center text-danger border-danger/30" onClick={() => {
                    setCloseNote("");
                    setCloseModalOpen(true);
                  }} disabled={actionLoading}>
                    Chiptani yopish
                  </Button>
                  <Button variant="primary" className="justify-center" onClick={handleReply} disabled={replyText.trim().length < 3 || actionLoading}>
                    Javob yuborish
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Close Ticket Reason Modal */}
      <Modal
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title="Yordam so'rovini yopish"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {"Murojaat chiptasini yopish sababini kiriting. Ushbu chipta faol bo'lmagan holatga o'tkaziladi."}
          </p>

          <Textarea
            label="Yopish sababi / Yakuniy xulosa"
            placeholder="Muammo hal qilindi yoki takroriy murojaat..."
            value={closeNote}
            onChange={(e) => {
              setCloseNote(e.target.value);
              setActionError("");
            }}
            error={actionError}
            required
            maxLength={500}
          />

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setCloseModalOpen(false)}>Bekor qilish</Button>
            <Button variant="danger" onClick={handleCloseTicket} disabled={closeNote.trim().length < 3 || actionLoading}>
              Chiptani yopish
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
