"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { LangSwitch } from "@/components/shared/LangSwitch";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { useSupportModal } from "@/components/shared/SupportModalProvider";
import { useT } from "@/lib/i18n";
import { HELP_ARTICLES, HELP_CATEGORIES, type HelpCategory } from "@/lib/help-articles";

export default function HelpCenterPage() {
  const { t, lang } = useT();
  const { openSupportModal } = useSupportModal();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HELP_ARTICLES.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (!q) return true;
      const haystack = [a.title[lang], a.summary[lang], ...a.content[lang], ...a.keywords]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, category, lang]);

  const isBrowsing = query.trim() !== "" || category !== "all";

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
          {t("hc.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">{t("hc.subtitle")}</p>

        <div className="mt-6">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t("hc.search_placeholder")}
            clearLabel={t("hc.search_placeholder")}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("hc.all_categories")}>
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
            {t("hc.all_categories")}
          </button>
          {HELP_CATEGORIES.map((c) => (
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

        {!isBrowsing && (
          <p className="mt-8 mb-3 font-heading text-xs font-bold uppercase tracking-wide text-faint">
            {t("hc.popular")}
          </p>
        )}
        {isBrowsing && <div className="mt-6" />}

        <div className="flex flex-col gap-3">
          {filtered.length === 0 && (
            <p className="rounded-card border border-line bg-card px-4 py-8 text-center text-sm text-muted">
              {t("hc.no_results")}
            </p>
          )}
          {filtered.map((a) => (
            <Link
              key={a.slug}
              href={`/yordam-markazi/${a.slug}`}
              className="group flex items-center justify-between gap-4 rounded-card border border-line bg-card px-5 py-4 transition-colors duration-150 hover:border-primary"
            >
              <div>
                <p className="text-sm font-bold text-ink">{a.title[lang]}</p>
                <p className="mt-1 text-xs text-muted">{a.summary[lang]}</p>
              </div>
              <span className="flex-shrink-0 text-primary transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-8 text-center">
          <p className="text-sm font-medium text-ink">{t("hc.still_need_help")}</p>
          <Button onClick={() => openSupportModal({ source: "help-center" })}>
            {t("faq_ask_support")}
          </Button>
        </div>
      </main>
    </div>
  );
}
