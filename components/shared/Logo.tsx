import Link from "next/link";

/* So'zana rozetkasi ("oy" naqshi): o'rmon-yashil yadro, zaytun barglar,
   yashil ip bilan chok qilingan halqa. */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle
        cx="12"
        cy="12"
        r="10.25"
        stroke="#15803D"
        strokeWidth="1.5"
        strokeDasharray="3.2 2.6"
        strokeLinecap="round"
      />
      <path
        d="M12 4.4c2.1 2.1 2.1 5.1 0 7.6-2.1-2.5-2.1-5.5 0-7.6ZM12 19.6c-2.1-2.1-2.1-5.1 0-7.6 2.1 2.5 2.1 5.5 0 7.6ZM4.4 12c2.1-2.1 5.1-2.1 7.6 0-2.5 2.1-5.5 2.1-7.6 0ZM19.6 12c-2.1 2.1-5.1 2.1-7.6 0 2.5-2.1 5.5-2.1 7.6 0Z"
        fill="#4D7C0F"
      />
      <circle cx="12" cy="12" r="2.6" fill="#15803D" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2">
      <LogoMark />
      <span className="font-heading text-base font-extrabold tracking-tight text-ink">
        Bobo<span className="text-primary">&amp;Doda</span>
      </span>
    </Link>
  );
}
