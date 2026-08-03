"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getSystemSettings, revokeAllUserSessions, saveSystemSettings } from "@/lib/api/admin";
import { Modal } from "@/components/ui/Modal";

export default function SystemPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [registration, setRegistration] = useState(true);
  const [paymentsPaused, setPaymentsPaused] = useState(false);
  const [commission, setCommission] = useState("10");
  const [saved, setSaved] = useState(false);
  const [confirmSessions, setConfirmSessions] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const settings = getSystemSettings();
    setMaintenance(settings.maintenance);
    setRegistration(settings.registration);
    setPaymentsPaused(settings.paymentsPaused);
    setCommission(String(settings.commission));
  }, []);

  function save() {
    setError("");
    try {
      saveSystemSettings({ maintenance, registration, paymentsPaused, commission: Number(commission) });
      setSaved(true);
    } catch {
      setError("Komissiya 0–30% oralig‘ida bo‘lishi kerak.");
    }
  }
  return (
    <>
      <AdminPageHeader title="Tizim sozlamalari" description="CEO-only biznes qoidalari va favqulodda boshqaruv. Production’da o‘zgarishlar server auditidan o‘tadi." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <h2 className="font-heading text-base font-bold text-ink">Platforma rejimi</h2>
          <div className="mt-4 flex flex-col gap-4">
            <Checkbox checked={registration} onChange={(e) => setRegistration(e.target.checked)} label="Yangi ro‘yxatdan o‘tishga ruxsat" />
            <Checkbox checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} label="Texnik xizmat rejimi" />
            <Checkbox checked={paymentsPaused} onChange={(e) => setPaymentsPaused(e.target.checked)} label="Yangi to‘lovlarni vaqtincha to‘xtatish" />
          </div>
        </Card>
        <Card padding="lg">
          <h2 className="font-heading text-base font-bold text-ink">Moliyaviy qoida</h2>
          <div className="mt-4">
            <Input label="Platforma komissiyasi (%)" type="number" min="0" max="30" step="0.1" value={commission} onChange={(e) => setCommission(e.target.value)} />
          </div>
        </Card>
      </div>
      <Card padding="lg" className="mt-6 border-danger/40">
        <h2 className="font-heading text-base font-bold text-danger">Favqulodda boshqaruv</h2>
        <p className="mt-2 text-sm text-muted">Barcha foydalanuvchi sessiyalarini bekor qilish qayta login talab qiladi va auditga yoziladi.</p>
        <div className="mt-4 flex flex-wrap gap-2"><Button variant="danger" onClick={() => setPaymentsPaused(true)}>To‘lovlarni to‘xtatish</Button><Button variant="secondary" onClick={() => setConfirmSessions(true)}>Barcha sessiyalarni bekor qilish</Button></div>
      </Card>
      {error && <p role="alert" className="mt-4 text-xs text-danger">{error}</p>}
      <div className="mt-6 flex items-center gap-3"><Button onClick={save}>Sozlamalarni saqlash</Button>{saved && <span className="text-xs text-success">Saqlandi</span>}</div>
      <Modal open={confirmSessions} onClose={() => setConfirmSessions(false)} title="Barcha sessiyalar bekor qilinsinmi?">
        <p className="text-sm text-muted">Xaridor va mutaxassislar barcha qurilmalarda qayta kirishi kerak bo‘ladi.</p>
        <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmSessions(false)}>Bekor qilish</Button><Button variant="danger" onClick={() => { revokeAllUserSessions(); setConfirmSessions(false); }}>Tasdiqlash</Button></div>
      </Modal>
    </>
  );
}
