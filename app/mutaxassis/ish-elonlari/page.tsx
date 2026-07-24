"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { JobCard } from "@/components/shared/JobCard";
import { CATEGORIES } from "@/lib/category-fields";
import {
  getJobs,
  getSavedJobIds,
  getSellerProfile,
  toggleSavedJob,
} from "@/lib/mock-api";
import type { Job, SellerProfile } from "@/lib/types";
import { useT } from "@/lib/i18n";

type BudgetFilter = "all" | "low" | "mid" | "high";
type Sort = "new" | "budget";
type Tab = "all" | "matching" | "saved";

function matchesBudget(job: Job, filter: BudgetFilter): boolean {
  if (filter === "all") return true;
  if (filter === "low") return job.budgetMax <= 1_000_000;
  if (filter === "mid") return job.budgetMax > 1_000_000 && job.budgetMin <= 5_000_000;
  return job.budgetMin > 5_000_000 || job.budgetMax > 5_000_000;
}

function matchesProfile(job: Job, profile: SellerProfile | null): boolean {
  if (!profile) return false;
  if (job.status !== "ochiq") return false;
  if (profile.categories.includes(job.category)) return true;
  const skills = profile.skills.map((s) => s.toLowerCase());
  return job.skillsRequired.some((s) => skills.includes(s.toLowerCase()));
}

export default function IshElonlariPage() {
  const { t } = useT();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [budget, setBudget] = useState<BudgetFilter>("all");
  const [sort, setSort] = useState<Sort>("new");

  useEffect(() => {
    getJobs().then(setJobs);
    getSellerProfile().then(setProfile);
    getSavedJobIds().then(setSavedIds);
  }, []);

  async function handleToggleSave(jobId: string) {
    setSavedIds(await toggleSavedJob(jobId));
  }

  const query = search.trim().toLowerCase();
  const filtered = (jobs ?? [])
    .filter((j) => {
      if (tab === "saved") return savedIds.includes(j.id);
      if (tab === "matching") return matchesProfile(j, profile);
      return true;
    })
    .filter((j) => category === "all" || j.category === category)
    .filter((j) => matchesBudget(j, budget))
    .filter(
      (j) =>
        !query ||
        j.title.toLowerCase().includes(query) ||
        j.description.toLowerCase().includes(query) ||
        j.skillsRequired.some((s) => s.toLowerCase().includes(query))
    )
    .sort((a, b) =>
      sort === "new"
        ? b.postedAt.localeCompare(a.postedAt)
        : b.budgetMax - a.budgetMax
    );

  const emptyTitle =
    tab === "saved"
      ? t("jobs.emptySaved")
      : tab === "matching"
        ? t("jobs.emptyMatching")
        : t("jobs.empty");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("jobs.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("jobs.subtitle")}</p>
      </div>

      <Tabs
        value={tab}
        onChange={(value) => setTab(value as Tab)}
        items={[
          { value: "all", label: t("jobs.tabAll"), count: jobs?.length },
          {
            value: "matching",
            label: t("jobs.tabMatching"),
            count: jobs?.filter((j) => matchesProfile(j, profile)).length,
          },
          { value: "saved", label: t("jobs.tabSaved"), count: savedIds.length },
        ]}
      />

      {/* Qidiruv va filtrlar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("jobs.searchPh")}
          aria-label={t("jobs.searchPh")}
        />
        <Select
          aria-label={t("jobs.category")}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={[
            { value: "all", label: t("jobs.allCategories") },
            ...CATEGORIES.map((cat) => ({ value: cat, label: t(`cat.${cat}`) })),
          ]}
        />
        <Select
          aria-label={t("jobs.budget")}
          value={budget}
          onChange={(e) => setBudget(e.target.value as BudgetFilter)}
          options={[
            { value: "all", label: t("jobs.budgetAll") },
            { value: "low", label: t("jobs.budgetLow") },
            { value: "mid", label: t("jobs.budgetMid") },
            { value: "high", label: t("jobs.budgetHigh") },
          ]}
        />
        <Select
          aria-label={t("jobs.sort")}
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          options={[
            { value: "new", label: t("jobs.sortNew") },
            { value: "budget", label: t("jobs.sortBudget") },
          ]}
        />
      </div>

      {!jobs ? (
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              saved={savedIds.includes(job.id)}
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
