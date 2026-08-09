"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { ContractStatusBadge } from "@/components/shared/StatusBadge";
import { contractsService, milestonesService } from "@/lib/api";
import type { Contract, ContractStatus, Milestone } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

const STATUSES: ContractStatus[] = ["faol", "yakunlangan", "bekor_qilingan", "nizo"];

type Filter = "all" | ContractStatus;

export default function ShartnomalarPage() {
  const { t, lang } = useT();
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([contractsService.list(), milestonesService.listMine()])
      .then(([contractList, milestoneList]) => {
        setContracts(contractList);
        setMilestones(milestoneList);
      })
      /* Yuklash xatosi bo'sh ro'yxat EMAS — alohida holat ko'rsatiladi */
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  function progress(contractId: string): string {
    const list = milestones.filter((m) => m.contractId === contractId);
    const done = list.filter((m) => m.status === "qabul_qilindi").length;
    return `${done}/${list.length}`;
  }

  const filtered =
    contracts?.filter((c) => filter === "all" || c.status === filter) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-extrabold text-ink">
        {t("contracts.title")}
      </h1>

      <Tabs
        value={filter}
        onChange={(value) => setFilter(value as Filter)}
        items={[
          { value: "all", label: t("contracts.tabAll"), count: contracts?.length },
          ...STATUSES.map((status) => ({
            value: status,
            label: t(`cstatus.${status}`),
            count: contracts?.filter((c) => c.status === status).length,
          })),
        ]}
      />

      {loadError ? (
        <ErrorState error={loadError} onRetry={load} />
      ) : !contracts ? (
        <SkeletonCard />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            contracts.length === 0 ? t("contracts.emptyAll") : t("contracts.empty")
          }
        />
      ) : (
        <Table
          rows={filtered}
          rowKey={(c) => c.id}
          onRowClick={(c) => router.push(`/mutaxassis/shartnomalar/${c.id}`)}
          columns={[
            {
              key: "buyer",
              header: t("contracts.colBuyer"),
              render: (c) => (
                <span className="flex items-center gap-2.5">
                  <Avatar name={c.buyerName} size="sm" />
                  <span className="font-medium">{c.buyerName}</span>
                </span>
              ),
            },
            {
              key: "title",
              header: t("contracts.colTitle"),
              render: (c) => (
                <span className="block max-w-64 truncate text-muted">{c.title}</span>
              ),
            },
            {
              key: "amount",
              header: t("contracts.colAmount"),
              render: (c) => formatMoney(c.totalAmount, lang),
            },
            {
              key: "progress",
              header: t("contracts.colProgress"),
              render: (c) => <span className="text-muted">{progress(c.id)}</span>,
            },
            {
              key: "status",
              header: t("contracts.colStatus"),
              render: (c) => <ContractStatusBadge status={c.status} />,
            },
          ]}
          renderMobileCard={(c) => (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <Avatar name={c.buyerName} size="sm" />
                  <span className="text-sm font-medium text-ink">{c.buyerName}</span>
                </span>
                <ContractStatusBadge status={c.status} />
              </div>
              <p className="truncate text-xs text-muted">{c.title}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-ink">
                  {formatMoney(c.totalAmount, lang)}
                </span>
                <span className="text-faint">
                  {t("contracts.colProgress")}: {progress(c.id)}
                </span>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
