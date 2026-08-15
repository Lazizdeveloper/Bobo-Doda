
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT, type Lang } from "@/lib/i18n";

export default function LandingPage() {
  const { t, lang, setLang } = useT();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [scrolled]);

  useEffect(() => {
    const nodes = rootRef.current?.querySelectorAll(".reveal");
    if (!nodes || nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const langOptions: Lang[] = ["uz", "ru", "en"];

  const navLinks = [
    { href: "#how-it-works", label: t("nav_how") },
    { href: "#categories", label: t("nav_cats") },
    { href: "#specialists", label: t("nav_specialists") },
    { href: "#projects", label: t("nav_clients") },
    { href: "#pricing", label: t("nav_pricing") },
    { href: "#faq", label: t("nav_faq") },
  ];

  const categories = [
    { key: "des", icon: "design" },
    { key: "dev", icon: "code" },
    { key: "ai", icon: "cpu" },
    { key: "mar", icon: "megaphone" },
    { key: "tra", icon: "languages" },
    { key: "vid", icon: "video" },
    { key: "biz", icon: "briefcase" },
    { key: "edu", icon: "cap" },
  ] as const;

  const specialists = [
    {
      initials: "AY",
      name: "Aziza Yusupova",
      role: t("role_designer"),
      city: t("city_tashkent"),
      country: t("country_uz"),
      rating: "4.9",
      projects: 63,
      price: t("spec1_price"),
      accent: "blue",
    },
    {
      initials: "NB",
      name: "Nurlan Bekov",
      role: t("role_dev"),
      city: t("city_almaty"),
      country: t("country_kz"),
      rating: "5.0",
      projects: 41,
      price: t("spec2_price"),
      accent: "yellow",
    },
    {
      initials: "KR",
      name: "Kamila Rustamova",
      role: t("role_marketing"),
      city: t("city_bishkek"),
      country: t("country_kg"),
      rating: "4.8",
      projects: 87,
      price: t("spec3_price"),
      accent: "red",
    },
    {
      initials: "FS",
      name: "Farrux Solijonov",
      role: t("role_video"),
      city: t("city_dushanbe"),
      country: t("country_tj"),
      rating: "4.9",
      projects: 55,
      price: t("spec4_price"),
      accent: "blue",
    },
  ];

  const projects = [
    {
      title: t("proj1_title"),
      tag: t("c_dev"),
      budget: t("proj1_budget"),
      timeline: t("proj1_timeline"),
      proposals: 14,
    },
    {
      title: t("proj2_title"),
      tag: t("c_des"),
      budget: t("proj2_budget"),
      timeline: t("proj2_timeline"),
      proposals: 9,
    },
    {
      title: t("proj3_title"),
      tag: t("c_mar"),
      budget: t("proj3_budget"),
      timeline: t("proj3_timeline"),
      proposals: 21,
    },
  ];

  const diffRows = [
    { label: t("row_escrow"), us: t("row_escrow_us"), them: t("row_escrow_them") },
    { label: t("row_telegram"), us: t("row_telegram_us"), them: t("row_telegram_them") },
    { label: t("row_focus"), us: t("row_focus_us"), them: t("row_focus_them") },
    { label: t("row_payments"), us: "Uzcard, Humo, Payme, Click", them: t("row_payments_them") },
    { label: t("row_lang"), us: "UZ / RU / EN", them: t("row_lang_them") },
    { label: t("row_support"), us: t("row_support_us"), them: t("row_support_them") },
    { label: t("row_fees"), us: t("row_fees_us") + " (5%)", them: "10–20%" },
  ];

  const testimonials = [
    {
      initials: "DR",
      name: "Dilnoza Rahimova",
      role: t("t1_role"),
      city: t("city_tashkent"),
      country: t("country_uz"),
      quote: t("t1_quote"),
    },
    {
      initials: "AT",
      name: "Aibek Toktosunov",
      role: t("t2_role"),
      city: t("city_bishkek"),
      country: t("country_kg"),
      quote: t("t2_quote"),
    },
    {
      initials: "MY",
      name: "Madina Yusupova",
      role: t("t3_role"),
      city: t("city_dushanbe"),
      country: t("country_tj"),
      quote: t("t3_quote"),
    },
  ];

  const faqs = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
    { q: t("q5"), a: t("a5") },
  ];

  return (
    <div ref={rootRef}>
      <style>{`
  :root {
    --blue: #2563EB;
    --blue-hover: #1D4ED8;
    --blue-deep: #1E3A8A;
    --yellow: #F5C242;
    --yellow-hover: #E0AC28;
    --yellow-deep: #7A5709;
    --orange: #F5A623;
    --orange-hover: #DB8E10;
    --orange-deep: #93520A;
    --red: #EF4444;
    --red-hover: #DC2626;
    --red-deep: #B91C1C;
    --ink: #111827;
    --muted: #6B7280;
    --faint: #9CA3AF;
    --bg: #FFFDF8;
    --bg-subtle: #FFF6E6;
    --tint-blue: #EFF6FF;
    --tint-yellow: #FFFBEB;
    --tint-orange: #FFF1DC;
    --tint-red: #FEF2F2;
    --border: #F0E3CC;
    --border-strong: #E6C98F;
    --dark: #0F1A3D;
    --dark-2: #1B1642;
    --radius-sm: 10px;
    --radius-md: 16px;
    --radius-lg: 24px;
    --radius-full: 999px;
    --shadow-sm: 0 1px 2px rgba(17,24,39,.06);
    --shadow-md: 0 8px 24px -8px rgba(17,24,39,.14);
    --shadow-lg: 0 24px 48px -16px rgba(17,24,39,.20);
    --shadow-blue: 0 20px 44px -14px rgba(37,99,235,.38);
    --font-heading: var(--font-unbounded), sans-serif;
    --font-body: var(--font-onest), sans-serif;
  }

  .lp * { box-sizing: border-box; }
  .lp { font-family: var(--font-body); color: var(--ink); background: var(--bg); line-height: 1.55; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  .lp a { text-decoration: none; color: inherit; }
  .lp ul { list-style: none; margin: 0; padding: 0; }
  .lp h1, .lp h2, .lp h3, .lp h4 { font-family: var(--font-heading); font-weight: 800; margin: 0; }
  .lp p { margin: 0; }

  .container { width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 24px; }

  /* SKIP LINK */
  .skip-link { position: fixed; top: -60px; left: 16px; z-index: 2000; background: var(--blue); color: #fff; padding: 10px 18px; border-radius: var(--radius-sm); font-weight: 600; font-size: 14px; transition: top .15s ease; }
  .skip-link:focus { top: 16px; }

  /* EYEBROW TAG */
  .eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; background: var(--tint-orange); color: var(--orange-deep); border-radius: var(--radius-full); font-weight: 700; font-size: 13px; letter-spacing: .3px; }
  .eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--orange); }
  .eyebrow.gold { background: var(--tint-yellow); color: var(--yellow-deep); }
  .eyebrow.gold .dot { background: var(--yellow); }
  .eyebrow.red { background: var(--tint-red); color: var(--red-deep); }
  .eyebrow.red .dot { background: var(--red); }
  .eyebrow.on-dark { background: rgba(255,255,255,.12); color: #fff; }
  .eyebrow.on-dark .dot { background: var(--yellow); }

  /* BUTTONS */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px 24px; border-radius: var(--radius-full); font-weight: 700; font-size: 15px; font-family: var(--font-body); cursor: pointer; border: none; transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease, color .15s ease, border-color .15s ease; white-space: nowrap; }
  .btn.btn-blue { background: var(--blue); color: #fff; box-shadow: var(--shadow-blue); }
  .btn.btn-blue:hover { background: var(--blue-hover); transform: translateY(-2px); }
  .btn.btn-yellow { background: var(--yellow); color: #1F2937; box-shadow: 0 14px 28px -10px rgba(245,194,66,.55); }
  .btn.btn-yellow:hover { background: var(--yellow-hover); transform: translateY(-2px); }
  .btn.btn-outline { background: transparent; color: var(--ink); border: 1.5px solid var(--border-strong); }
  .btn.btn-outline:hover { border-color: var(--blue); color: var(--blue-deep); background: var(--tint-blue); }
  .btn.btn-white { background: #fff; color: var(--dark); }
  .btn.btn-white:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
  .btn.btn-ghost-dark { background: rgba(255,255,255,.08); color: #fff; border: 1.5px solid rgba(255,255,255,.35); }
  .btn.btn-ghost-dark:hover { background: rgba(255,255,255,.16); }
  .btn-sm { padding: 9px 16px; font-size: 13px; }
  .btn-block { width: 100%; }

  /* NAVBAR */
  .navbar { position: sticky; top: 0; z-index: 1000; background: rgba(255,255,255,.86); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); }
  .navbar::before { content: ''; display: block; height: 3px; width: 100%; background: linear-gradient(90deg, var(--yellow) 0% 45%, var(--orange) 45% 80%, var(--red) 80% 100%); }
  .nav-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; }
  .nav-logo { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-heading); font-size: 21px; font-weight: 800; color: var(--ink); letter-spacing: -.3px; }
  .nav-logo-mark { width: 30px; height: 30px; border-radius: 9px; background: linear-gradient(135deg, var(--blue), var(--blue-hover)); position: relative; flex-shrink: 0; box-shadow: 0 3px 0 0 var(--yellow); }
  .nav-logo-mark::after { content: ''; position: absolute; inset: 8px; border-radius: 4px; background: var(--yellow); }
  .nav-logo span { color: var(--blue); }
  .nav-links { display: flex; align-items: center; gap: 28px; }
  .nav-links a { font-size: 14.5px; font-weight: 600; color: var(--muted); transition: color .15s; }
  .nav-links a:hover { color: var(--blue); }
  .nav-actions { display: flex; align-items: center; gap: 14px; }
  .lang-pill { display: flex; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: var(--radius-full); padding: 3px; }
  .lang-pill button { background: none; border: none; padding: 5px 10px; border-radius: var(--radius-full); font-size: 12px; font-weight: 700; color: var(--muted); cursor: pointer; transition: .15s; text-transform: uppercase; font-family: var(--font-body); }
  .lang-pill button[aria-pressed="true"] { background: var(--blue); color: #fff; }
  .hamburger { display: none; background: none; border: 1px solid var(--border); border-radius: var(--radius-sm); width: 40px; height: 40px; align-items: center; justify-content: center; cursor: pointer; color: var(--ink); }
  .mobile-panel { display: none; }

  /* HERO */
  .hero { position: relative; padding: 72px 0 88px; overflow: hidden; background:
      linear-gradient(135deg, #FFF9E8 0%, #FFEBBE 38%, #FFDCA0 62%, #FFF3DC 100%),
      radial-gradient(circle at 8% 8%, rgba(37,99,235,.10), transparent 42%),
      radial-gradient(circle at 96% 4%, rgba(245,166,35,.32), transparent 40%),
      radial-gradient(circle at 60% 100%, rgba(239,68,68,.06), transparent 45%); }
  .hero-grid { display: grid; grid-template-columns: 7fr 5fr; gap: 56px; align-items: center; }
  .hero-h1 { font-size: clamp(34px, 4.6vw, 56px); line-height: 1.08; letter-spacing: -1.2px; color: var(--ink); margin: 22px 0 20px; }
  .hero-h1 .grad { display: block; background: linear-gradient(95deg, var(--orange-hover) 0%, var(--yellow-hover) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .hero-sub { font-size: 18px; color: var(--muted); max-width: 540px; margin-bottom: 32px; line-height: 1.65; }
  .hero-actions { display: flex; gap: 14px; flex-wrap: wrap; }
  .hero-trust-row { display: flex; align-items: center; gap: 20px; margin-top: 40px; padding-top: 28px; border-top: 1px solid var(--border); }
  .hero-trust-item { display: flex; align-items: center; gap: 10px; }
  .hero-trust-icon { width: 36px; height: 36px; border-radius: 50%; background: var(--tint-blue); color: var(--blue); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .hero-trust-icon.gold { background: var(--tint-yellow); color: var(--yellow-deep); }
  .hero-trust-item h4 { font-size: 14.5px; font-weight: 700; color: var(--ink); }
  .hero-trust-item p { font-size: 12.5px; color: var(--muted); }

  /* HERO DASHBOARD MOCK */
  .hero-visual { position: relative; }
  .dash-card { position: relative; z-index: 2; background: #fff; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); border: 1px solid var(--border); overflow: hidden; }
  .dash-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border); }
  .dash-head-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--blue-deep); background: var(--tint-blue); padding: 5px 10px; border-radius: var(--radius-full); }
  .dash-head-tag .pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); animation: pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
  .dash-body { padding: 20px 22px 22px; }
  .dash-title { font-family: var(--font-heading); font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 14px; }
  .dash-parties { display: flex; gap: 12px; margin-bottom: 18px; }
  .dash-party { flex: 1; display: flex; align-items: center; gap: 9px; background: var(--bg-subtle); border-radius: var(--radius-sm); padding: 9px 12px; }
  .dash-avatar { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #fff; }
  .dash-avatar.blue { background: linear-gradient(135deg, var(--blue), var(--blue-hover)); }
  .dash-avatar.gold { background: linear-gradient(135deg, var(--yellow), var(--yellow-hover)); color: #1F2937; }
  .dash-party-lbl { font-size: 10.5px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .3px; }
  .dash-party-val { font-size: 12.5px; color: var(--ink); font-weight: 700; }
  .dash-progress-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  .dash-progress-row span:first-child { font-size: 12.5px; font-weight: 700; color: var(--muted); }
  .dash-progress-row span:last-child { font-size: 12.5px; font-weight: 800; color: var(--blue-deep); }
  .dash-bar { height: 8px; border-radius: var(--radius-full); background: var(--bg-subtle); overflow: hidden; margin-bottom: 18px; }
  .dash-bar-fill { height: 100%; border-radius: var(--radius-full); background: linear-gradient(90deg, var(--orange), var(--yellow)); width: 66%; }
  .dash-milestones { display: flex; flex-direction: column; gap: 9px; margin-bottom: 18px; }
  .dash-ms { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--ink); }
  .dash-ms-dot { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .dash-ms-dot.done { background: var(--blue); color: #fff; }
  .dash-ms-dot.active { background: var(--tint-yellow); border: 2px solid var(--yellow); }
  .dash-ms-dot.pending { background: var(--bg-subtle); border: 2px solid var(--border); }
  .dash-ms.muted { color: var(--muted); }
  .dash-footer { display: flex; align-items: center; justify-content: space-between; background: var(--tint-blue); border-radius: var(--radius-sm); padding: 12px 14px; }
  .dash-footer-lbl { font-size: 11px; color: var(--blue-deep); font-weight: 700; text-transform: uppercase; letter-spacing: .3px; }
  .dash-footer-val { font-size: 16px; font-weight: 800; color: var(--ink); font-family: var(--font-heading); }
  .dash-lock { width: 30px; height: 30px; border-radius: 50%; background: var(--blue); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

  .float-chip { position: absolute; z-index: 3; display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px 14px; box-shadow: var(--shadow-md); animation: float 6s ease-in-out infinite; }
  .float-chip.top { top: -18px; right: -14px; animation-delay: 0s; }
  .float-chip.bottom { bottom: -18px; left: -18px; animation-delay: 2.5s; }
  .float-chip-icon { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .float-chip-icon.blue { background: var(--tint-blue); color: var(--blue); }
  .float-chip-icon.gold { background: var(--tint-yellow); color: var(--yellow-deep); }
  .float-chip h5 { font-size: 12.5px; font-weight: 700; color: var(--ink); }
  .float-chip p { font-size: 11.5px; color: var(--muted); }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }

  /* REVEAL */
  .reveal { opacity: 0; transform: translateY(20px); transition: opacity .6s ease, transform .6s ease; }
  .reveal.is-visible { opacity: 1; transform: translateY(0); }
  .rd1.is-visible { transition-delay: .07s; } .rd2.is-visible { transition-delay: .14s; }
  .rd3.is-visible { transition-delay: .21s; } .rd4.is-visible { transition-delay: .28s; }
  @media (prefers-reduced-motion: reduce) {
    .reveal { opacity: 1; transform: none; transition: none; }
    .float-chip, .dash-head-tag .pulse { animation: none; }
  }

  /* SECTION HEADER */
  .section-pad { padding: 88px 0; }
  .sec-head { max-width: 660px; margin: 0 auto 52px; text-align: center; }
  .sec-head h2 { font-size: clamp(28px, 3.4vw, 38px); letter-spacing: -.6px; color: var(--ink); margin: 16px 0 16px; }
  .sec-head p { font-size: 17px; color: var(--muted); }
  .sec-head.left { margin-left: 0; text-align: left; }

  /* TRUST BAR */
  .trust-section { padding: 44px 0; background: var(--bg-subtle); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .trust-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; margin-bottom: 36px; }
  .trust-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-full); font-size: 13.5px; font-weight: 700; color: var(--ink); }
  .trust-chip .flag-dot { width: 9px; height: 9px; border-radius: 50%; }
  .trust-chip .flag-dot.c1 { background: var(--blue); } .trust-chip .flag-dot.c2 { background: var(--yellow); }
  .trust-chip .flag-dot.c3 { background: var(--red); } .trust-chip .flag-dot.c4 { background: var(--blue-hover); }
  .trust-chip .flag-dot.c5 { background: var(--yellow-hover); }
  .trust-chip.badge { color: var(--blue-deep); border-color: var(--tint-blue); background: var(--tint-blue); }
  .trust-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
  .trust-stat { text-align: center; }
  .trust-stat h3 { font-size: 30px; letter-spacing: -.5px; color: var(--ink); font-family: var(--font-heading); }
  .trust-stat span { font-size: 13px; color: var(--muted); font-weight: 600; }

  /* PROBLEM / SOLUTION */
  .ps-rows { display: flex; flex-direction: column; gap: 16px; }
  .ps-row { display: grid; grid-template-columns: 1fr 44px 1fr; gap: 16px; align-items: center; }
  .ps-card { display: flex; gap: 14px; align-items: flex-start; padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border); background: #fff; }
  .ps-card.problem { border-left: 3px solid var(--red); }
  .ps-card.solution { border-left: 3px solid var(--blue); background: var(--tint-blue); border-color: transparent; }
  .ps-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ps-card.problem .ps-icon { background: var(--tint-red); color: var(--red-deep); }
  .ps-card.solution .ps-icon { background: #fff; color: var(--blue); }
  .ps-card p { font-size: 14.5px; color: var(--ink); font-weight: 600; line-height: 1.5; }
  .ps-arrow { display: flex; align-items: center; justify-content: center; color: var(--faint); }

  /* HOW IT WORKS - 4 STEP TIMELINE */
  .steps-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; position: relative; margin-bottom: 56px; }
  .steps-row::before { content: ''; position: absolute; top: 23px; left: 12.5%; right: 12.5%; height: 2px; background: linear-gradient(90deg, var(--yellow), var(--orange), var(--red)); z-index: 0; }
  .step-item { position: relative; z-index: 1; text-align: center; }
  .step-num { width: 46px; height: 46px; border-radius: 50%; background: #fff; border: 2px solid var(--yellow-hover); color: var(--yellow-deep); font-family: var(--font-heading); font-weight: 800; font-size: 17px; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; box-shadow: 0 0 0 6px #fff; }
  .step-item:nth-child(2) .step-num { border-color: var(--orange); color: var(--orange-deep); }
  .step-item:nth-child(3) .step-num { border-color: var(--red); color: var(--red-deep); }
  .step-item:nth-child(4) .step-num { border-color: var(--blue); color: var(--blue-deep); }
  .step-item h3 { font-size: 16.5px; margin-bottom: 8px; color: var(--ink); }
  .step-item p { font-size: 13.5px; color: var(--muted); line-height: 1.5; max-width: 230px; margin: 0 auto; }

  .escrow-visual { max-width: 640px; margin: 0 auto; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 36px 40px; text-align: center; position: relative; overflow: hidden; }
  .escrow-visual::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, var(--yellow) 0 40%, var(--orange) 40% 80%, var(--red) 80% 100%); }
  .ev-lock { width: 68px; height: 68px; border-radius: 50%; background: var(--tint-orange); color: var(--orange-deep); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
  .escrow-visual h4 { font-size: 22px; margin-bottom: 10px; }
  .escrow-visual p { color: var(--muted); margin-bottom: 26px; }
  .ev-stats { display: flex; justify-content: center; gap: 48px; border-top: 1px solid var(--border); padding-top: 24px; }
  .ev-stat h5 { font-size: 26px; font-weight: 800; font-family: var(--font-heading); color: var(--ink); }
  .ev-stat span { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .6px; font-weight: 700; }

  /* CATEGORIES */
  .cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .cat-card { padding: 26px 22px; border-radius: var(--radius-md); border: 1px solid var(--border); background: #fff; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
  .cat-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: var(--blue); }
  .cat-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; background: var(--tint-blue); color: var(--blue); }
  .cat-card.acc-yellow .cat-icon { background: var(--tint-yellow); color: var(--yellow-deep); }
  .cat-card.acc-red .cat-icon { background: var(--tint-red); color: var(--red-deep); }
  .cat-card h3 { font-size: 16.5px; margin-bottom: 6px; }
  .cat-card p { font-size: 13.5px; color: var(--muted); margin-bottom: 16px; min-height: 38px; }
  .cat-meta { font-size: 12.5px; font-weight: 700; color: var(--blue-deep); padding-top: 14px; border-top: 1px solid var(--border); }

  /* PRICING STRIP */
  .price-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 780px; margin: 0 auto; }
  .price-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 32px; text-align: center; }
  .price-card.hi { border: 2px solid var(--blue); box-shadow: var(--shadow-blue); }
  .price-card h3 { font-size: 15px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 14px; }
  .price-card .val { font-family: var(--font-heading); font-size: 42px; font-weight: 800; color: var(--ink); margin-bottom: 10px; }
  .price-card p.desc { font-size: 14px; color: var(--muted); }

  /* SPECIALIST CARDS */
  .spec-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .spec-card { display: block; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 22px; transition: transform .2s ease, box-shadow .2s ease; }
  .spec-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); }
  .spec-top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .spec-avatar { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-heading); font-weight: 800; font-size: 16px; color: #fff; flex-shrink: 0; }
  .spec-avatar.blue { background: linear-gradient(135deg, var(--blue), var(--blue-hover)); }
  .spec-avatar.yellow { background: linear-gradient(135deg, var(--yellow), var(--yellow-hover)); color: #1F2937; }
  .spec-avatar.red { background: linear-gradient(135deg, var(--red), var(--red-hover)); }
  .spec-name { font-size: 15.5px; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 5px; }
  .spec-role { font-size: 12.5px; color: var(--muted); }
  .spec-country { font-size: 12px; color: var(--faint); margin-top: 2px; }
  .spec-stats { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink); font-weight: 700; margin-bottom: 12px; }
  .spec-stats .sep { color: var(--border-strong); }
  .spec-stats .muted { color: var(--muted); font-weight: 500; }
  .spec-price { display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid var(--border); font-size: 13px; font-weight: 700; color: var(--blue-deep); }

  /* PROJECT CARDS */
  .proj-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .proj-card { display: block; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 24px; transition: transform .2s ease, box-shadow .2s ease; }
  .proj-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); }
  .proj-tag { display: inline-block; font-size: 11.5px; font-weight: 700; color: var(--blue-deep); background: var(--tint-blue); padding: 4px 10px; border-radius: var(--radius-full); margin-bottom: 12px; }
  .proj-card h3 { font-size: 16px; margin-bottom: 14px; line-height: 1.4; min-height: 44px; }
  .proj-meta { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .proj-meta-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
  .proj-meta-row span:first-child { color: var(--muted); display: flex; align-items: center; gap: 6px; }
  .proj-meta-row span:last-child { color: var(--ink); font-weight: 700; }
  .proj-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid var(--border); }
  .proj-verified { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--blue-deep); font-weight: 700; }
  .proj-proposals { font-size: 12px; color: var(--muted); font-weight: 600; }

  /* DIFFERENCES TABLE */
  .diff-scroll { overflow-x: auto; border-radius: var(--radius-lg); border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
  .diff-table { width: 100%; border-collapse: collapse; min-width: 620px; background: #fff; }
  .diff-table th, .diff-table td { padding: 16px 20px; text-align: left; font-size: 14px; border-bottom: 1px solid var(--border); }
  .diff-table th { font-family: var(--font-heading); font-size: 13px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted); font-weight: 800; }
  .diff-table th.us-col, .diff-table td.us-col { background: var(--tint-blue); }
  .diff-table td.feature { font-weight: 700; color: var(--ink); }
  .diff-table td.us-col { color: var(--blue-deep); font-weight: 700; }
  .diff-table td.them-col { color: var(--muted); }
  .diff-table tr:last-child td { border-bottom: none; }
  .diff-check { color: var(--blue); }

  /* TESTIMONIALS */
  .test-section { padding: 96px 0; position: relative; overflow: hidden; color: #fff; background: linear-gradient(155deg, var(--dark) 0%, var(--dark-2) 100%); }
  .test-section::before { content: ''; position: absolute; inset: 0; pointer-events: none; background:
      radial-gradient(circle at 6% 10%, rgba(245,166,35,.35), transparent 42%),
      radial-gradient(circle at 94% 18%, rgba(245,194,66,.32), transparent 42%),
      radial-gradient(circle at 50% 105%, rgba(239,68,68,.20), transparent 45%); }
  .test-section .container { position: relative; z-index: 1; }
  .test-section .sec-head h2 { color: #fff; }
  .test-section .sec-head p { color: #B9C2E0; }
  .test-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .test-card { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14); border-radius: var(--radius-md); padding: 26px; backdrop-filter: blur(6px); }
  .test-stars { display: flex; gap: 3px; color: var(--yellow); margin-bottom: 14px; }
  .test-quote { font-size: 14.5px; line-height: 1.65; color: #DCE1F5; margin-bottom: 20px; }
  .test-person { display: flex; align-items: center; gap: 10px; }
  .test-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--blue), var(--yellow)); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0; }
  .test-person h5 { font-size: 13.5px; font-weight: 700; color: #fff; }
  .test-person p { font-size: 12px; color: #A9B2D6; }

  /* SECURITY */
  .sec-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .sec-card { padding: 26px 22px; border-radius: var(--radius-md); border: 1px solid var(--border); background: #fff; text-align: center; }
  .sec-card-icon { width: 52px; height: 52px; border-radius: 14px; background: var(--tint-blue); color: var(--blue); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
  .sec-card:nth-child(2n) .sec-card-icon { background: var(--tint-yellow); color: var(--yellow-deep); }
  .sec-card h3 { font-size: 15.5px; margin-bottom: 8px; }
  .sec-card p { font-size: 13px; color: var(--muted); line-height: 1.5; }

  /* FAQ */
  .faq-list { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
  .faq-item { border: 1px solid var(--border); border-radius: var(--radius-md); background: #fff; overflow: hidden; }
  .faq-item summary { list-style: none; cursor: pointer; padding: 18px 22px; display: flex; align-items: center; justify-content: space-between; font-weight: 700; font-size: 15px; color: var(--ink); }
  .faq-item summary::-webkit-details-marker { display: none; }
  .faq-plus { width: 26px; height: 26px; border-radius: 50%; background: var(--tint-blue); color: var(--blue); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform .2s ease; }
  .faq-item[open] .faq-plus { transform: rotate(45deg); }
  .faq-item p { padding: 0 22px 20px; font-size: 14px; color: var(--muted); line-height: 1.6; }

  /* CTA */
  .cta-section { padding: 96px 0; }
  .cta-box { position: relative; overflow: hidden; border-radius: var(--radius-lg); padding: 76px 40px; text-align: center; color: #fff; background: linear-gradient(120deg, var(--orange-deep) 0%, var(--dark) 45%, var(--dark-2) 75%, var(--red-deep) 130%); }
  .cta-box::before { content: ''; position: absolute; inset: 0; pointer-events: none; background:
      radial-gradient(circle at 10% 15%, rgba(245,166,35,.40), transparent 45%),
      radial-gradient(circle at 90% 10%, rgba(245,194,66,.34), transparent 45%),
      radial-gradient(circle at 50% 105%, rgba(239,68,68,.22), transparent 50%); }
  .cta-box > * { position: relative; z-index: 1; }
  .cta-box h2 { font-size: clamp(28px, 3.6vw, 40px); margin-bottom: 18px; color: #fff; }
  .cta-box p { font-size: 17px; color: #C7CEEA; margin-bottom: 34px; max-width: 560px; margin-inline: auto; }
  .cta-actions { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }

  /* FOOTER */
  .footer { padding: 72px 0 32px; background: var(--bg-subtle); border-top: 1px solid var(--border); }
  .f-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 56px; }
  .f-brand p { color: var(--muted); margin-top: 14px; max-width: 280px; font-size: 13.5px; line-height: 1.6; }
  .f-social { display: flex; gap: 10px; margin-top: 20px; }
  .f-social a { width: 34px; height: 34px; border-radius: 50%; background: #fff; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--muted); transition: .15s; }
  .f-social a:hover { color: var(--blue); border-color: var(--blue); }
  .f-col h4 { font-size: 13px; font-weight: 800; color: var(--ink); margin-bottom: 18px; text-transform: uppercase; letter-spacing: .4px; }
  .f-col ul { display: flex; flex-direction: column; gap: 11px; }
  .f-col a { color: var(--muted); font-size: 13.5px; transition: .15s; }
  .f-col a:hover { color: var(--blue); }
  .f-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 28px; border-top: 1px solid var(--border); color: var(--muted); font-size: 13px; flex-wrap: wrap; gap: 16px; }

  /* RESPONSIVE */
  @media (max-width: 1080px) {
    .hero-grid { grid-template-columns: 1fr; text-align: center; }
    .hero-sub { margin-inline: auto; }
    .hero-actions, .hero-trust-row { justify-content: center; }
    .hero-visual { max-width: 460px; margin: 0 auto; padding-top: 30px; }
    .cat-grid { grid-template-columns: repeat(2, 1fr); }
    .spec-grid { grid-template-columns: repeat(2, 1fr); }
    .proj-grid { grid-template-columns: repeat(2, 1fr); }
    .sec-grid { grid-template-columns: repeat(2, 1fr); }
    .test-grid { grid-template-columns: 1fr; }
    .trust-stats { grid-template-columns: repeat(2, 1fr); gap: 32px; }
    .f-grid { grid-template-columns: 1fr 1fr; gap: 40px; }
    .steps-row { grid-template-columns: 1fr 1fr; gap: 32px 20px; }
    .steps-row::before { display: none; }
  }
  @media (max-width: 760px) {
    .nav-links, .nav-actions .btn, .nav-actions .lang-pill { display: none; }
    .hamburger { display: flex; }
    .mobile-panel.open { display: block; border-top: 1px solid var(--border); background: #fff; padding: 16px 0 22px; }
    .mobile-panel a.mp-link { display: block; padding: 12px 0; font-size: 15px; font-weight: 600; color: var(--ink); border-bottom: 1px solid var(--border); }
    .mobile-panel .mp-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
    .hero { padding: 48px 0 56px; }
    .price-grid { grid-template-columns: 1fr; }
    .ps-row { grid-template-columns: 1fr; }
    .ps-arrow { transform: rotate(90deg); margin: 0 auto; }
    .cat-grid, .spec-grid, .proj-grid, .sec-grid { grid-template-columns: 1fr; }
    .steps-row { grid-template-columns: 1fr; }
    .f-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
    .cta-box { padding: 52px 24px; }
    .cta-actions { flex-direction: column; }
    .cta-actions .btn { width: 100%; }
    .section-pad { padding: 64px 0; }
    .trust-stats { grid-template-columns: repeat(2, 1fr); }
    .f-bottom { flex-direction: column; text-align: center; }
    .escrow-visual { padding: 28px 22px; }
    .ev-stats { gap: 32px; }
  }
`}</style>

      <div className="lp">
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
        <a href="#main-content" className="skip-link">
          {lang === "ru" ? "Перейти к содержимому" : lang === "en" ? "Skip to content" : "Asosiy kontentga o'tish"}
        </a>

        <header className="navbar">
          <div className="container nav-row">
            <Link href="/" className="nav-logo">
              <span className="nav-logo-mark" aria-hidden="true" />
              Bobo<span>&amp;Doda</span>
            </Link>
            <nav className="nav-links" aria-label="Main">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href}>{l.label}</a>
              ))}
            </nav>
            <div className="nav-actions">
              <div className="lang-pill" role="group" aria-label="UZ/RU/EN">
                {langOptions.map((opt) => (
                  <button key={opt} type="button" onClick={() => setLang(opt)} aria-pressed={lang === opt}>
                    {opt}
                  </button>
                ))}
              </div>
              <Link href="/kirish?tab=kirish" className="btn btn-outline btn-sm">{t("nav_login")}</Link>
              <Link href="/kirish" className="btn btn-blue btn-sm">{t("nav_start")}</Link>
              <button
                className="hamburger"
                aria-expanded={menuOpen}
                aria-label="Menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
              </button>
            </div>
          </div>
          <div className={`mobile-panel ${menuOpen ? "open" : ""}`}>
            <div className="container">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} className="mp-link" onClick={() => setMenuOpen(false)}>{l.label}</a>
              ))}
              <div className="mp-actions">
                <div className="lang-pill" role="group" aria-label="UZ/RU/EN">
                  {langOptions.map((opt) => (
                    <button key={opt} type="button" onClick={() => setLang(opt)} aria-pressed={lang === opt}>{opt}</button>
                  ))}
                </div>
                <Link href="/kirish?tab=kirish" className="btn btn-outline btn-block">{t("nav_login")}</Link>
                <Link href="/kirish" className="btn btn-blue btn-block">{t("nav_start")}</Link>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content">
          {/* HERO */}
          <section className="hero">
            <div className="container hero-grid">
              <div>
                <span className="eyebrow"><span className="dot" />{t("hero_tag")}</span>
                <h1 className="hero-h1">
                  {t("hero_h1a")}
                  <span className="grad">{t("hero_h1b")}</span>
                </h1>
                <p className="hero-sub">{t("hero_sub")}</p>
                <div className="hero-actions">
                  <Link href="/kirish?tab=register&role=mutaxassis" className="btn btn-blue">{t("hero_cta1")}</Link>
                  <Link href="/kirish" className="btn btn-outline">{t("hero_cta2")}</Link>
                </div>
                <div className="hero-trust-row">
                  <div className="hero-trust-item">
                    <span className="hero-trust-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    </span>
                    <h4>{t("trust_badge_secure")}</h4>
                  </div>
                  <div className="hero-trust-item">
                    <span className="hero-trust-icon gold">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    </span>
                    <h4>{t("trust_badge_verified")}</h4>
                  </div>
                </div>
              </div>

              <div className="hero-visual">
                <div className="float-chip top">
                  <span className="float-chip-icon gold"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg></span>
                  <div>
                    <h5>{t("fc_1")}</h5>
                    <p>{t("fc_1_sub")}</p>
                  </div>
                </div>

                <div className="dash-card">
                  <div className="dash-head">
                    <span className="dash-head-tag"><span className="pulse" />{t("hero_dash_tag")}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--blue)" }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </div>
                  <div className="dash-body">
                    <div className="dash-title">{t("hero_dash_project")}</div>
                    <div className="dash-parties">
                      <div className="dash-party">
                        <span className="dash-avatar blue">X</span>
                        <div>
                          <div className="dash-party-lbl">{t("hero_dash_client")}</div>
                          <div className="dash-party-val">Jasur T.</div>
                        </div>
                      </div>
                      <div className="dash-party">
                        <span className="dash-avatar gold">A</span>
                        <div>
                          <div className="dash-party-lbl">{t("hero_dash_specialist")}</div>
                          <div className="dash-party-val">Aziza Y.</div>
                        </div>
                      </div>
                    </div>
                    <div className="dash-progress-row">
                      <span>{t("hero_dash_progress")}</span>
                      <span>66%</span>
                    </div>
                    <div className="dash-bar"><div className="dash-bar-fill" /></div>
                    <div className="dash-milestones">
                      <div className="dash-ms">
                        <span className="dash-ms-dot done"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg></span>
                        {t("hero_dash_m1")}
                      </div>
                      <div className="dash-ms">
                        <span className="dash-ms-dot active" />
                        {t("hero_dash_m2")}
                      </div>
                      <div className="dash-ms muted">
                        <span className="dash-ms-dot pending" />
                        {t("hero_dash_m3")}
                      </div>
                    </div>
                    <div className="dash-footer">
                      <div>
                        <div className="dash-footer-lbl">{t("hero_dash_escrow")}</div>
                        <div className="dash-footer-val">14 500 000 so&apos;m</div>
                      </div>
                      <span className="dash-lock">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="float-chip bottom">
                  <span className="float-chip-icon blue"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z" /></svg></span>
                  <div>
                    <h5>{t("fc_2")}</h5>
                    <p>{t("fc_2_sub")}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TRUST BAR */}
          <section className="trust-section">
            <div className="container">
              <div className="trust-top">
                <span className="trust-chip"><span className="flag-dot c1" />{t("country_uz")}</span>
                <span className="trust-chip"><span className="flag-dot c2" />{t("country_kz")}</span>
                <span className="trust-chip"><span className="flag-dot c3" />{t("country_kg")}</span>
                <span className="trust-chip"><span className="flag-dot c4" />{t("country_tj")}</span>
                <span className="trust-chip"><span className="flag-dot c5" />{t("country_tm")}</span>
                <span className="trust-chip badge">{t("trust_badge_startups")}</span>
                <span className="trust-chip badge">{t("trust_badge_secure")}</span>
                <span className="trust-chip badge">{t("trust_badge_verified")}</span>
              </div>
              <div className="trust-stats">
                <div className="trust-stat reveal"><h3>850+</h3><span>{t("stat_specialists_label")}</span></div>
                <div className="trust-stat reveal rd1"><h3>2 100+</h3><span>{t("stat_projects_label")}</span></div>
                <div className="trust-stat reveal rd2"><h3>4 300+</h3><span>{t("stat_protected_label")}</span></div>
                <div className="trust-stat reveal rd3"><h3>5</h3><span>{t("stat_countries_label")}</span></div>
              </div>
            </div>
          </section>

          {/* PROBLEM / SOLUTION */}
          <section className="section-pad">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow red"><span className="dot" />{t("ps_tag")}</span>
                <h2>{t("ps_h2")}</h2>
                <p>{t("ps_sub")}</p>
              </div>
              <div className="ps-rows">
                {[
                  { p: t("ps_p1"), s: t("ps_s1") },
                  { p: t("ps_p2"), s: t("ps_s2") },
                  { p: t("ps_p3"), s: t("ps_s3") },
                  { p: t("ps_p4"), s: t("ps_s4") },
                ].map((row, i) => (
                  <div className={`ps-row reveal rd${(i % 4) + 1}`} key={i}>
                    <div className="ps-card problem">
                      <span className="ps-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg></span>
                      <p>{row.p}</p>
                    </div>
                    <div className="ps-arrow">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </div>
                    <div className="ps-card solution">
                      <span className="ps-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></span>
                      <p>{row.s}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* HOW IT WORKS / ESCROW */}
          <section className="section-pad" style={{ background: "var(--bg-subtle)" }} id="how-it-works">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow"><span className="dot" />{t("escrow_tag")}</span>
                <h2>{t("escrow_h2")}</h2>
                <p>{t("escrow_sub")}</p>
              </div>

              <div className="steps-row">
                {[
                  { h: t("step1_h"), p: t("step1_p") },
                  { h: t("step2_h"), p: t("step2_p") },
                  { h: t("step3_h"), p: t("step3_p") },
                  { h: t("step4_h"), p: t("step4_p") },
                ].map((s, i) => (
                  <div className={`step-item reveal rd${i + 1}`} key={i}>
                    <div className="step-num">{i + 1}</div>
                    <h3>{s.h}</h3>
                    <p>{s.p}</p>
                  </div>
                ))}
              </div>

              <div className="escrow-visual reveal">
                <div className="ev-lock">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
                <h4>{t("ev_title")}</h4>
                <p>{t("ev_desc")}</p>
                <div className="ev-stats">
                  <div className="ev-stat"><h5>0%</h5><span>{t("ev_s1")}</span></div>
                  <div className="ev-stat"><h5>100%</h5><span>{t("ev_s2")}</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* CATEGORIES */}
          <section className="section-pad" id="categories">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow gold"><span className="dot" />{t("cat_tag")}</span>
                <h2>{t("cat_h2_main")}</h2>
                <p>{t("cat_sub_main")}</p>
              </div>
              <div className="cat-grid">
                {categories.map((c, i) => {
                  const accent = i % 3 === 1 ? "acc-yellow" : i % 3 === 2 ? "acc-red" : "";
                  return (
                    <div className={`cat-card ${accent} reveal rd${(i % 4) + 1}`} key={c.key}>
                      <div className="cat-icon">
                        <CategoryIcon name={c.icon} />
                      </div>
                      <h3>{t(`c_${c.key}`)}</h3>
                      <p>{t(`c_${c.key}_p`)}</p>
                      <div className="cat-meta">{t(`c_${c.key}_price`)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* PRICING */}
          <section className="section-pad" style={{ background: "var(--bg-subtle)" }} id="pricing">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow"><span className="dot" />{t("pricing_tag")}</span>
                <h2>{t("pricing_h2")}</h2>
                <p>{t("pricing_sub")}</p>
              </div>
              <div className="price-grid">
                <div className="price-card reveal">
                  <h3>{t("price_specialist_title")}</h3>
                  <div className="val">5%</div>
                  <p className="desc">{t("price_specialist_desc")}</p>
                </div>
                <div className="price-card hi reveal rd1">
                  <h3>{t("price_client_title")}</h3>
                  <div className="val">{t("price_client_value")}</div>
                  <p className="desc">{t("price_client_desc")}</p>
                </div>
              </div>
            </div>
          </section>

          {/* FEATURED SPECIALISTS */}
          <section className="section-pad" id="specialists">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow"><span className="dot" />{t("fs_tag")}</span>
                <h2>{t("fs_h2")}</h2>
                <p>{t("fs_sub")}</p>
              </div>
              <div className="spec-grid">
                {specialists.map((s, i) => (
                  <Link href="/kirish" className={`spec-card reveal rd${i + 1}`} key={s.name}>
                    <div className="spec-top">
                      <span className={`spec-avatar ${s.accent}`}>{s.initials}</span>
                      <div>
                        <div className="spec-name">
                          {s.name}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--blue)" aria-hidden="true"><path d="M12 2 4.5 5v6c0 5.2 3.4 9 7.5 11 4.1-2 7.5-5.8 7.5-11V5Z" /></svg>
                        </div>
                        <div className="spec-role">{s.role}</div>
                        <div className="spec-country">{s.city}, {s.country}</div>
                      </div>
                    </div>
                    <div className="spec-stats">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--yellow)" stroke="var(--yellow-hover)" strokeWidth="1"><polygon points="12 2 15 9 22 9.5 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.5 9 9" /></svg>
                      {s.rating}
                      <span className="sep">·</span>
                      <span className="muted">{s.projects} {t("fs_completed")}</span>
                    </div>
                    <div className="spec-price">
                      <span>{t("fs_from")}</span>
                      <span>{s.price}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* FEATURED PROJECTS */}
          <section className="section-pad" style={{ background: "var(--bg-subtle)" }} id="projects">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow gold"><span className="dot" />{t("fp_tag")}</span>
                <h2>{t("fp_h2")}</h2>
                <p>{t("fp_sub")}</p>
              </div>
              <div className="proj-grid">
                {projects.map((p, i) => (
                  <Link href="/kirish" className={`proj-card reveal rd${i + 1}`} key={p.title}>
                    <span className="proj-tag">{p.tag}</span>
                    <h3>{p.title}</h3>
                    <div className="proj-meta">
                      <div className="proj-meta-row"><span>{t("budget_label")}</span><span>{p.budget}</span></div>
                      <div className="proj-meta-row"><span>{t("timeline_label")}</span><span>{p.timeline}</span></div>
                    </div>
                    <div className="proj-foot">
                      <span className="proj-verified">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        {t("verified_label")}
                      </span>
                      <span className="proj-proposals">{p.proposals} {t("proposals_label")}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* WHY DIFFERENT */}
          <section className="section-pad" id="differences">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow red"><span className="dot" />{t("diff_tag")}</span>
                <h2>{t("diff_h2")}</h2>
                <p>{t("diff_sub")}</p>
              </div>
              <div className="diff-scroll reveal">
                <table className="diff-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th className="us-col">Bobo&amp;Doda</th>
                      <th>{t("diff_col_them")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffRows.map((row) => (
                      <tr key={row.label}>
                        <td className="feature">{row.label}</td>
                        <td className="us-col">
                          <svg className="diff-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: 6, verticalAlign: -2 }}><polyline points="20 6 9 17 4 12" /></svg>
                          {row.us}
                        </td>
                        <td className="them-col">{row.them}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* TESTIMONIALS */}
          <section className="test-section">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow on-dark"><span className="dot" />{t("test_tag")}</span>
                <h2>{t("test_h2")}</h2>
                <p>{t("test_sub")}</p>
              </div>
              <div className="test-grid">
                {testimonials.map((tst, i) => (
                  <div className={`test-card reveal rd${i + 1}`} key={tst.name}>
                    <div className="test-stars">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <svg key={si} width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15 9 22 9.5 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.5 9 9" /></svg>
                      ))}
                    </div>
                    <p className="test-quote">&ldquo;{tst.quote}&rdquo;</p>
                    <div className="test-person">
                      <span className="test-avatar">{tst.initials}</span>
                      <div>
                        <h5>{tst.name}</h5>
                        <p>{tst.role} &middot; {tst.city}, {tst.country}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECURITY */}
          <section className="section-pad" id="security">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow"><span className="dot" />{t("sec_tag")}</span>
                <h2>{t("sec_h2")}</h2>
                <p>{t("sec_sub")}</p>
              </div>
              <div className="sec-grid">
                {[
                  { h: t("sec1_h"), p: t("sec1_p"), icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /> },
                  { h: t("sec2_h"), p: t("sec2_p"), icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></> },
                  { h: t("sec3_h"), p: t("sec3_p"), icon: <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></> },
                  { h: t("sec4_h"), p: t("sec4_p"), icon: <><circle cx="12" cy="12" r="10" /><path d="M12 8v5" /><path d="M12 16h.01" /></> },
                ].map((s, i) => (
                  <div className={`sec-card reveal rd${i + 1}`} key={s.h}>
                    <div className="sec-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{s.icon}</svg>
                    </div>
                    <h3>{s.h}</h3>
                    <p>{s.p}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="section-pad" style={{ background: "var(--bg-subtle)" }} id="faq">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow gold"><span className="dot" />{t("faq_tag")}</span>
                <h2>{t("faq_h2")}</h2>
              </div>
              <div className="faq-list">
                {faqs.map((f) => (
                  <details className="faq-item reveal" key={f.q}>
                    <summary>
                      {f.q}
                      <span className="faq-plus">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      </span>
                    </summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className="cta-section">
            <div className="container">
              <div className="cta-box reveal">
                <h2>{t("cta_ready")}</h2>
                <p>{t("cta_desc")}</p>
                <div className="cta-actions">
                  <Link href="/kirish?tab=register&role=mutaxassis" className="btn btn-white">{t("cta_btn1")}</Link>
                  <Link href="/kirish" className="btn btn-ghost-dark">{t("cta_btn2")}</Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="footer">
          <div className="container">
            <div className="f-grid">
              <div className="f-brand">
                <Link href="/" className="nav-logo">
                  <span className="nav-logo-mark" aria-hidden="true" />
                  Bobo<span>&amp;Doda</span>
                </Link>
                <p>{t("foot_desc")}</p>
                <div className="f-social">
                  <a href="#" aria-label="Telegram"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z" /></svg></a>
                  <a href="#" aria-label="LinkedIn"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /><path d="M10 9h4v2a4 4 0 0 1 4-2 4 4 0 0 1 4 4v7h-4v-6a2 2 0 0 0-4 0v6h-4Z" /></svg></a>
                  <a href="#" aria-label="Instagram"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><line x1="17.5" y1="6.5" x2="17.5" y2="6.5" /></svg></a>
                </div>
              </div>
              <div className="f-col">
                <h4>{t("f_product")}</h4>
                <ul>
                  <li><a href="#specialists">{t("f_hire")}</a></li>
                  <li><a href="#projects">{t("f_work")}</a></li>
                  <li><a href="#how-it-works">{t("f_how")}</a></li>
                  <li><a href="#pricing">{t("f_pricing")}</a></li>
                </ul>
              </div>
              <div className="f-col">
                <h4>{t("f_company")}</h4>
                <ul>
                  <li><a href="#">{t("f_about")}</a></li>
                  <li><a href="#">{t("f_careers")}</a></li>
                  <li><a href="#">{t("f_blog")}</a></li>
                </ul>
              </div>
              <div className="f-col">
                <h4>{t("f_legal")}</h4>
                <ul>
                  <li><Link href="/shartlar">{t("f_terms")}</Link></li>
                  <li><Link href="/maxfiylik">{t("f_privacy")}</Link></li>
                  <li><Link href="/oferta">{t("f_aml")}</Link></li>
                </ul>
              </div>
              <div className="f-col">
                <h4>{t("f_support")}</h4>
                <ul>
                  <li><a href="#faq">{t("f_faq")}</a></li>
                  <li><a href="#">{t("f_help")}</a></li>
                  <li><a href="mailto:info@bobododa.uz">{t("f_contact_us")}</a></li>
                </ul>
              </div>
            </div>
            <div className="f-bottom">
              <p>&copy; 2026 Bobo&amp;Doda. {t("foot_rights")}</p>
              <div className="lang-pill" role="group" aria-label="UZ/RU/EN">
                {langOptions.map((opt) => (
                  <button key={opt} type="button" onClick={() => setLang(opt)} aria-pressed={lang === opt}>{opt}</button>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function CategoryIcon({ name }: { name: string }) {
  const props = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;
  switch (name) {
    case "design":
      return <svg {...props}><path d="M12 19l7-7-3-3-7 7v3h3Z" /><path d="M18 13l-3-3 2-2 3 3-2 2Z" /></svg>;
    case "code":
      return <svg {...props}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>;
    case "cpu":
      return <svg {...props}><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></svg>;
    case "megaphone":
      return <svg {...props}><path d="M3 11v3a1 1 0 0 0 1 1h2l4 5V6L6 11H4a1 1 0 0 0-1 1Z" /><path d="M15 8a4 4 0 0 1 0 8M19 5a8 8 0 0 1 0 14" /></svg>;
    case "languages":
      return <svg {...props}><path d="M4 5h9M9 3v2M6 8c1.5 3.5 3.8 5.7 6.5 7M13 8c-1 3-3.5 6-7.5 8" /><path d="M15 21l4-9 4 9M16.3 18h5.4" /></svg>;
    case "video":
      return <svg {...props}><rect x="2" y="5" width="15" height="14" rx="2" /><path d="M22 8.5v7L17 13Z" /></svg>;
    case "briefcase":
      return <svg {...props}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
    case "cap":
      return <svg {...props}><path d="M2 9.5 12 5l10 4.5-10 4.5-10-4.5Z" /><path d="M6 11.5V16c0 1.5 2.5 3 6 3s6-1.5 6-3v-4.5" /></svg>;
    default:
      return null;
  }
}
