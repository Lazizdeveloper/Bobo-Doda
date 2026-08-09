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
import { getAdminData, replyToTicket, adminModerate } from "@/lib/api/admin";
import { formatDate } from "@/lib/format";
import type { SupportTicket } from "@/lib/types";

export default function SupportTicketsPage() {
  const [data, setData] = useState<ReturnType<typeof getAdminData> | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ochiq" | "javob_berildi" | "yopilgan">("ochiq");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection and Reply States
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  function load() {
    setData(getAdminData());
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, open: 0, replied: 0, closed: 0 };
    const list = data.tickets;
    return {
      total: list.length,
      open: list.filter((t) => t.status === "ochiq").length,
      replied: list.filter((t) => t.status === "javob_berildi").length,
      closed: list.filter((t) => t.status === "yopilgan").length,
    };
  }, [data]);

  const filteredTickets = useMemo(() => {
    if (!data) return [];
    return data.tickets.filter((t) => {
      // 1. Status Filter
      if (statusFilter !== "all" && t.status !== statusFilter) return false;

      // 2. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const user = data.users.find((u) => u.id === t.userId);
        return (
          t.subject.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          user?.fullName.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [data, statusFilter, search]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredTickets.slice(start, start + rowsPerPage);
  }, [filteredTickets, currentPage, rowsPerPage]);

  const ticketChatLog = useMemo(() => {
    if (!selectedTicket) return [];
    try {
      const chatKey = `sb2_ticket_chat_${selectedTicket.id}`;
      return JSON.parse(localStorage.getItem(chatKey) || "[]");
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicket, actionLoading]);

  const handleReply = async () => {
    if (!selectedTicket || replyText.trim().length < 3) return;
    setActionLoading(true);
    setActionError("");
    try {
      replyToTicket(selectedTicket.id, replyText.trim());
      setReplyText("");
      // Reload tickets and keep details open
      load();
    } catch {
      setActionError("Javob yuborishda xatolik yuz berdi.");
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
      adminModerate("support", selectedTicket.id, { outcome: "reject", note: closeNote.trim() });
      setCloseModalOpen(false);
      setSelectedTicket(null);
      setCloseNote("");
      load();
    } catch {
      setActionError("Chiptani yopishda xatolik yuz berdi.");
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

  const columns: TableColumn<SupportTicket>[] = [
    {
      key: "id",
      header: "Murojaat ID",
      render: (t) => <span className="font-mono text-2xs text-ink">{t.id}</span>,
    },
    {
      key: "user",
      header: "Foydalanuvchi",
      render: (t) => {
        const user = data?.users.find((u) => u.id === t.userId);
        return (
          <div>
            <p className="font-semibold text-ink">{user?.fullName || t.userId}</p>
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

  if (!data) return <p className="text-muted font-sans">Yuklanmoqda...</p>;

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
        {filteredTickets.length ? (
          <>
            <Table
              columns={columns}
              rows={paginatedTickets}
              rowKey={(t) => t.id}
              renderMobileCard={(t) => {
                const user = data.users.find((u) => u.id === t.userId);
                const info = statusLabel(t.status);
                return (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{t.subject}</p>
                      <p className="text-3xs text-muted">Ticket ID: {t.id}</p>
                      <p className="text-xs text-ink mt-1 font-medium">
                        Foydalanuvchi: {user?.fullName || t.userId}
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
              currentPage={currentPage}
              totalPages={Math.ceil(filteredTickets.length / rowsPerPage)}
              onPageChange={setCurrentPage}
              totalRows={filteredTickets.length}
              rowsPerPage={rowsPerPage}
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
                ID: {selectedTicket.id} · Foydalanuvchi: {data.users.find((u) => u.id === selectedTicket.userId)?.fullName || selectedTicket.userId}
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
                  {ticketChatLog.map((chat: { sender: string; at: string; text: string }, idx: number) => (
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

            {/* Admin Case Notes if ticket is closed */}
            {selectedTicket.status === "yopilgan" && (
              <div className="border-t border-line pt-3">
                {(() => {
                  try {
                    const notes = JSON.parse(localStorage.getItem("sb2_admin_case_notes") || "{}");
                    const closeMsg = notes[selectedTicket.id];
                    if (closeMsg) {
                      return (
                        <div className="rounded bg-danger/10 border border-danger/20 p-2.5 text-2xs text-ink">
                          <p className="font-semibold text-danger">Chipta yopilgan. Yopilish sababi:</p>
                          <p className="mt-1 whitespace-pre-wrap italic">&quot;{closeMsg}&quot;</p>
                        </div>
                      );
                    }
                  } catch {}
                  return null;
                })()}
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
