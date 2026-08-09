"use client";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type {
  ContractStatus,
  JobStatus,
  MilestoneStatus,
  OfferStatus,
  ProposalStatus,
  ServiceStatus,
} from "@/lib/types";
import { useT } from "@/lib/i18n";

const serviceTones: Record<ServiceStatus, BadgeTone> = {
  active: "success",
  paused: "warning",
  draft: "neutral",
};

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const { t } = useT();
  return <Badge tone={serviceTones[status]}>{t(`svcStatus.${status}`)}</Badge>;
}

const contractTones: Record<ContractStatus, BadgeTone> = {
  imzolangan: "warning",
  faol: "info",
  yakunlangan: "success",
  bekor_qilingan: "neutral",
  nizo: "danger",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const { t } = useT();
  return <Badge tone={contractTones[status]}>{t(`cstatus.${status}`)}</Badge>;
}

const milestoneTones: Record<MilestoneStatus, BadgeTone> = {
  kutilmoqda: "neutral",
  mablaglangan: "info",
  topshirildi: "warning",
  qabul_qilindi: "success",
  ozgartirish_soraldi: "danger",
};

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const { t } = useT();
  return <Badge tone={milestoneTones[status]}>{t(`ms.${status}`)}</Badge>;
}

const proposalTones: Record<ProposalStatus, BadgeTone> = {
  yuborilgan: "neutral",
  korib_chiqilmoqda: "info",
  suhbat: "accent",
  yollandi: "success",
  rad_etildi: "danger",
  qaytarib_olingan: "neutral",
};

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  const { t } = useT();
  return <Badge tone={proposalTones[status]}>{t(`pstatus.${status}`)}</Badge>;
}

const offerTones: Record<OfferStatus, BadgeTone> = {
  yuborilgan: "info",
  qabul_qilindi: "success",
  rad_etildi: "neutral",
  bekor_qilingan: "neutral",
};

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const { t } = useT();
  return <Badge tone={offerTones[status]}>{t(`ostatus.${status}`)}</Badge>;
}

const jobTones: Record<JobStatus, BadgeTone> = {
  ochiq: "success",
  yopilgan: "neutral",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { t } = useT();
  return (
    <Badge tone={jobTones[status]}>
      {t(status === "ochiq" ? "jobs.open" : "jobs.closed")}
    </Badge>
  );
}
