"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { LangSwitch } from "@/components/shared/LangSwitch";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSupportModal } from "@/components/shared/SupportModalProvider";
import { useT } from "@/lib/i18n";
import { HELP_ARTICLES, HELP_CATEGORIES } from "@/lib/help-articles";

export default function HelpArticlePage() {
  const { t, lang } = useT();
  const { openSupportModal } = useSupportModal();
  const params = useParams<{ slug: string }>();

  const article = useMemo(
    () => HELP_ARTICLES.find((a) => a.slug === params.slug) ?? null,
    [params.slug]
  );
  const related = useMemo(() => {
    if (!article) return [];
    return article.related
      .map((slug) => HELP_ARTICLES.find((a) => a.slug === slug))
      .filter((a): a is (typeof HELP_ARTICLES)[number] => Boolean(a));
  }, [article]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Logo href="/" />
          <LangSwitch />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <Link href="/yordam-markazi" className="text-xs text-primary hover:text-ink">
          ← {t("hc.back")}
        </Link>

        {!article ? (
          <div className="mt-8">
            <EmptyState title={t("hc.no_results")} />
          </div>
        ) : (
          <>
            <div className="mt-5">
              <Badge tone="primary">
                {HELP_CATEGORIES.find((c) => c.key === article.category)?.label[lang]}
              </Badge>
            </div>
            <h1 className="mt-3 font-heading text-2xl font-extrabold text-ink sm:text-3xl">
              {article.title[lang]}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted">{article.summary[lang]}</p>

            <div className="mt-8 flex flex-col gap-4">
              {article.content[lang].map((paragraph, i) => (
                <p key={i} className="text-sm leading-6 text-ink">
                  {paragraph}
                </p>
              ))}
            </div>

            {related.length > 0 && (
              <div className="mt-10">
                <p className="mb-3 font-heading text-xs font-bold uppercase tracking-wide text-faint">
                  {t("hc.related")}
                </p>
                <div className="flex flex-col gap-2">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/yordam-markazi/${r.slug}`}
                      className="group flex items-center justify-between gap-4 rounded-card border border-line bg-card px-4 py-3 transition-colors duration-150 hover:border-primary"
                    >
                      <span className="text-sm font-medium text-ink">{r.title[lang]}</span>
                      <span className="flex-shrink-0 text-primary transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-8 text-center">
              <p className="text-sm font-medium text-ink">{t("hc.still_need_help")}</p>
              <Button
                onClick={() =>
                  openSupportModal({ source: "help-center", route: `/yordam-markazi/${article.slug}` })
                }
              >
                {t("faq_ask_support")}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
