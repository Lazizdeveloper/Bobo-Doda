/**
 * Admin panel ikonkalari — inline SVG.
 *
 * Ilgari bu yerda emoji ishlatilardi (📊 👥 ⚖️ …). Emoji har OS/brauzerda
 * boshqacha chiziladi, dizayn tiliga kirmaydi (rangni meros olmaydi) va
 * skrinrider uni ovoz chiqarib o'qiydi ("bar chart", "police car light") —
 * navigatsiya nomidan oldin ma'nosiz so'z eshitiladi. Ilovaning qolgan
 * qismi allaqachon inline SVG ishlatadi.
 */

import type { ReactElement } from "react";

export type AdminIconName =
  | "dashboard"
  | "users"
  | "services"
  | "jobs"
  | "orders"
  | "kyc"
  | "disputes"
  | "reports"
  | "appeals"
  | "reviews"
  | "payments"
  | "support"
  | "categories"
  | "settings"
  | "audit"
  | "admins"
  | "feedback";

const paths: Record<AdminIconName, ReactElement> = {
  feedback: (
    <>
      <path d="M13.5 2.5H2.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.5v2.5l3-2.5h5.5a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1z" />
      <path d="M8 5v4M6 7h4" />
    </>
  ),
  dashboard: (
    <>
      <rect x="2.5" y="2.5" width="5" height="6" rx="1" />
      <rect x="2.5" y="10.5" width="5" height="3" rx="1" />
      <rect x="9.5" y="2.5" width="4" height="3" rx="1" />
      <rect x="9.5" y="7.5" width="4" height="6" rx="1" />
    </>
  ),
  users: (
    <>
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M2 13.5c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" />
      <path d="M11 4.2a2.3 2.3 0 0 1 0 4.3M11.5 10.4c1.6.4 2.5 1.5 2.5 3.1" />
    </>
  ),
  services: (
    <>
      <rect x="2" y="4.5" width="12" height="9" rx="1.5" />
      <path d="M6 4.5V3.4c0-.5.4-.9.9-.9h2.2c.5 0 .9.4.9.9v1.1" />
      <path d="M2 8.5h12" />
    </>
  ),
  jobs: (
    <>
      <path d="M8 2v6" />
      <path d="M5 5.5 8 2l3 3.5" />
      <rect x="2.5" y="8.5" width="11" height="5.5" rx="1.5" />
    </>
  ),
  orders: (
    <>
      <rect x="3" y="2.5" width="10" height="11" rx="1.5" />
      <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" />
    </>
  ),
  kyc: (
    <>
      <path d="M8 2 3 4v4c0 3 2.1 5.3 5 6 2.9-.7 5-3 5-6V4L8 2Z" />
      <path d="m6 8 1.5 1.5L10.5 6.5" />
    </>
  ),
  disputes: (
    <>
      <path d="M8 2.5v11" />
      <path d="M3 5h10" />
      <path d="M4.5 5 2.5 9.5h4L4.5 5ZM11.5 5 9.5 9.5h4L11.5 5Z" />
      <path d="M5.5 13.5h5" />
    </>
  ),
  reports: (
    <>
      <path d="M8 2.5 14 13H2L8 2.5Z" />
      <path d="M8 6.5v3M8 11.3v.4" />
    </>
  ),
  appeals: (
    <>
      <path d="M13 8a5 5 0 1 1-1.6-3.7" />
      <path d="M13.5 2.5v3h-3" />
    </>
  ),
  reviews: (
    <path d="m8 2.5 1.7 3.5 3.8.5-2.8 2.7.7 3.8L8 11.2 4.6 13l.7-3.8L2.5 6.5l3.8-.5L8 2.5Z" />
  ),
  payments: (
    <>
      <rect x="2" y="4" width="12" height="8.5" rx="1.5" />
      <path d="M2 7h12" />
      <path d="M4.5 10h2.5" />
    </>
  ),
  support: (
    <>
      <path d="M3 6.5a5 5 0 0 1 10 0" />
      <rect x="2" y="6.5" width="2.5" height="4" rx="1.2" />
      <rect x="11.5" y="6.5" width="2.5" height="4" rx="1.2" />
      <path d="M13 10.5v.8a2 2 0 0 1-2 2H8.8" />
    </>
  ),
  categories: (
    <>
      <path d="M2 5.2c0-.8.6-1.4 1.4-1.4h2.3l1.3 1.6h4.6c.8 0 1.4.6 1.4 1.4v4.6c0 .8-.6 1.4-1.4 1.4H3.4c-.8 0-1.4-.6-1.4-1.4V5.2Z" />
    </>
  ),
  settings: (
    <>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7 3.6 3.6" />
    </>
  ),
  audit: (
    <>
      <path d="M4 2.5h5.5L12 5v8.5H4V2.5Z" />
      <path d="M9.5 2.5V5H12" />
      <path d="M6 8h4M6 10.5h2.5" />
    </>
  ),
  admins: (
    <>
      <path d="M2.5 5 5 7 8 3l3 4 2.5-2v6.5h-11V5Z" />
      <path d="M2.5 13.5h11" />
    </>
  ),
};

export function AdminIcon({
  name,
  className = "",
}: {
  name: AdminIconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
