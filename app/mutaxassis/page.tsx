"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { authService, contractsService, jobsService, messagesService, offersService, proposalsService, servicesService, usersService } from "@/lib/api";
import type { Contract, Job, Message, Offer, Proposal, SellerProfile, Service } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

const PENDING_PROPOSAL_STATUSES = ["yuborilgan", "korib_chiqilmoqda", "suhbat"];

export default function MutaxassisDashboardPage() {
  const { t, lang } = useT();
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [name, setName] = useState("");
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      contractsService.list(),
      proposalsService.listMine(),
      offersService.listIncoming(),
      messagesService.listMine(),
      usersService.getSellerProfile(),
      servicesService.listMine(),
      jobsService.list(),
      usersService.getCurrent(),
    ])
      .then(([contractList, proposalList, offerList, messageList, profileData, serviceList, jobList, user]) => {
        setContracts(contractList);
        setProposals(proposalList);
        setOffers(offerList);
        setMessages([...messageList].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4));
        setProfile(profileData);
        setServices(serviceList);
        setJobs(jobList);
        if (user) setName(user.fullName);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  const loading = !contracts || !proposals || !messages || !profile;
  const myId = authService.getSession()?.userId ?? null;

  const activeContracts = contracts?.filter((c) => c.status === "faol") || [];
  const pendingProposals = proposals?.filter((p) => PENDING_PROPOSAL_STATUSES.includes(p.status)).length ?? 0;
  const pendingOffers = offers.filter((o) => o.status === "yuborilgan");
  const completedContracts = contracts?.filter((c) => c.status === "yakunlangan") || [];
  
  // Calculate total earnings
  const totalEarnings = completedContracts.reduce((sum, c) => sum + c.totalAmount, 0);
  
  // Profile completeness checks
  const checks = profile ? [
    { key: "dash.ckBio", done: profile.bio.trim().length >= 50, href: "/mutaxassis/sozlamalar" },
    { key: "dash.ckSkills", done: profile.skills.length >= 3, href: "/mutaxassis/sozlamalar" },
    { key: "dash.ckService", done: services.some((s) => s.status === "active"), href: "/mutaxassis/xizmatlarim/yangi" },
    { key: "dash.ckPortfolio", done: profile.portfolio.length > 0, href: "/mutaxassis/sozlamalar" },
  ] : [];
  const completeness = checks.length ? Math.round((checks.filter((c) => c.done).length / checks.length) * 100) : 0;
  const firstIncomplete = checks.find((c) => !c.done);

  // Matching jobs
  const proposedJobIds = new Set(proposals?.filter((p) => p.status !== "qaytarib_olingan").map((p) => p.jobId));
  const skillSet = new Set(profile?.skills.map((s) => s.toLowerCase()));
  const matchingJobs = jobs.filter(
    (j) => j.status === "ochiq" && !proposedJobIds.has(j.id) &&
      (profile?.categories.includes(j.category) || j.skillsRequired.some((s) => skillSet.has(s.toLowerCase())))
  ).sort((a, b) => b.postedAt.localeCompare(a.postedAt)).slice(0, 3);

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-ink">
            {t("dash.title")}
          </h1>
          {name && (
            <p className="mt-2 text-muted">
              {t("dash.greeting")}, {name.split(" ")[0]}
            </p>
          )}
        </div>
        {!loading && profile && (
          <div className="flex items-center gap-3 bg-surface px-4 py-2 rounded-full border border-line shadow-sm">
            <span className={`w-3 h-3 rounded-full ${profile.available ? "bg-success" : "bg-faint"}`}></span>
            <span className="text-sm font-medium">{profile.available ? t("dash.availableForWork") : t("dash.busy")}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-3 h-8 w-24" />
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
              <p className="text-xs font-bold uppercase text-primary-deep tracking-wider">{t("dash.netIncome")}</p>
              <p className="mt-2 font-heading text-2xl font-black text-ink">{formatMoney(totalEarnings, lang)}</p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase text-muted tracking-wider">{t("dash.activeContracts")}</p>
              <p className="mt-2 font-heading text-2xl font-black text-ink">{activeContracts.length}</p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase text-muted tracking-wider">{t("dash.pendingProposals")}</p>
              <p className="mt-2 font-heading text-2xl font-black text-ink">{pendingProposals}</p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase text-muted tracking-wider">{t("dash.directOffers")}</p>
              <p className={`mt-2 font-heading text-2xl font-black ${pendingOffers.length > 0 ? 'text-primary' : 'text-ink'}`}>
                {pendingOffers.length}
              </p>
            </Card>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Direct Offers */}
          {!loading && pendingOffers.length > 0 && (
            <section>
              <h2 className="font-heading text-xl font-bold text-ink mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                {t("dash.directOffers")} ({pendingOffers.length})
              </h2>
              <Card padding="none" stitch>
                {pendingOffers.map((offer, i) => (
                  <Link
                    key={offer.id}
                    href={`/mutaxassis/takliflarim/kelgan/${offer.id}`}
                    className={`flex items-center gap-4 p-5 hover:bg-card-hover transition-colors ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    <Avatar name={offer.buyerName} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink truncate text-base">{offer.title}</p>
                      <p className="text-sm text-muted mt-0.5">{offer.buyerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-ink">{formatMoney(offer.budget, lang)}</p>
                      <Button variant="primary" size="sm" className="mt-2">{t("dash.reviewOfferBtn")}</Button>
                    </div>
                  </Link>
                ))}
              </Card>
            </section>
          )}

          {/* Recommended Jobs */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold text-ink">{t("dash.matchingJobs")}</h2>
              <Link href="/mutaxassis/ish-elonlari" className="text-sm font-medium text-primary hover:underline">
                {t("dash.browseJobBoard")}
              </Link>
            </div>
            {loading ? (
              <SkeletonCard />
            ) : matchingJobs.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-muted">{t("dash.noMatchingJobs")}</p>
              </Card>
            ) : (
              <Card padding="none" stitch>
                {matchingJobs.map((job, i) => (
                  <Link
                    key={job.id}
                    href={`/mutaxassis/ish-elonlari/${job.id}`}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-card-hover transition-colors ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-ink text-base truncate">{job.title}</p>
                      <p className="text-sm text-muted mt-1">
                        {t(`cat.${job.category}`)} • {job.proposalsCount} {t("dash.proposalsSuffix")}
                      </p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
                      <span className="font-bold text-ink whitespace-nowrap">
                        {formatMoney(job.budgetMin, lang)} - {formatMoney(job.budgetMax, lang)}
                      </span>
                      <span className="text-xs text-primary font-semibold">{t("dash.viewApply")}</span>
                    </div>
                  </Link>
                ))}
              </Card>
            )}
          </section>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Profile Completeness */}
          {!loading && completeness < 100 && (
            <Card className="bg-primary/5 border-primary/20">
              <div className="flex justify-between items-end mb-2">
                <h3 className="font-bold text-ink">{t("dash.completeness")}</h3>
                <span className="font-black text-primary text-xl">{completeness}%</span>
              </div>
              <div className="h-2 w-full bg-primary/20 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-primary" style={{ width: `${completeness}%` }}></div>
              </div>
              <ul className="space-y-2 mb-4">
                {checks.map((check) => (
                  <li key={check.key} className="flex items-center gap-2 text-sm">
                    {check.done ? (
                      <span className="text-success text-lg">✓</span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                    )}
                    <span className={check.done ? "text-muted line-through" : "text-ink font-medium"}>
                      {t(check.key)}
                    </span>
                  </li>
                ))}
              </ul>
              {firstIncomplete && (
                <Link href={firstIncomplete.href}>
                  <Button className="w-full">{t("dash.completeProfile")}</Button>
                </Link>
              )}
            </Card>
          )}

          {/* Client Messages */}
          <Card padding="none" className="overflow-hidden">
            <div className="p-4 border-b border-line bg-surface flex justify-between items-center">
              <h3 className="font-bold text-ink">{t("dash.recentMessages")}</h3>
              <Link href="/mutaxassis/xabarlar" className="text-xs text-primary hover:underline">{t("dash.viewAll")}</Link>
            </div>
            {loading ? (
              <div className="p-4"><Skeleton className="h-10 w-full" /></div>
            ) : !messages || messages.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted">{t("dash.noMessages")}</div>
            ) : (
              <div className="divide-y divide-line">
                {messages.map((msg) => (
                  <Link key={msg.id} href={`/mutaxassis/shartnomalar/${msg.contractId}`} className="block p-4 hover:bg-card-hover">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary-deep flex items-center justify-center font-bold text-xs shrink-0">
                        {msg.senderId === myId ? 'Me' : 'CL'}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-ink">{msg.senderId === myId ? t("dash.you") : t("dash.client")}</p>
                        <p className="text-xs text-muted truncate mt-0.5">{msg.text}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
