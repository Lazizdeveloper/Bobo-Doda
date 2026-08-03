import Link from "next/link";
import { Fragment } from "react";

export interface Crumb {
  label: string;
  href?: string;
}

/* Accessible breadcrumb — <nav aria-label> + <ol>, oxirgi element aria-current.
   Chuqur sahifalarda (shartnoma/xizmat/e'lon tafsilotlari) yo'lni ko'rsatadi. */
export function Breadcrumb({
  items,
  className = "",
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={i}>
              <li className="inline-flex">
                {item.href && !last ? (
                  <Link
                    href={item.href}
                    className="rounded transition-colors duration-150 hover:text-ink"
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
  );
}
