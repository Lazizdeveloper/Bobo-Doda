"use client";

import { AdminPageHeader, MetricCard } from "@/components/admin/AdminUI";
import { formatMoney } from "@/lib/format";

export default function AnalyticsPage() {
  return (
    <>
      <AdminPageHeader
        title="Global Analitika"
        description="Marketplace o'sishi, foydalanuvchilar faolligi va moliyaviy ko'rsatkichlar."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <MetricCard
          label="Oylik aylanma (GMV)"
          value={formatMoney(45000000)}
          detail="O'tgan oyga nisbatan +12%"
          tone="primary"
        />
        <MetricCard
          label="Oylik daromad"
          value={formatMoney(4500000)}
          detail="10% komissiya asosida"
          tone="success"
        />
        <MetricCard
          label="Faol foydalanuvchilar"
          value="1,240"
          detail="So'nggi 30 kunda"
          tone="warning"
        />
        <MetricCard
          label="Muvaffaqiyatli shartnomalar"
          value="342"
          detail="94% yakunlanish ko'rsatkichi"
          tone="primary"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-card p-6">
          <h3 className="font-heading text-lg font-bold text-ink mb-4">Kategoriyalar bo'yicha daromad</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-ink">Veb Dasturlash</span>
                <span className="font-semibold text-ink">45%</span>
              </div>
              <div className="h-2 w-full bg-card-hover rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: "45%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-ink">Dizayn</span>
                <span className="font-semibold text-ink">30%</span>
              </div>
              <div className="h-2 w-full bg-card-hover rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: "30%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-ink">Marketing</span>
                <span className="font-semibold text-ink">25%</span>
              </div>
              <div className="h-2 w-full bg-card-hover rounded-full overflow-hidden">
                <div className="h-full bg-success" style={{ width: "25%" }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-line bg-card p-6">
          <h3 className="font-heading text-lg font-bold text-ink mb-4">Varonka (Funnel) tahlili</h3>
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">1. Saytga tashrif</span>
              <div className="flex items-center gap-2">
                <div className="h-6 bg-card-hover rounded w-full border border-line"></div>
                <span className="text-sm font-bold w-12 text-right">100%</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">2. Ro'yxatdan o'tish</span>
              <div className="flex items-center gap-2">
                <div className="h-6 bg-card-hover rounded w-3/4 border border-line"></div>
                <span className="text-sm font-bold w-12 text-right">45%</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">3. Tasdiqlangan (KYC)</span>
              <div className="flex items-center gap-2">
                <div className="h-6 bg-card-hover rounded w-1/2 border border-line"></div>
                <span className="text-sm font-bold w-12 text-right">28%</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">4. Birinchi shartnoma</span>
              <div className="flex items-center gap-2">
                <div className="h-6 bg-card-hover rounded w-1/4 border border-primary/50"></div>
                <span className="text-sm font-bold w-12 text-right text-primary">12%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
