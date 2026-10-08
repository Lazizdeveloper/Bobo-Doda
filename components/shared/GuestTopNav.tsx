import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { useT } from "@/lib/i18n";

export function GuestTopNav() {
  const { t } = useT();
  
  return (
    <header className="sticky top-0 z-40 w-full border-b border-hair bg-bg/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
        <div className="flex items-center gap-6 shrink-0 min-w-0">
          <Logo href="/" className="shrink-0" />
          <nav className="hidden items-center gap-6 md:flex shrink-0">
            <Link
              href="/bozor"
              className="text-[15px] font-medium text-ink transition-colors hover:text-p600 whitespace-nowrap shrink-0"
            >
              {t("nav_market")}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/kirish"
            className="hidden items-center justify-center rounded-lg border border-hair px-4 py-2 text-[14px] font-medium text-ink transition-colors hover:bg-surface sm:flex whitespace-nowrap shrink-0"
          >
            {t("nav_login")}
          </Link>
          <Link
            href="/rol-tanlash"
            className="flex items-center justify-center rounded-lg bg-ink px-4 py-2 text-[14px] font-medium text-bg transition-colors hover:bg-n600 whitespace-nowrap shrink-0"
          >
            {t("nav_register")}
          </Link>
        </div>
      </div>
    </header>
  );
}
