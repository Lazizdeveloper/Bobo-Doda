"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useT } from "@/lib/i18n";
import { BackButton } from "./BackButton";

export interface Crumb {
  label: string;
  href?: string;
}

/* Accessible breadcrumb — <nav aria-label> + <ol>, oxirgi element aria-current.
   showBack: true bo'lsa (sukut bo'yicha), chap tarafida ko'rinarli "Orqaga" tugmasi chiqadi. */
export function Breadcrumb({
  items,
  showBack = true,
  backHref,
  backLabel,
  className = "",
}: {
  items: Crumb[];
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  const { t } = useT();

  // Agar items mavjud bo'lsa, oxirgisidan oldingi mavjud href avtomatik aniqlanadi
  const resolvedBackHref =
    backHref ||
    (items.length > 1
      ? [...items].reverse().find((item, idx) => idx > 0 && item.href)?.href
      : undefined);

  return (
    <div className={`flex flex-wrap items-center gap-2.5 sm:gap-3 ${className}`}>
      {showBack && (
        <div className="shrink-0">
          <BackButton href={resolvedBackHref} label={backLabel} />
        </div>
      )}
      {showBack && items.length > 0 && (
        <span aria-hidden="true" className="text-line hidden sm:inline select-none">
          |
        </span>
      )}
      <nav aria-label={t("a11y.breadcrumb")} className="min-w-0 flex-1 py-0.5">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {items.map((item, i) => {
            const last = i === items.length - 1;
            return (
              <Fragment key={i}>
                <li className="inline-flex">
                  {item.href && !last ? (
                    <Link
                      href={item.href}
                      className="rounded transition-colors duration-150 hover:text-ink hover:underline"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={last ? "page" : undefined}
                      className={last ? "font-medium text-ink" : ""}
                    >
                      {item.label}
                    </span>
                  )}
                </li>
                {!last && (
                  <li aria-hidden="true" className="text-faint">
                    /
                  </li>
                )}
              </Fragment>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
