import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HELP_ARTICLES } from "@/lib/help-articles";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const article = HELP_ARTICLES.find((a) => a.slug === slug);
  if (!article) {
    return {
      title: "Yordam maqolasi — Bobololadono",
      alternates: { canonical: `/yordam-markazi/${slug}` },
    };
  }
  return {
    title: `${article.title.uz} — Bobololadono`,
    description: article.summary.uz,
    alternates: { canonical: `/yordam-markazi/${article.slug}` },
  };
}

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export default function ArticleLayout({ children }: { children: ReactNode }) {
  return children;
}
