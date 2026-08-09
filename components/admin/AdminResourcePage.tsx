"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader, EmptyAdmin } from "./AdminUI";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Table, type TableColumn } from "@/components/ui/Table";
import { adminModerate, getAdminData } from "@/lib/api/admin";
import { formatDate, formatMoney } from "@/lib/format";

type Kind = "users" | "kyc" | "disputes" | "payments" | "support" | "content";
type Row = {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  meta: string;
  amount?: number;
  details?: { label: string; value: string }[];
};

const config: Record<Kind, { title: string; description: string }> = {
  users: { title: "Foydalanuvchilar", description: "Xaridor va mutaxassis hisoblari, verifikatsiya va faollik nazorati." },
  kyc: { title: "KYC navbati", description: "Shaxsni tasdiqlash arizalarini xavfsiz ko‘rib chiqish navbati." },
  disputes: { title: "Nizolar markazi", description: "Escrow, sifat, muddat va kommunikatsiya nizolarini boshqarish." },
  payments: { title: "To‘lovlar va escrow", description: "Shartnoma qiymatlari, mablag‘ holati va provayder monitoringi." },
  support: { title: "Yordam so‘rovlari", description: "Foydalanuvchi murojaatlari va xizmat darajasi navbati." },
  content: { title: "Kontent nazorati", description: "Ish e’lonlari va xizmatlarning holati hamda moderatsiyasi." },
};

function tone(status: string): BadgeTone {
  if (/tasdiq|faol|yakun|active/i.test(status)) return "success";
  if (/rad|bekor|nizo|blok/i.test(status)) return "danger";
  if (/ochiq|ko.rib|imzolangan|kutil/i.test(status)) return "warning";
  return "neutral";
}

