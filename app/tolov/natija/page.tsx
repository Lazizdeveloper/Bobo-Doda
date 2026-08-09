"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/shared/Logo";
import { useT } from "@/lib/i18n";

const VALID = ["success", "pending", "failed", "expired", "refunded"] as const;
type PaymentResult = (typeof VALID)[number];

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<PaymentResultFallback />}>
      <PaymentResultContent />
    </Suspense>
  );
}

function PaymentResultContent() {
  const params = useSearchParams();
  const { t } = useT();
  const raw = params.get("status");
  const status: PaymentResult = VALID.includes(raw as PaymentResult)
    ? (raw as PaymentResult)
    : "pending";
  const reference = params.get("reference");
  const success = status === "success" || status === "refunded";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center px-4 sm:px-8">
        <Logo href="/" />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Card padding="lg" className="w-full max-w-md text-center">
          <span
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              success
                ? "bg-success/10 text-success-deep"
                : status === "pending"
                  ? "bg-warning/10 text-warning-deep"
                  : "bg-danger/10 text-danger-deep"
            }`}
          >
            {success ? "✓" : status === "pending" ? "…" : "×"}
          </span>
          <h1 className="mt-5 font-heading text-xl font-bold text-ink">
            {t(`paymentResult.${status}Title`)}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {t(`paymentResult.${status}Desc`)}
          </p>
          {reference && (
            <p className="mt-4 rounded-input border border-line bg-surface p-3 font-mono text-xs text-faint">
              {reference}
            </p>
          )}
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

function PaymentResultFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="sb-skeleton h-40 w-full max-w-md rounded-card bg-card" />
    </div>
  );
}
