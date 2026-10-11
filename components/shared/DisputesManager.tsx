"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { contractsService, disputesService } from "@/lib/api";
import type { Contract, Dispute, UserRole } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";

interface DisputesManagerProps {
  role: UserRole;
}

type DisputeFilter = "all" | Dispute["status"];

const STATUS_TONES: Record<Dispute["status"], BadgeTone> = {
  ochiq: "warning",
  korib_chiqilmoqda: "info",
  hal_qilindi: "success",
};

export function DisputesManager({ role }: DisputesManagerProps) {
  const { t, lang } = useT();
  const [disputes, setDisputes] = useState<Dispute[] | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filter, setFilter] = useState<DisputeFilter>("all");
  const [loadError, setLoadError] = useState<unknown>(null);

  const basePath = role === "mutaxassis" ? "/mutaxassis" : "/xaridor";

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([disputesService.listMine(), contractsService.list()])
      .then(([disputeList, contractList]) => {
        setDisputes(disputeList);
        setContracts(contractList);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  const contractMap = new Map(contracts.map((c) => [c.id, c]));

  const filtered = (disputes ?? []).filter(
    (d) => filter === "all" || d.status === filter
  );

  function getReasonLabel(reason: Dispute["reason"]): string {
    const key = `dispute.reason_${reason}`;
    const translated = t(key);
    return translated !== key ? translated : reason;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <BackButton href={basePath} label={t("nav.dashboard")} />
      </div>

      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("nav.disputes")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Shartnomalar bo&apos;yicha e&apos;tirozlar, arbitraj jarayoni va hal qilingan ishlar ro&apos;yxati
        </p>
      </div>

      {/* Kafolat va arbitraj ma'lumot paneli */}
      <Card padding="md" className="border-info/20 bg-info/5">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info/10 text-lg">
            ⚖️
          </span>
          <div className="flex-1 text-xs text-muted leading-relaxed">
            <h2 className="font-heading text-sm font-bold text-ink">
              Bobololadono Mustaqil Arbitraj Xizmati
            </h2>
            <p className="mt-1">
              Shartnoma bo&apos;yicha nizo ochilganda mablag&apos;lar Escrow hisobida xavfsiz muzlatiladi.
              Arbitraj guruhi har ikki tomonning dalillari va ish natijasini o&apos;rganib chiqib, 3 ish kuni
              ichida adolatli qaror qabul qiladi.
            </p>
          </div>
        </div>
      </Card>

      <Tabs
        value={filter}
        onChange={(val) => setFilter(val as DisputeFilter)}
        items={[
          { value: "all", label: t("common.all") || "Barchasi", count: disputes?.length },
          {
            value: "ochiq",
            label: t("dispute.status_ochiq"),
            count: disputes?.filter((d) => d.status === "ochiq").length,
          },
          {
            value: "korib_chiqilmoqda",
            label: t("dispute.status_korib_chiqilmoqda"),
            count: disputes?.filter((d) => d.status === "korib_chiqilmoqda").length,
          },
          {
            value: "hal_qilindi",
            label: t("dispute.status_hal_qilindi"),
            count: disputes?.filter((d) => d.status === "hal_qilindi").length,
          },
        ]}
      />

      {loadError ? (
        <ErrorState error={loadError} onRetry={load} />
      ) : !disputes ? (
        <SkeletonCard />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={disputes.length === 0 ? "Nizolar mavjud emas" : "Ushbu holatda nizolar topilmadi"}
          description={
            disputes.length === 0
              ? "Sizda hozircha birorta ham nizoli shartnoma yo'q. Shartnoma bo'yicha e'tiroz yuzaga kelsa, shartnoma ishchi xonasi orqali nizo ochishingiz mumkin."
              : "Tanlangan filtr bo'yicha nizolar mavjud emas."
          }
          action={
            disputes.length === 0 ? (
              <Link href={`${basePath}/contracts`}>
                <Button size="sm">Shartnomalarni ko&apos;rish</Button>
              </Link>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setFilter("all")}>
                Barcha nizolarni ko&apos;rish
              </Button>
            )
          }
        />
      ) : (
        <Table
          rows={filtered}
          rowKey={(d) => d.id}
          columns={[
            {
              key: "contract",
              header: "Shartnoma",
              render: (d) => {
                const contract = contractMap.get(d.contractId);
                return (
                  <div className="flex flex-col gap-0.5">
                    <Link
                      href={`${basePath}/contracts/${d.contractId}`}
                      className="font-medium text-ink hover:text-primary transition-colors line-clamp-1"
                    >
                      {contract?.title ?? d.contractId}
                    </Link>
                    <span className="text-2xs text-muted">
                      {role === "mutaxassis"
                        ? `Xaridor: ${contract?.buyerName ?? "—"}`
                        : `Mutaxassis: ${contract?.sellerName ?? "—"}`}
                    </span>
                  </div>
                );
              },
            },
            {
              key: "reason",
              header: t("dispute.reason"),
              render: (d) => (
                <span className="font-medium text-ink text-xs">
                  {getReasonLabel(d.reason)}
                </span>
              ),
            },
            {
              key: "description",
              header: "Tavsif",
              render: (d) => (
                <p className="max-w-xs truncate text-xs text-muted">
                  {d.description}
                </p>
              ),
            },
            {
              key: "date",
              header: "Ochilgan sana",
              render: (d) => (
                <span className="text-xs text-muted">
                  {formatDate(d.createdAt, lang)}
                </span>
              ),
            },
            {
              key: "status",
              header: "Holat",
              render: (d) => (
                <Badge tone={STATUS_TONES[d.status]}>
                  {t(`dispute.status_${d.status}`)}
                </Badge>
              ),
            },
            {
              key: "action",
              header: "",
              render: (d) => (
                <Link href={`${basePath}/contracts/${d.contractId}`}>
                  <Button variant="ghost" size="sm">
                    Ko&apos;rish →
                  </Button>
                </Link>
              ),
            },
          ]}
          renderMobileCard={(d) => {
            const contract = contractMap.get(d.contractId);
            return (
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`${basePath}/contracts/${d.contractId}`}
                      className="text-sm font-bold text-ink hover:text-primary transition-colors line-clamp-1"
                    >
                      {contract?.title ?? d.contractId}
                    </Link>
                    <p className="text-2xs text-muted">
                      {role === "mutaxassis"
                        ? `Xaridor: ${contract?.buyerName ?? "—"}`
                        : `Mutaxassis: ${contract?.sellerName ?? "—"}`}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONES[d.status]}>
                    {t(`dispute.status_${d.status}`)}
                  </Badge>
                </div>

                <div className="rounded-input border border-line bg-surface p-2.5 text-xs">
                  <p className="font-semibold text-ink">{getReasonLabel(d.reason)}</p>
                  <p className="mt-1 line-clamp-2 text-muted">{d.description}</p>
                </div>

                <div className="flex items-center justify-between text-2xs text-muted pt-1">
                  <span>{formatDate(d.createdAt, lang)}</span>
                  <Link href={`${basePath}/contracts/${d.contractId}`}>
                    <Button variant="ghost" size="sm">
                      Tafsilotlar →
                    </Button>
                  </Link>
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