export function AdminResourcePage({ kind }: { kind: Kind }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState("");

  function load() {
    const data = getAdminData();
    const blockedUsers = data.blockedUserIds;
    if (kind === "users") {
      setRows(data.users.map((u) => ({
        id: u.id, primary: u.fullName, secondary: u.phone,
        status: blockedUsers.includes(u.id) ? "Bloklangan" : u.verified ? "Tasdiqlangan" : "Tasdiqlanmagan",
        meta: u.role === "xaridor" ? "Xaridor" : "Mutaxassis",
      })));
    } else if (kind === "kyc") {
      setRows(data.verifications.map((v) => {
        const user = data.users.find((u) => u.id === v.userId);
        return {
          id: v.userId,
          primary: user?.fullName ?? v.legalName,
          secondary: `${v.country} · ${v.documentType}`,
          status: v.status,
          meta: v.submittedAt ? formatDate(v.submittedAt) : "Yuborilmagan",
          details: [
            { label: "Yuridik ism", value: v.legalName },
            { label: "Tug‘ilgan sana", value: v.birthDate },
            { label: "Davlat va hujjat", value: `${v.country} · ${v.documentType}` },
            { label: "Hujjatlar", value: `${v.documents.length} ta fayl` },
            ...(v.rejectionReason ? [{ label: "Oldingi rad sababi", value: v.rejectionReason }] : []),
          ],
        };
      }));
    } else if (kind === "disputes") {
      setRows(data.disputes.map((d) => {
        const contract = data.contracts.find((c) => c.id === d.contractId);
        return {
          id: d.id,
          primary: contract?.title ?? d.contractId,
          secondary: d.reason,
          status: d.status,
          meta: formatDate(d.createdAt),
          details: [
            { label: "Shartnoma", value: d.contractId },
            { label: "Sabab", value: d.reason },
            { label: "Murojaat", value: d.description },
            { label: "Dalillar", value: d.evidence.length ? `${d.evidence.length} ta fayl` : "Dalil yuklanmagan" },
          ],
        };
      }));
    } else if (kind === "payments") {
      setRows(data.contracts.map((c) => ({
        id: c.id, primary: c.title, secondary: `${c.buyerName} → ${c.sellerName}`,
        status: c.status, meta: formatDate(c.createdAt), amount: c.totalAmount,
      })));
    } else if (kind === "support") {
      setRows(data.tickets.map((t) => {
        const user = data.users.find((u) => u.id === t.userId);
        return {
          id: t.id,
          primary: t.subject,
          secondary: `${user?.fullName ?? t.userId} · ${t.topic}`,
          status: t.status,
          meta: formatDate(t.createdAt),
          details: [
            { label: "Foydalanuvchi", value: user?.fullName ?? t.userId },
            { label: "Mavzu", value: t.topic },
            { label: "Xabar", value: t.message },
          ],
        };
      }));
    } else {
      setRows([
        ...data.jobs.map((j) => ({ id: j.id, primary: j.title, secondary: `Ish e’loni · ${j.buyerName}`, status: j.status, meta: formatDate(j.postedAt) })),
        ...data.services.map((s) => ({ id: s.id, primary: s.title, secondary: `Xizmat · ${s.category}`, status: s.status, meta: formatDate(s.createdAt) })),
      ]);
    }
  }

  useEffect(() => {
    load();
    // `kind` o'zgarganda tegishli service ma'lumotlari qayta o'qiladi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  function moderate(row: Row) {
    if (kind === "payments") return;
    setSelected(row);
    setNote("");
    setActionError("");
  }

  function confirm(outcome: "approve" | "reject" = "approve") {
    if (!selected || kind === "payments") return;
    try {
      adminModerate(kind, selected.id, { outcome, note });
      setSelected(null);
      load();
    } catch {
      setActionError(
        kind === "disputes"
          ? "Qaror izohi kamida 10 belgidan iborat bo‘lishi kerak."
          : kind === "support"
            ? "Foydalanuvchiga yuboriladigan javobni kiriting."
            : "Rad etish sababini kamida 10 belgi bilan kiriting."
      );
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => `${r.primary} ${r.secondary} ${r.status} ${r.id}`.toLowerCase().includes(q)) : rows;
  }, [query, rows]);

  const columns: TableColumn<Row>[] = [
    { key: "item", header: "Obyekt", render: (row) => <div className="min-w-48"><p className="font-medium text-ink">{row.primary}</p><p className="mt-0.5 text-2xs text-faint">{row.secondary}</p></div> },
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs text-muted">{row.id}</span>, hideOnMobile: true },
    { key: "status", header: "Holat", render: (row) => <Badge tone={tone(row.status)}>{row.status.replaceAll("_", " ")}</Badge> },
    { key: "meta", header: rowLabel(kind), render: (row) => <span className="text-xs text-muted">{row.amount ? formatMoney(row.amount) : row.meta}</span> },
    ...(kind === "payments" ? [] : [{
      key: "action",
      header: "Amal",
      render: (row: Row) => (
        <Button size="sm" variant="secondary" onClick={() => moderate(row)}>
          {actionLabel(kind, row.status)}
        </Button>
      ),
    }]),
  ];

  return (
    <>
      <AdminPageHeader title={config[kind].title} description={config[kind].description} />
      <div className="mb-4 max-w-md">
        <Input aria-label="Qidirish" placeholder="Ism, ID, holat yoki sarlavha bo‘yicha qidirish" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {filtered.length ? (
        <Table columns={columns} rows={filtered} rowKey={(row) => row.id} renderMobileCard={(row) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="break-words text-sm font-medium text-ink">{row.primary}</p><p className="mt-1 text-xs text-muted">{row.secondary}</p><p className="mt-2 text-2xs text-faint">{row.amount ? formatMoney(row.amount) : row.meta}</p></div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge tone={tone(row.status)}>{row.status.replaceAll("_", " ")}</Badge>
              {kind !== "payments" && <Button size="sm" variant="secondary" onClick={() => moderate(row)}>{actionLabel(kind, row.status)}</Button>}
            </div>
          </div>
        )} />
      ) : <EmptyAdmin>Ushbu filtr bo‘yicha ma’lumot topilmadi.</EmptyAdmin>}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Moderatsiya amalini tasdiqlash">
        <p className="break-words text-sm text-muted">
          <strong className="text-ink">{selected?.primary}</strong> uchun “{selected ? actionLabel(kind, selected.status) : ""}” amali bajariladi.
        </p>
        {!!selected?.details?.length && (
          <dl className="mt-4 grid gap-3 rounded-input border border-line bg-card-hover p-4">
            {selected.details.map((detail) => (
              <div key={detail.label} className="min-w-0">
                <dt className="text-2xs font-semibold uppercase tracking-wide text-faint">{detail.label}</dt>
                <dd className="mt-1 whitespace-pre-line break-words [overflow-wrap:anywhere] text-sm text-ink">{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {(kind === "kyc" || kind === "disputes" || kind === "support") && (
          <div className="mt-4">
            <Textarea
              label={kind === "support" ? "Foydalanuvchiga javob" : kind === "disputes" ? "Qaror va asos" : "Rad etilsa — sabab"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={kind === "support" ? 2000 : 1000}
              error={actionError}
            />
          </div>
        )}
        {actionError && kind !== "kyc" && kind !== "disputes" && kind !== "support" && <p role="alert" className="mt-3 text-xs text-danger">{actionError}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setSelected(null)}>Bekor qilish</Button>
          {kind === "kyc" && <Button variant="danger" onClick={() => confirm("reject")}>Rad etish</Button>}
          <Button variant={kind === "users" && selected?.status !== "Bloklangan" ? "danger" : "primary"} onClick={() => confirm("approve")}>
            {selected ? actionLabel(kind, selected.status) : "Tasdiqlash"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

function rowLabel(kind: Kind) {
  return kind === "payments" ? "Summa" : kind === "users" ? "Rol" : "Sana";
}

function actionLabel(kind: Kind, status: string) {
  if (kind === "users") return status === "Bloklangan" ? "Tiklash" : "Bloklash";
  if (kind === "kyc") return status === "tasdiqlangan" ? "Tasdiqlangan" : "Tasdiqlash";
  if (kind === "disputes") return status === "hal_qilindi" ? "Yopilgan" : "Hal qilish";
  if (kind === "support") return status === "yopilgan" ? "Yopilgan" : "Yopish";
  return /active|ochiq/i.test(status) ? "Pauza" : "Faollashtirish";
}
