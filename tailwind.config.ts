import type { Config } from "tailwindcss";

/* ── Suzani dizayn tizimi ──────────────────────────────────────────────
   Ilhom: o'zbek so'zana kashtasi — to'q archa-yashil mato ustiga
   zarg'aldoq sariq va yashil naqsh, hammasi qizil ip bilan chok qilingan.
   Yashil = muhit (fon), sariq = harakat (tugma/urg'u), qizil = chiziq.
   BOSHQA RANG QO'SHILMASIN. */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Mato — to'q archa yashil */
        bg: "#08211A",
        card: "#0E2E24",
        "card-hover": "#143A2D",
        /* Harakat — zarg'aldoq sariq. Ustidagi matn doim on-primary */
        primary: "#FFC53D",
        "on-primary": "#08211A",
        /* Urg'u — yosh yashil (sariq bilan yashil orasidagi ko'prik) */
        accent: "#A3E635",
        /* Matn — oqartirilmagan mato rangi */
        ink: "#F5EFE0",
        muted: "#9CB6A6",
        faint: "#7B9A88",
        /* Chiziq — qizil ip chok */
        line: "rgba(214, 74, 52, .40)",
        "line-strong": "#D64A34",
        /* Semantik — faqat status/xabar uchun.
           danger qizil chokdan ajralib turishi uchun qip-qizil emas, qirmizi */
        danger: "#F5355E",
        warning: "#F58C1F",
        success: "#4ADE80",
      },
      fontFamily: {
        heading: ["var(--font-unbounded)", "sans-serif"],
        sans: ["var(--font-onest)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
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
        overlay: "0 8px 32px rgba(0,0,0,.55)",
        /* Sariq tugmaning "ko'tarilgan" hissi */
        raised: "0 2px 0 0 #D64A34",
      },
    },
  },
  plugins: [],
};
export default config;
