"use client";

import { useId, useState, type ReactNode } from "react";

type Side = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: Side;
  className?: string;
}

const sidePos: Record<Side, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

/* Accessible tooltip — hover VA fokusda ko'rinadi (klaviatura uchun ham),
   aria-describedby bilan bog'lanadi, Escape yopadi (WAI-ARIA APG). */
export function Tooltip({ content, children, side = "top", className = "" }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={`sb-fade-in pointer-events-none absolute z-50 max-w-xs whitespace-normal rounded-btn border border-line bg-card px-2.5 py-1 text-2xs leading-snug text-ink shadow-overlay ${sidePos[side]}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
