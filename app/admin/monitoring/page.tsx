"use client";

import { useState } from "react";
import { AdminPageHeader, HealthRow, MetricCard } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { broadcastNotification } from "@/lib/api/admin";

export default function MonitoringPage() {
  const [tab, setTab] = useState<"system" | "announcements">("system");
  
  // Notification form states
  const [targetRole, setTargetRole] = useState<"all" | "mutaxassis" | "xaridor">("all");
  const [messageText, setMessageText] = useState("");
  const [targetUrl, setTargetUrl] = useState("/dashboard");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  // Targeted notification states
  const [targetUserId, setTargetUserId] = useState("");
  const [targetedMessageText, setTargetedMessageText] = useState("");
  const [targetedUrl, setTargetedUrl] = useState("/dashboard");
  const [targetLoading, setTargetLoading] = useState(false);
  const [targetSuccess, setTargetSuccess] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setActionLoading(true);
    setActionSuccess(false);
    try {
      broadcastNotification({
        targetRole,
        messageKey: messageText.trim(),
        href: targetUrl.trim(),
      });
      setMessageText("");
      setTargetUrl("/dashboard");
      setActionSuccess(true);
      setTimeout(() => setActionSuccess(false), 3000);
    } catch {
      alert("Xato yuz berdi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTargetedSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim() || !targetedMessageText.trim()) return;
    setTargetLoading(true);
    setTargetSuccess(false);
    try {
      // In mock, send targeted notification by creating a notification record in localStorage
      const notifications = JSON.parse(localStorage.getItem("sb2_notifications") || "[]");
      const newNtf = {
        id: `ntf-${Date.now()}`,
        userId: targetUserId.trim(),
        kind: "tolov",
        messageKey: targetedMessageText.trim(),
        href: targetedUrl.trim(),
        read: false,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("sb2_notifications", JSON.stringify([newNtf, ...notifications]));

      // Log in audit log
      try {
        const auditEvents = JSON.parse(localStorage.getItem("sb2_admin_audit") || "[]");
        const adminAccount = JSON.parse(localStorage.getItem("sb2_admin_session") || "{}");
        const event = {
          id: `audit-${Date.now()}`,
          adminId: adminAccount.adminId || "admin",
          adminName: "Dilnoza Rahimova",
          action: `Foydalanuvchiga bildirishnoma yuborildi: ${targetedMessageText.trim().slice(0, 50)}`,
          target: targetUserId.trim(),
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem("sb2_admin_audit", JSON.stringify([event, ...auditEvents]));
      } catch {}

      setTargetUserId("");
      setTargetedMessageText("");
      setTargetedUrl("/dashboard");
      setTargetSuccess(true);
      setTimeout(() => setTargetSuccess(false), 3000);
    } catch {
      alert("Xato yuz berdi");
    } finally {
      setTargetLoading(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Tizim monitoringi va bildirishnomalar"
        description="Platforma xizmatlari holati, uptime, hamda foydalanuvchilarga global va maqsadli bildirishnomalar yuborish paneli."
      />

      {/* Tabs */}
      <Card padding="md" className="mb-6">
        <div className="flex border-b border-line pb-0.5">
          {[
            { id: "system", label: "Tizim salomatligi (Uptime & Services)" },
            { id: "announcements", label: "Bildirishnomalar va E'lonlar (Announcements)" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as "system" | "announcements")}
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
      </Card>

      {/* Tab 1: System Health */}
      {tab === "system" && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Uptime" value="99.98%" detail="Oxirgi 30 kun" tone="success" />
            <MetricCard label="P95 javob" value="184 ms" detail="Maqsad: < 300 ms" tone="success" />
            <MetricCard label="Xato darajasi" value="0.08%" detail="Oxirgi 60 daqiqa" tone="success" />
            <MetricCard label="Faol sessiyalar" value="128" detail="Hozir onlayn" />
          </div>
          <div className="mt-2 grid gap-6 lg:grid-cols-2">
            <Card padding="lg">
              <h2 className="font-heading text-base font-bold text-ink">Servislar</h2>
              <div className="mt-3">
                <HealthRow name="Web ilova" value="Ishlayapti" status="healthy" />
                <HealthRow name="Auth va OTP" value="Mock rejim" status="warning" />
                <HealthRow name="Click / Payme" value="Ulanmagan" status="warning" />
                <HealthRow name="Visa 3DS" value="Ulanmagan" status="warning" />
                <HealthRow name="Fayl storage" value="Local" status="warning" />
              </div>
            </Card>
            <Card padding="lg">
              <h2 className="font-heading text-base font-bold text-ink">Xavfsizlik signallari</h2>
              <div className="mt-3">
                <HealthRow name="Shubhali loginlar" value="0" status="healthy" />
                <HealthRow name="Rate-limit bloklari" value="0" status="healthy" />
                <HealthRow name="To‘lov nomuvofiqligi" value="0" status="healthy" />
                <HealthRow name="Ochiq yuqori risk" value="0" status="healthy" />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Announcements Form */}
      {tab === "announcements" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Broadcast Notification */}
          <Card padding="lg">
            <h3 className="font-heading text-sm font-bold text-ink border-b border-line pb-2 mb-4">
              Tizim miqyosida bildirishnoma yuborish
            </h3>
            <form onSubmit={handleBroadcast} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Kimga yuboriladi (Roli)</label>
                <select
                  aria-label="Target role select"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as "all" | "mutaxassis" | "xaridor")}
                  className="w-full rounded-input border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-primary"
                >
                  <option value="all">Barcha foydalanuvchilar</option>
                  <option value="mutaxassis">Faqat Mutaxassislar</option>
                  <option value="xaridor">Faqat Xaridorlar</option>
                </select>
              </div>

              <Textarea
                label="Bildirishnoma matni"
                placeholder="Masalan: Tizimda rejaviy yangilanish ishlari olib boriladi..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                required
                maxLength={300}
              />

              <Input
                label="Yo'naltirish URL manzili (Link href)"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required
              />

              {actionSuccess && (
                <p className="text-xs text-success font-medium">Bildirishnoma muvaffaqiyatli broadcast qilindi!</p>
              )}

              <Button type="submit" variant="primary" className="justify-center mt-2" disabled={actionLoading || !messageText.trim()}>
                Guruhli yuborish (Broadcast)
              </Button>
            </form>
          </Card>

          {/* Targeted Notification */}
          <Card padding="lg">
            <h3 className="font-heading text-sm font-bold text-ink border-b border-line pb-2 mb-4">
              Maqsadli bildirishnoma (Targeted SMS/Push)
            </h3>
            <form onSubmit={handleTargetedSend} className="flex flex-col gap-4">
              <Input
                label="Qabul qiluvchi foydalanuvchi ID raqami"
                placeholder="User ID (masalan: u-1)"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                required
              />

              <Textarea
                label="Bildirishnoma matni"
                placeholder="Masalan: Sizning shaxsingizni tasdiqlash arizangiz ma'qullandi..."
                value={targetedMessageText}
                onChange={(e) => setTargetedMessageText(e.target.value)}
                required
                maxLength={300}
              />

              <Input
                label="Yo'naltirish URL manzili (Link href)"
                value={targetedUrl}
                onChange={(e) => setTargetedUrl(e.target.value)}
                required
              />

              {targetSuccess && (
                <p className="text-xs text-success font-medium font-sans">Bildirishnoma foydalanuvchiga yuborildi!</p>
              )}

              <Button type="submit" variant="secondary" className="justify-center mt-2" disabled={targetLoading || !targetUserId.trim() || !targetedMessageText.trim()}>
                Yakka tartibda yuborish
              </Button>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
