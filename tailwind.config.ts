import type { Config } from "tailwindcss";

/* ── Suzani Light dizayn tizimi ────────────────────────────────────────
   Oq mato ustiga yashil kashta. Fon — oq, harakat — yashil, chok — yashil.
   Yashil oilasi: primary (o'rmon yashil) · accent (zaytun-lime) ·
   info (archa-ko'kish yashil). Semantik ranglar faqat status uchun:
   danger (qizil) va warning (kahrabo).
   Barcha matn/fon juftliklari WCAG AA (>=4.5:1) bo'yicha tekshirilgan.
   BOSHQA RANG QO'SHILMASIN. */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Mato — oq */
        bg: "#FFFFFF",
        card: "#FFFFFF",
        "card-hover": "#FFF8F2",
        /* Yumshoq iliq to'ldirish (Landing page bilan bir xil) */
        surface: "#FBFBFA",
        /* Harakat — Bobo&Doda Brand Orange. Matn oq (on-primary) */
        primary: "#FF7A1A",
        "primary-hover": "#EA670C",
        "on-primary": "#FFFFFF",
        /* Urg'u — lime (landing page 03 bosqich kartasi) */
        accent: "#C8F230",
        /* Jarayon holati — ko'kish */
        info: "#0284C7",
        /* Matn — Landing page'dagi chuqur ink va neytral to'q ranglar */
        ink: "#141414",
        muted: "#4B5262",
        faint: "#6E7686",
        /* Chiziq — nozik neytral chegaralar */
        line: "#EAE5E0",
        "line-strong": "#FF7A1A",
        /* Forma elementi chegarasi — WCAG 1.4.11 uchun 3:1 */
        field: "#D4CCC4",
        /* Semantik — status/xabar uchun */
        danger: "#DC2626",
        warning: "#D97706",
        success: "#10B981",
        /* "deep" variantlar — o'z rangining ochiq to'ldirishi (/10) ustida
           matn AA (>=4.5:1) bo'lishi uchun. Faqat Badge/tint bloklarida. */
        "primary-deep": "#C7500B",
        "accent-deep": "#5A6A18",
        "info-deep": "#0369A1",
        "success-deep": "#047857",
        "warning-deep": "#B45309",
        "danger-deep": "#B91C1C",
      },
      fontFamily: {
        heading: ["var(--font-unbounded)", "sans-serif"],
        sans: ["var(--font-onest)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        /* Eng kichik o'lcham — kichik Badge va ixcham belgilar uchun.
           Ilgari `text-3xs` kodda ishlatilar, lekin bu yerda YO'Q edi:
           Tailwind class'ni umuman generatsiya qilmas va matn meros
           qilib olingan o'lchamda chiqardi. */
        "3xs": ["11px", "14px"],
        "2xs": ["12px", "16px"],
        xs: ["13px", "18px"],
        sm: ["14px", "20px"],
        base: ["16px", "24px"],
        lg: ["18px", "26px"],
        xl: ["22px", "30px"],
        "2xl": ["28px", "36px"],
      },
      borderRadius: {
        card: "14px",
        btn: "10px",
        input: "10px",
      },
      boxShadow: {
        /* Oq fonda karta chegarasini kuchaytiruvchi yumshoq ko'tarilish */
        card: "0 1px 2px rgba(12,31,22,.06)",
        "card-hover": "0 4px 14px rgba(12,31,22,.10)",
        overlay: "0 16px 40px rgba(12,31,22,.16)",
        /* To'q sariq tugmaning "ko'tarilgan" hissi — ostidagi to'q chiziq */
        raised: "0 2px 0 0 #C7500B",
      },
    },
  },
  plugins: [],
};
export default config;
