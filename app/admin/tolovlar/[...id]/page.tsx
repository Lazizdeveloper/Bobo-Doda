"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { listWithdrawalsQueue, staffListPayments, type StaffPayment } from "@/lib/api/admin";
import type { WithdrawalRequest } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";

interface PayoutDetailPageProps {
  params: Promise<{ id: string | string[] }>;
}

export default function PayoutDetailPage({ params }: PayoutDetailPageProps) {
  const { id: rawId } = use(params);
  const id = Array.isArray(rawId) ? rawId.join("/") : rawId;
  const [loading, setLoading] = useState(true);
  const [withdrawal, setWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [payment, setPayment] = useState<StaffPayment | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function loadDetail() {
      try {
        // First check withdrawal requests
        const wPage = await listWithdrawalsQueue({ page: 1, perPage: 100 });
        const foundW = wPage.items.find((w) => w.id === id);
        if (foundW && !cancelled) {
          setWithdrawal(foundW);
          setLoading(false);
          return;
        }

        // Then check staff payments
        const pPage = await staffListPayments({ page: 1, perPage: 100 });
        const foundP = pPage.items.find((p) => p.id === id || p.contractId === id);
        if (foundP && !cancelled) {
          setPayment(foundP);
          setLoading(false);
          return;
        }
      } catch {
        // Handled below via null states
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <LoadingState message="To'lov ma'lumotlari yuklanmoqda..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <AdminPageHeader
          title={`Moliya Obyekti: ${id}`}
          description="To'lov yoki mablag' yechish so'rovi audit tafsilotlari."
        />
        <Link href="/admin/tolovlar">
          <Button variant="outline" size="sm">
            ← Barcha to‘lovlar
          </Button>
        </Link>
      </div>

      {withdrawal ? (
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <p className="text-2xs uppercase font-bold text-muted">Amaliyot turi</p>
              <h3 className="font-heading text-lg font-bold text-ink">Mablag‘ Yechish So‘rovi</h3>
            </div>
            <Badge tone={withdrawal.status === "tasdiqlangan" ? "success" : withdrawal.status === "rad_etilgan" ? "danger" : "warning"}>
              {withdrawal.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted block">So‘rov ID:</span>
              <span className="font-mono font-semibold text-ink">{withdrawal.id}</span>
            </div>
            <div>
              <span className="text-muted block">Foydalanuvchi:</span>
              <span className="font-semibold text-ink">{withdrawal.userName}</span>
            </div>
            <div>
              <span className="text-muted block">Summa:</span>
              <span className="font-semibold text-ink text-sm">{formatMoney(withdrawal.amount)}</span>
            </div>
            <div>
              <span className="text-muted block">Sana:</span>
              <span className="text-ink">{formatDate(withdrawal.createdAt)}</span>
            </div>
          </div>
        </Card>
      ) : payment ? (
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <p className="text-2xs uppercase font-bold text-muted">Amaliyot turi</p>
              <h3 className="font-heading text-lg font-bold text-ink">Shartnoma To‘lovi</h3>
            </div>
            <Badge tone={payment.status === "SUCCEEDED" ? "success" : "warning"}>
              {payment.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted block">To‘lov ID:</span>
              <span className="font-mono font-semibold text-ink">{payment.id}</span>
            </div>
            <div>
              <span className="text-muted block">Shartnoma ID:</span>
              <span className="font-mono text-ink">{payment.contractId}</span>
            </div>
            <div>
              <span className="text-muted block">Provayder:</span>
              <span className="font-semibold text-ink">{payment.provider}</span>
            </div>
            <div>
              <span className="text-muted block">Summa:</span>
              <span className="font-semibold text-ink text-sm">{formatMoney(payment.amount)}</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="lg" className="text-center py-12 space-y-3">
          <p className="text-sm font-semibold text-ink">
            {id} identifikatorli to‘lov yoki mablag‘ yechish so‘rovi topilmadi.
          </p>
          <p className="text-xs text-muted max-w-md mx-auto">
            Obyekt tizimda mavjud bo‘lmasligi yoki allaqachon arxivlangan bo‘lishi mumkin.
          </p>
          <div className="pt-2">
            <Link href="/admin/tolovlar">
              <Button size="sm">To‘lovlar markaziga o‘tish</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
