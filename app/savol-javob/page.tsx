"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { LangSwitch } from "@/components/shared/LangSwitch";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { useSupportModal } from "@/components/shared/SupportModalProvider";
import { useT } from "@/lib/i18n";
import { FAQ_CATEGORIES, FAQ_ITEMS, type FaqCategory } from "@/lib/faq-content";

function FaqPageContent() {
  const { t, lang } = useT();
  const { openSupportModal } = useSupportModal();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | "all">("all");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  /* Deep-link: ?q=slug orxatda ochilib, o'sha savolga scroll qilinadi */
  useEffect(() => {
    const slug = searchParams.get("q");
    if (!slug) return;
    const item = FAQ_ITEMS.find((f) => f.slug === slug);
    if (!item) return;
    setCategory(item.category);
    setOpenSlug(slug);
    requestAnimationFrame(() => {
      document.getElementById(`faq-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      const haystack = [item.q[lang], item.a[lang], ...item.keywords].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [query, category, lang]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Logo href="/" />
          <LangSwitch />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h1 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">
          {t("faqpage.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">{t("faqpage.subtitle")}</p>

        <div className="mt-6">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t("faqpage.search_placeholder")}
            clearLabel={t("faqpage.search_placeholder")}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("faqpage.all_categories")}>
          <button
            type="button"
            onClick={() => setCategory("all")}
            aria-pressed={category === "all"}
            className={`rounded-btn border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
              category === "all"
                ? "border-primary bg-primary text-on-primary"
                : "border-line bg-card text-muted hover:border-primary hover:text-ink"
            }`}
          >
            {t("faqpage.all_categories")}
          </button>
          {FAQ_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              aria-pressed={category === c.key}
              className={`rounded-btn border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                category === c.key
                  ? "border-primary bg-primary text-on-primary"
                  : "border-line bg-card text-muted hover:border-primary hover:text-ink"
              }`}
            >
              {c.label[lang]}
            </button>
          ))}
        </div>

        <p className="mt-4 text-2xs text-faint">
          {t("faqpage.results_count").replace("{n}", String(filtered.length))}
        </p>

        <div className="mt-3 flex flex-col gap-3">
          {filtered.length === 0 && (
            <p className="rounded-card border border-line bg-card px-4 py-8 text-center text-sm text-muted">
              {t("faqpage.no_results")}
            </p>
          )}
          {filtered.map((item) => {
            const open = openSlug === item.slug;
            return (
              <div
                key={item.slug}
                id={`faq-${item.slug}`}
                className="overflow-hidden rounded-card border border-line bg-card scroll-mt-24"
              >
                <button
                  type="button"
                  onClick={() => setOpenSlug(open ? null : item.slug)}
                  aria-expanded={open}
                  aria-controls={`faq-panel-${item.slug}`}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-bold text-ink">{item.q[lang]}</span>
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200 ${
                      open ? "rotate-45 bg-primary text-on-primary" : ""
                    }`}
                    aria-hidden="true"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
                <div
                  id={`faq-panel-${item.slug}`}
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm leading-6 text-muted">{item.a[lang]}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-8 text-center">
          <p className="text-sm font-medium text-ink">{t("faq_still_need_help")}</p>
          <Button onClick={() => openSupportModal({ source: "faq-page" })}>
            {t("faq_ask_support")}
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function FaqPage() {
  /* useSearchParams statik prerender'da Suspense chegarasini talab qiladi */
  return (
    <Suspense fallback={null}>
      <FaqPageContent />
    </Suspense>
  );
}
