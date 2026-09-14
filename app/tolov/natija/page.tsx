"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/shared/Logo";
import { useT } from "@/lib/i18n";

/**
 * Bosqich 17, bo'lim 24 — bu sahifa endi HECH QACHON query-parametrdan
 * ("status=success" va h.k.) to'lov natijasini o'qimaydi/ishonmaydi —
 * bunday parametr brauzer manzil satrida ochiq va soxtalashtirilishi
 * mumkin. Real Payme checkout hozircha per-so'rov `returnUrl`
 * qabul qilmaydi (backend `payment.service.ts#create()` uni
 * uzatmaydi — Payme Business kabinetidagi STATIK sozlamaga bog'liq,
 * ilova kodi nazorat qila olmaydi), shuning uchun bu sahifa endi shunchaki
 * xaridorni haqiqiy holat SO'RALADIGAN joyga — shartnoma sahifasiga
 * (u yerda `paymentsService.getContractPayment` orqali bounded polling
 * bor) yo'naltiradi.
 */
export default function PaymentResultPage() {
  const { t } = useT();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center px-4 sm:px-8">
        <Logo href="/" />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Card padding="lg" className="w-full max-w-md text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-info/10 text-info-deep">…</span>
          <h1 className="mt-5 font-heading text-xl font-bold text-ink">{t("paymentResult.checkingTitle")}</h1>
          <p className="mt-2 text-sm text-muted">{t("paymentResult.checkingDesc")}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/xaridor/shartnomalar">
              <Button>{t("paymentResult.contracts")}</Button>
            </Link>
            <Link href="/xaridor/yordam">
              <Button variant="secondary">{t("nav.help")}</Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
