"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { ContractStatusBadge } from "@/components/shared/StatusBadge";
import {
  getAllMessages,
  getAllMilestones,
  getContracts,
  getCurrentUser,
  getIncomingOffers,
  getJobs,
  getProposals,
  getSellerProfile,
  getServices,
  getSession,
  SELLER_ID,
} from "@/lib/api";
import type {
  Contract,
  Job,
  Message,
  Milestone,
  Offer,
  Proposal,
  SellerProfile,
  Service,
} from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

const PENDING_PROPOSAL_STATUSES = ["yuborilgan", "korib_chiqilmoqda", "suhbat"];

export default function DashboardPage() {
  const { t, lang } = useT();
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    getContracts().then(setContracts);
    getProposals().then(setProposals);
    getIncomingOffers().then(setOffers);
    getAllMilestones().then(setMilestones);
    getAllMessages().then((all) =>
      setMessages(
        [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
      )
    );
    getSellerProfile().then(setProfile);
    getServices().then(setServices);
    getJobs().then(setJobs);
    getCurrentUser().then((user) => user && setName(user.fullName));
  }, []);

  const loading = !contracts || !proposals || !milestones || !messages || !profile;

  const myId = getSession()?.userId ?? SELLER_ID;

  const activeCount = contracts?.filter((c) => c.status === "faol").length ?? 0;
  const pendingProposals =
    proposals?.filter((p) => PENDING_PROPOSAL_STATUSES.includes(p.status)).length ?? 0;

  const recentContracts = contracts?.slice(0, 3) ?? [];
  const buyerByContract = new Map(contracts?.map((c) => [c.id, c.buyerName]));
  /* Javob kutayotgan to'g'ridan-to'g'ri takliflar — harakat talab qiladi */
  const pendingOffers = offers.filter((o) => o.status === "yuborilgan");

  /* Profil to'liqligi — har bir bosqich to'ldiriladigan sahifaga yo'naltiradi */
  const checks: { key: string; done: boolean; href: string }[] = profile
    ? [
        {
          key: "dash.ckBio",
          done: profile.bio.trim().length >= 50,
          href: "/mutaxassis/sozlamalar",
        },
        {
          key: "dash.ckSkills",
          done: profile.skills.length >= 3,
          href: "/mutaxassis/sozlamalar",
        },
        {
          key: "dash.ckService",
          done: services.some((s) => s.status === "active"),
          href: "/mutaxassis/xizmatlarim/yangi",
        },
        {
          key: "dash.ckPortfolio",
          done: profile.portfolio.length > 0,
          href: "/mutaxassis/sozlamalar",
        },
      ]
    : [];
  const completeness = checks.length
    ? Math.round((checks.filter((c) => c.done).length / checks.length) * 100)
    : 0;
  const firstIncomplete = checks.find((c) => !c.done);

  /* Sizga mos ochiq e'lonlar (taklif yuborilmaganlari) */
  const proposedJobIds = new Set(
    proposals?.filter((p) => p.status !== "qaytarib_olingan").map((p) => p.jobId)
  );
  const skillSet = new Set(profile?.skills.map((s) => s.toLowerCase()));
  const matchingJobs = jobs
    .filter(
      (j) =>
        j.status === "ochiq" &&
        !proposedJobIds.has(j.id) &&
        (profile?.categories.includes(j.category) ||
          j.skillsRequired.some((s) => skillSet.has(s.toLowerCase())))
    )
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("dash.title")}
        </h1>
        {name && (
          <p className="mt-1 text-sm text-muted">
            {t("dash.greeting")}, {name.split(" ")[0]}
          </p>
        )}
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-6 w-16" />
            </Card>
          ))
        ) : (
          <>
            <Card>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("dash.activeContracts")}
              </p>
              <p className="mt-2 font-heading text-xl font-bold text-ink">
                {activeCount}
              </p>
            </Card>
            <Card>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("dash.pendingProposals")}
              </p>
              <p className="mt-2 font-heading text-xl font-bold text-ink">
                {pendingProposals}
              </p>
            </Card>
          </>
        )}
      </div>

      {/* Escrow eslatmasi */}
      <div className="flex items-start gap-3 rounded-card border border-accent/25 bg-accent/5 p-4">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-accent">
          <path d="M8 1.5 13.5 4v3.6c0 3.3-2.3 6.1-5.5 6.9-3.2-.8-5.5-3.6-5.5-6.9V4L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M5.8 8l1.6 1.6 2.8-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-xs text-muted">{t("dash.escrowNote")}</p>
      </div>

      {/* Kelgan takliflar — javob kutmoqda */}
      {pendingOffers.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-bold text-ink">
            {t("soffers.title")}{" "}
            <span className="text-primary">({pendingOffers.length})</span>
          </h2>
          <Card padding="none">
            {pendingOffers.map((offer, i) => (
              <Link
                key={offer.id}
                href={`/mutaxassis/takliflarim/kelgan/${offer.id}`}
                className={`flex items-center gap-3 p-4 transition-colors duration-150 hover:bg-card-hover ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <Avatar name={offer.buyerName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {offer.title}
                  </p>
                  <p className="mt-0.5 text-2xs text-faint">{offer.buyerName}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-ink">
                  {formatMoney(offer.budget, lang)}
                </span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {/* Profil to'liqligi (to'liq bo'lmaganda ko'rinadi) */}
      {!loading && completeness < 100 && (
        <Card padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-base font-bold text-ink">
              {t("dash.completeness")}
            </h2>
            <span className="font-heading text-base font-bold text-primary">
              {completeness}%
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">{t("dash.completenessHint")}</p>
          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-card-hover"
            role="progressbar"
            aria-valuenow={completeness}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-150"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {checks.map((check) =>
              check.done ? (
                <li key={check.key} className="flex items-center gap-2 text-xs">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-success">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M5 8.3 7 10.3 11 5.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-muted">{t(check.key)}</span>
                </li>
              ) : (
                <li key={check.key}>
                  <Link
                    href={check.href}
                    className="group flex items-center gap-2 text-xs transition-colors duration-150"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-faint">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                    <span className="text-ink transition-colors duration-150 group-hover:text-primary">
                      {t(check.key)}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="ml-auto shrink-0 text-faint transition-colors duration-150 group-hover:text-primary">
                      <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </li>
              )
            )}
          </ul>
          {firstIncomplete && (
            <Link
              href={firstIncomplete.href}
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-btn bg-primary px-4 text-sm font-medium text-on-primary shadow-raised transition-all duration-150 hover:brightness-95"
            >
              {t("dash.completeProfile")}
            </Link>
          )}
        </Card>
      )}

      {/* Sizga mos e'lonlar */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-ink">
            {t("dash.matchingJobs")}
          </h2>
          <Link
            href="/mutaxassis/ish-elonlari"
            className="text-xs font-medium text-primary transition-colors duration-150 hover:text-ink"
          >
            {t("dash.viewAll")}
          </Link>
        </div>
        {loading ? (
          <SkeletonCard />
        ) : matchingJobs.length === 0 ? (
          <EmptyState title={t("dash.noMatchingJobs")} />
        ) : (
          <Card padding="none">
            {matchingJobs.map((job, i) => (
              <Link
                key={job.id}
                href={`/mutaxassis/ish-elonlari/${job.id}`}
                className={`flex items-center justify-between gap-3 p-4 transition-colors duration-150 hover:bg-card-hover ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {job.title}
                  </p>
                  <p className="mt-0.5 text-2xs text-faint">
                    {t(`cat.${job.category}`)} · {job.proposalsCount}{" "}
                    {t("jobs.proposalsCount")}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-ink">
                  {formatMoney(job.budgetMin, lang)} – {formatMoney(job.budgetMax, lang)}
                </span>
              </Link>
            ))}
          </Card>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Oxirgi shartnomalar */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-ink">
              {t("nav.contracts")}
            </h2>
            <Link
              href="/mutaxassis/shartnomalar"
              className="text-xs font-medium text-primary transition-colors duration-150 hover:text-ink"
            >
              {t("dash.viewAll")}
            </Link>
          </div>
          {loading ? (
            <SkeletonCard />
          ) : recentContracts.length === 0 ? (
            <EmptyState title={t("contracts.emptyAll")} />
          ) : (
            <Card padding="none">
              {recentContracts.map((contract, i) => (
                <Link
                  key={contract.id}
                  href={`/mutaxassis/shartnomalar/${contract.id}`}
                  className={`flex items-center justify-between gap-3 p-4 transition-colors duration-150 hover:bg-card-hover ${
                    i > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {contract.title}
                    </p>
                    <p className="mt-0.5 text-2xs text-faint">
                      {contract.buyerName} · {formatMoney(contract.totalAmount, lang)}
                    </p>
                  </div>
                  <ContractStatusBadge status={contract.status} />
                </Link>
              ))}
            </Card>
          )}
        </section>

        {/* Oxirgi xabarlar */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-ink">
              {t("dash.recentMessages")}
            </h2>
            <Link
              href="/mutaxassis/xabarlar"
              className="text-xs font-medium text-primary transition-colors duration-150 hover:text-ink"
            >
              {t("dash.viewAll")}
            </Link>
          </div>
          {loading ? (
            <SkeletonCard />
          ) : messages.length === 0 ? (
            <EmptyState title={t("dash.noMessages")} />
          ) : (
            <Card padding="none">
              {messages.map((msg, i) => {
                const isMine = msg.senderId === myId;
                const buyer = buyerByContract.get(msg.contractId) ?? "";
                return (
                  <Link
                    key={msg.id}
                    href={`/mutaxassis/shartnomalar/${msg.contractId}`}
                    className={`flex items-center gap-3 p-4 transition-colors duration-150 hover:bg-card-hover ${
                      i > 0 ? "border-t border-line" : ""
                    }`}
                  >
                    <Avatar name={buyer || "?"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-ink">
                        {isMine ? t("chat.you") : buyer}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">{msg.text}</p>
                    </div>
                  </Link>
                );
              })}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
