import type { CSSProperties } from "react";

export interface SpinnerProps {
  /** piksel o'lchami */
  size?: number;
  className?: string;
  /** yonida ko'rinadigan matn; berilmasa faqat skrinreader uchun "Loading" */
  label?: string;
  style?: CSSProperties;
}

/* Qayta ishlatiladigan yuklanish spinneri (bo'lim/sahifa darajasida).
   Button ichidagi inline spinnerdan mustaqil — currentColor'ni oladi. */
export function Spinner({ size = 20, className = "", label, style }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 text-muted ${className}`}
      style={style}
    >
      <svg
        className="animate-spin"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label ? <span className="text-sm">{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}
