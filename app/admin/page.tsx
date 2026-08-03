"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader, HealthRow, MetricCard } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { getAdminData } from "@/lib/api/admin";
import { formatMoney } from "@/lib/format";

type Data = ReturnType<typeof getAdminData>;

export default function AdminDashboard() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => setData(getAdminData()), []);

  /* Yuklanish holati — bo'sh ekran o'rniga skeleton */
  if (!data) {
    return (
      <>
        <AdminPageHeader
          title="Operatsion boshqaruv"
          description="Marketplace holati, xavfli navbatlar va kunlik operatsiyalar uchun yagona markaz."
        />
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </section>
        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SkeletonCard />
          </div>
          <SkeletonCard />
        </section>
      </>
    );
  }
  const activeContracts = data.contracts.filter((item) => item.status === "faol").length;
  const volume = data.contracts.reduce((sum, item) => sum + item.totalAmount, 0);
  const openCases = data.disputes.filter((item) => item.status !== "hal_qilindi").length;

  return (
    <>
      <AdminPageHeader title="Operatsion boshqaruv" description="Marketplace holati, xavfli navbatlar va kunlik operatsiyalar uchun yagona markaz." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Foydalanuvchilar" value={data.users.length} detail={`${data.users.filter((u) => u.verified).length} ta tasdiqlangan`} />
        <MetricCard label="Faol shartnomalar" value={activeContracts} detail={`${data.contracts.length} ta jami`} tone="success" />
        <MetricCard label="Platforma hajmi" value={formatMoney(volume)} detail="Shartnomalar umumiy qiymati" />
        <MetricCard label="Ochiq xavflar" value={openCases + data.verifications.filter((v) => v.status === "korib_chiqilmoqda").length} detail="Nizo va KYC navbati" tone={openCases ? "danger" : "warning"} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-ink">Tezkor navbatlar</h2>
            <Badge tone="warning">Harakat talab qiladi</Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["KYC tekshiruvi", data.verifications.filter((v) => v.status === "korib_chiqilmoqda").length, "/admin/verifikatsiya"],
              ["Ochiq nizolar", openCases, "/admin/nizolar"],
              ["Yordam so‘rovlari", data.tickets.filter((t) => t.status === "ochiq").length, "/admin/yordam"],
              ["Faol kontent", data.jobs.filter((j) => j.status === "ochiq").length + data.services.filter((s) => s.status === "active").length, "/admin/kontent"],
            ].map(([label, count, href]) => (
              <Link key={String(label)} href={String(href)} className="rounded-input border border-line bg-card-hover p-4 transition-colors hover:border-primary">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 font-heading text-xl font-bold text-ink">{count}</p>
              </Link>
            ))}
          </div>
        </Card>
        <Card padding="lg">
          <h2 className="font-heading text-base font-bold text-ink">Tizim salomatligi</h2>
          <div className="mt-3">
            <HealthRow name="Frontend" value="99.98%" status="healthy" />
            <HealthRow name="API gateway" value="42 ms" status="healthy" />
            <HealthRow name="To‘lov webhooks" value="Mock" status="warning" />
            <HealthRow name="Fraud nazorati" value="Mock" status="warning" />
          </div>
        </Card>
      </section>
    </>
  );
}
