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
        "card-hover": "#F2F8F4",
        /* Yumshoq yashil-oq to'ldirish: jadval sarlavhasi, ikkilamchi panel */
        surface: "#F5FAF7",
        /* Harakat — o'rmon yashil. Ustidagi matn doim on-primary (oq) */
        primary: "#15803D",
        "primary-hover": "#116632",
        "on-primary": "#FFFFFF",
        /* Urg'u — zaytun-lime (eski so'zana lime'ining o'qiladigan varianti) */
        accent: "#4D7C0F",
        /* Jarayon holati — archa-ko'kish yashil (yakunlangan yashildan farqli) */
        info: "#0F766E",
        /* Matn */
        ink: "#0C1F16",
        muted: "#4C6156",
        faint: "#5E7568",
        /* Chiziq — yashil chok ipi */
        line: "#DDEAE3",
        "line-strong": "#15803D",
        /* Forma elementi chegarasi — WCAG 1.4.11 uchun 3:1 */
        field: "#7B9587",
        /* Semantik — faqat status/xabar uchun */
        danger: "#DC2626",
        warning: "#B45309",
        success: "#15803D",
        /* "deep" variantlar — o'z rangining ochiq to'ldirishi (/10) ustida
           matn AA (>=4.5:1) bo'lishi uchun. Faqat Badge/tint bloklarida. */
        "primary-deep": "#0E5C2C",
        "accent-deep": "#3F6A0A",
        "info-deep": "#0B5A54",
        "success-deep": "#0E5C2C",
        "warning-deep": "#8F4208",
        "danger-deep": "#B4161B",
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
        /* Yashil tugmaning "ko'tarilgan" hissi — ostidagi to'q yashil chiziq */
        raised: "0 2px 0 0 #0E5C2C",
      },
    },
  },
  plugins: [],
};
export default config;
