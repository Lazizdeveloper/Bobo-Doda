"use client";

import { AdminPageHeader, HealthRow, MetricCard } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";

export default function MonitoringPage() {
  return (
    <>
      <AdminPageHeader title="Real-time monitoring" description="Servislar ishlashi, javob vaqti, xatolar va xavfsizlik signallari." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Uptime" value="99.98%" detail="Oxirgi 30 kun" tone="success" />
        <MetricCard label="P95 javob" value="184 ms" detail="Maqsad: < 300 ms" tone="success" />
        <MetricCard label="Xato darajasi" value="0.08%" detail="Oxirgi 60 daqiqa" tone="success" />
        <MetricCard label="Faol sessiyalar" value="128" detail="Hozir onlayn" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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
    </>
  );
}
