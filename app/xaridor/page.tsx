"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountdownBadge } from "@/components/ui/CountdownBadge";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { ContractStatusBadge } from "@/components/shared/StatusBadge";
import { authService, contractsService, jobsService, messagesService, milestonesService, proposalsService, usersService } from "@/lib/api";
import type { Contract, Job, Message, Milestone, Proposal } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function XaridorDashboardPage() {
  const { t, lang } = useT();
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [newProposals, setNewProposals] = useState<Map<string, number>>(new Map());
  const [name, setName] = useState("");
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      contractsService.list(),
      milestonesService.listMine(),
      usersService.getCurrent(),
      jobsService.listMine(),
      messagesService.listMine(),
    ])
      .then(async ([contractList, milestoneList, user, jobList, messageList]) => {
        setContracts(contractList);
        setMilestones(milestoneList);
        if (user) setName(user.fullName);
        setJobs(jobList);
        setMessages(
          [...messageList].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)
        );
        
        const counts = new Map<string, number>();
        const open = jobList.filter((j) => j.status === "ochiq");
        const results = await Promise.all(
          open.map((j) => proposalsService.listForJob(j.id))
        );
        open.forEach((job, i) => {
          const fresh = results[i].filter((p: Proposal) => p.status === "yuborilgan").length;
          if (fresh > 0) counts.set(job.id, fresh);
        });
        setNewProposals(counts);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;

  const loading = !contracts || !jobs || !milestones;
  const myId = authService.getSession()?.userId ?? null;

  const activeContracts = contracts?.filter((c) => c.status === "faol") || [];
  const openJobs = jobs?.filter((j) => j.status === "ochiq") || [];
  const contractById = new Map(contracts?.map((c) => [c.id, c]));

  const toReview = (milestones ?? []).filter(
    (m) => m.status === "topshirildi" && contractById.get(m.contractId)?.status === "faol"
  );
  
  const totalNewProposals = Array.from(newProposals.values()).reduce((sum, n) => sum + n, 0);
  const fundNeeded = (contracts ?? []).filter((c) => c.status === "imzolangan");
  const recentContracts = contracts?.slice(0, 5) ?? [];
  const jobById = new Map(jobs?.map((j) => [j.id, j]));

  // Calculate total spent (dummy logic for now, using completed contracts or all contracts)
  const totalSpent = contracts?.reduce((sum, c) => c.status === "yakunlangan" ? sum + c.totalAmount : sum, 0) || 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-surface to-bg rounded-2xl p-6 border border-line shadow-sm">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-ink tracking-tight">
            {t("dash.title")}
          </h1>
          {name && (
            <p className="mt-1 text-sm text-muted font-medium">
              {t("dash.greeting")}, {name.split(" ")[0]}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Link href="/xaridor/bozor">
            <Button variant="secondary" className="shadow-sm">
              {t("bdash.findSpecialist")}
            </Button>
          </Link>
          <Link href="/xaridor/elonlarim/yangi">
            <Button className="shadow-sm">{t("bdash.postJob")}</Button>
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-8 w-16" />
            </Card>
          ))
        ) : (
          <>
            <Card className="flex flex-col justify-center border-l-4 border-l-primary">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("bdash.totalSpent")}</p>
              <p className="mt-2 font-heading text-2xl font-black text-ink">
                {formatMoney(totalSpent, lang)}
              </p>
            </Card>
            <Card className="flex flex-col justify-center border-l-4 border-l-success">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("bdash.activeProjects")}</p>
              <p className="mt-2 font-heading text-2xl font-black text-ink">
                {activeContracts.length}
              </p>
            </Card>
            <Card className="flex flex-col justify-center border-l-4 border-l-warning">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("bdash.toReview")}</p>
              <p className={`mt-2 font-heading text-2xl font-black ${toReview.length > 0 ? "text-warning" : "text-ink"}`}>
                {toReview.length}
              </p>
            </Card>
            <Card className="flex flex-col justify-center border-l-4 border-l-info">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("bdash.openJobs")}</p>
              <p className="mt-2 font-heading text-2xl font-black text-ink">
                {openJobs.length}
              </p>
            </Card>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Action Center */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section>
            <h2 className="font-heading text-xl font-bold text-ink mb-4 flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t("bdash.actionCenter")}
            </h2>

            {loading ? (
              <SkeletonCard />
            ) : toReview.length === 0 && totalNewProposals === 0 && fundNeeded.length === 0 ? (
              <Card className="text-center py-12 border-dashed">
                <div className="mx-auto w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="font-heading text-lg font-bold text-ink">{t("bdash.allCaughtUp")}</h3>
                <p className="text-sm text-muted mt-1">{t("bdash.noActions")}</p>
              </Card>
            ) : (
              <Card padding="none" stitch className="overflow-hidden">
                {fundNeeded.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/xaridor/shartnomalar/${c.id}`}
                    className={`flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:bg-card-hover ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-danger">{t("bdash.fundNeeded")}</p>
                        <p className="text-base font-medium text-ink mt-0.5">{c.title}</p>
                        <p className="text-xs text-muted mt-1">{t("bdash.contractWith")} {c.sellerName} • {formatMoney(c.totalAmount, lang)}</p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm">{t("bdash.fundBtn")}</Button>
                  </Link>
                ))}
                
                {toReview.map((m, i) => {
                  const contract = contractById.get(m.contractId);
                  return (
                    <Link
                      key={m.id}
                      href={`/xaridor/shartnomalar/${m.contractId}`}
                      className={`flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:bg-card-hover ${(i > 0 || fundNeeded.length > 0) ? "border-t border-line" : ""}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center shrink-0">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-warning">{t("bdash.reviewSubmitted")}</p>
                          <p className="text-base font-medium text-ink mt-0.5">{m.title}</p>
                          <p className="text-xs text-muted mt-1">{contract?.title} • {formatMoney(m.amount, lang)}</p>
                        </div>
                      </div>
                      {m.reviewDeadline && <CountdownBadge deadline={m.reviewDeadline} />}
                    </Link>
                  );
                })}
                
                {Array.from(newProposals.entries()).map(([jobId, count], i) => {
                  const job = jobById.get(jobId);
                  return (
                    <Link
                      key={jobId}
                      href={`/xaridor/elonlarim/${jobId}`}
                      className={`flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:bg-card-hover ${(i > 0 || toReview.length > 0 || fundNeeded.length > 0) ? "border-t border-line" : ""}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{t("bdash.proposalsWaiting")}</p>
                          <p className="text-base font-medium text-ink mt-0.5">{job?.title}</p>
                          <p className="text-xs text-muted mt-1">{count} {t("bdash.newSpecialistsApplied")}</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm">{t("bdash.reviewProfilesBtn")}</Button>
                    </Link>
                  );
                })}
              </Card>
            )}
          </section>
        </div>

        {/* Right Column: Active Projects */}
        <div className="flex flex-col gap-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold text-ink">{t("bdash.recentContracts")}</h2>
              <Link href="/xaridor/shartnomalar" className="text-sm font-medium text-primary hover:underline">
                {t("dash.viewAll")}
              </Link>
            </div>
            
            {loading ? (
              <SkeletonCard />
            ) : recentContracts.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-sm text-muted">{t("contracts.emptyAll")}</p>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {recentContracts.map((contract) => (
                  <Link key={contract.id} href={`/xaridor/shartnomalar/${contract.id}`} className="block">
                    <Card hoverable padding="md" className="flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-ink text-sm line-clamp-1">{contract.title}</h3>
                        <ContractStatusBadge status={contract.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-muted">{contract.sellerName}</span>
                        <span className="font-bold text-ink">{formatMoney(contract.totalAmount, lang)}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Recent Messages */}
          <Card padding="none" className="overflow-hidden">
            <div className="p-4 border-b border-line bg-surface flex justify-between items-center">
              <h3 className="font-bold text-ink">{t("dash.recentMessages")}</h3>
              <Link href="/xaridor/xabarlar" className="text-xs text-primary hover:underline">
                {t("dash.viewAll")}
              </Link>
            </div>
            {loading ? (
              <div className="p-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !messages || messages.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted">{t("dash.noMessages")}</div>
            ) : (
              <div className="divide-y divide-line">
                {messages.map((msg) => (
                  <Link
                    key={msg.id}
                    href={`/xaridor/shartnomalar/${msg.contractId}`}
                    className="block p-4 hover:bg-card-hover"
                  >
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary-deep flex items-center justify-center font-bold text-xs shrink-0">
                        {msg.senderId === myId ? "Me" : "SP"}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-ink">
                          {msg.senderId === myId ? t("dash.you") : t("dash.specialist")}
                        </p>
                        <p className="text-xs text-muted truncate mt-0.5">{msg.text || (msg.image ? t("chat.imagePreview") : "")}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Tips / Help */}
          <Card className="bg-primary/5 border-primary/20">
            <h3 className="font-bold text-primary mb-2">{t("bdash.helpTeaserTitle")}</h3>
            <p className="text-sm text-muted mb-4">{t("bdash.helpTeaserBody")}</p>
            <Link href="/xaridor/yordam">
              <Button variant="secondary" className="w-full">{t("bdash.helpTeaserBtn")}</Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
