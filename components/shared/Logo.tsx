import Link from "next/link";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/logo-icon.png"
      alt="Logo mark"
      style={{ height: size, width: "auto", objectFit: "contain" }}
      className="shrink-0"
    />
  );
}

export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Bobo&Doda">
      <LogoMark size={28} />
      <span className="font-heading text-base font-extrabold tracking-tight text-ink">
        BOBO&amp;DODA
      </span>
    </Link>
  );
}
