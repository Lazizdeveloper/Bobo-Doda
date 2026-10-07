import Link from "next/link";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    // next/image emas — logotip bir necha o'lchamda (nav, TopNav, auth) qayta
    // ishlatiladi; statik PNG, ulash qulayligi LCP xavfidan ustun.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.jpg"
      alt="Logo mark"
      style={{ height: size, width: "auto", objectFit: "contain" }}
      className="shrink-0 rounded-sm"
    />
  );
}

export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Bobololadono">
      <LogoMark size={28} />
      <span className="font-heading text-base font-extrabold tracking-tight text-ink">
        Bobololadono
      </span>
    </Link>
  );
}
