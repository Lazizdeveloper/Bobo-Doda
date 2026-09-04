
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT, type Lang } from "@/lib/i18n";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { useSupportModal } from "@/components/shared/SupportModalProvider";

/* ── small utilities ─────────────────────────────────────────────── */

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/* ── page ─────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const { t, lang, setLang } = useT();
  const { openSupportModal } = useSupportModal();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);
  const reduced = useReducedMotion();

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
            entry.target.setAttribute("data-visible", "true");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  /* escrow steps: whichever step card is centred in the viewport drives
     the live status panel — a scroll-driven read of contract progress. */
  useEffect(() => {
    const nodes = stepRefs.current.filter(Boolean) as HTMLDivElement[];
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = nodes.indexOf(entry.target as HTMLDivElement);
          if (idx !== -1) setActiveStep(idx);
        });
      },
      { threshold: 0, rootMargin: "-42% 0px -42% 0px" }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);



  const langOptions: Lang[] = ["uz", "ru", "en"];

  const navLinks = [
    { href: "#how-it-works", label: t("nav_how") },
    { href: "#categories", label: t("nav_cats") },
    { href: "#pricing", label: t("nav_pricing") },
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
    { key: "cyb", icon: "shield" },
    { key: "dat", icon: "chart" },
    { key: "cld", icon: "cloud" },
    { key: "qa", icon: "flask" },
    { key: "sup", icon: "headset" },
  ] as const;





  const faqs = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
    { q: t("q5"), a: t("a5") },
  ];


  const escrowStatuses = [
    t("escrow_status_0"),
    t("escrow_status_1"),
    t("escrow_status_2"),
    t("escrow_status_3"),
  ];
  const escrowFill = [8, 34, 66, 100][activeStep];

  return (
    <div ref={rootRef}>
      <style>{`
  :root {
    /* brand environment — yellow canvas, tonal not flat */
    --y-50: #FFFDF3;
    --y-100: #FFF6D8;
    --y-200: #FFEBA8;
    --y-300: #FFDD72;
    --y-400: #FFCE45;
    --y-500: #F5B93A;
    --y-600: #DFA226;
    --y-700: #9C7315;
    --y-900: #543D0B;
    --y-line: #E8C978;

    /* trust — deep green, the platform's primary UI color */
    --g-500: #15803D;
    --g-600: #106932;
    --g-700: #0E5C2C;
    --g-800: #0B4322;
    --g-900: #0A2C17;
    --g-tint: #E8F5EC;

    /* action / alert — controlled red */
    --r-500: #E5484D;
    --r-600: #CC3A3F;
    --r-700: #A32B2F;
    --r-tint: #FCEBEB;

    --ink: #1D1B12;
    --muted: #5E5A44;
    --faint: #948E70;
    --white: #FFFFFF;

    --radius-sm: 10px;
    --radius-md: 16px;
    --radius-lg: 26px;
    --radius-full: 999px;

    --shadow-sm: 0 1px 2px rgba(29,27,18,.08);
    --shadow-md: 0 10px 26px -10px rgba(29,27,18,.18);
    --shadow-lg: 0 28px 56px -20px rgba(29,27,18,.24);
    --shadow-green: 0 20px 44px -16px rgba(21,128,61,.34);

    --font-heading: var(--font-unbounded), sans-serif;
    --font-body: var(--font-onest), sans-serif;

    /* spacing scale */
    --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-6: 24px;
    --s-8: 32px; --s-10: 48px; --s-12: 64px; --s-16: 80px; --s-20: 96px; --s-24: 128px;

    /* motion */
    --ease: cubic-bezier(.22,.9,.32,1);
    --dur-micro: 180ms;
    --dur-standard: 380ms;
    --dur-feature: 720ms;
  }

  .lp * { box-sizing: border-box; }
  .lp {
    font-family: var(--font-body); color: var(--ink); line-height: 1.55;
    -webkit-font-smoothing: antialiased; position: relative;
    background: var(--y-400);
  }
  .lp a { text-decoration: none; color: inherit; }
  .lp ul { list-style: none; margin: 0; padding: 0; }
  /* overflow clipping lives below the navbar, not on .lp itself — an overflow-x
     ancestor breaks position:sticky, which would silently un-stick the navbar */
  .lp-scroll { overflow-x: hidden; }
  .lp h1, .lp h2, .lp h3, .lp h4 { font-family: var(--font-heading); font-weight: 800; margin: 0; overflow-wrap: break-word; word-break: break-word; }
  .lp p { margin: 0; }

  .container { width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 24px; }

  /* anchor nav offset — keeps sticky navbar from covering section targets */
  html { scroll-behavior: smooth; scroll-padding-top: 88px; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

  /* ── grain overlay (global, extremely subtle) ─────────────────── */
  .grain {
    position: fixed; inset: 0; z-index: 900; pointer-events: none;
    opacity: .05; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* ── shared decorative background system (yellow canvas sections) ─ */
  .canvas { position: relative; background: var(--y-400); overflow: hidden; }
  .canvas-decor { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
  .canvas-decor .blob {
    position: absolute; border-radius: 50%; filter: blur(2px);
  }
  .canvas-decor .line { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(29,27,18,.06); }
  .canvas-decor .hline { position: absolute; left: 0; right: 0; height: 1px; background: rgba(29,27,18,.06); }
  .canvas-decor .dotgrid {
    position: absolute; inset: 0;
    background-image: radial-gradient(rgba(29,27,18,.10) 1px, transparent 1.4px);
    background-size: 26px 26px;
    -webkit-mask-image: radial-gradient(ellipse 60% 50% at 50% 40%, #000 0%, transparent 72%);
            mask-image: radial-gradient(ellipse 60% 50% at 50% 40%, #000 0%, transparent 72%);
  }
  .canvas > .container, .canvas > * > .container { position: relative; z-index: 1; }
  @keyframes driftA { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(14px,-10px); } }
  @keyframes driftB { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(-10px,12px); } }
  @media (prefers-reduced-motion: reduce) { .canvas-decor .blob { animation: none !important; } }

  /* ── skip link ────────────────────────────────────────────────── */
  .skip-link { position: fixed; top: -60px; left: 16px; z-index: 2000; background: var(--g-600); color: #fff; padding: 10px 18px; border-radius: var(--radius-sm); font-weight: 700; font-size: 14px; transition: top var(--dur-micro) var(--ease); }
  .skip-link:focus { top: 16px; }

  /* ── eyebrow ──────────────────────────────────────────────────── */
  .eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; background: var(--white); color: var(--g-700); border-radius: var(--radius-full); font-weight: 700; font-size: 13px; letter-spacing: .3px; box-shadow: var(--shadow-sm); }
  .eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--g-500); }
  .eyebrow.red { color: var(--r-700); }
  .eyebrow.red .dot { background: var(--r-500); }
  .eyebrow.on-dark { background: rgba(255,255,255,.10); color: #fff; box-shadow: none; }
  .eyebrow.on-dark .dot { background: var(--y-400); }

  /* ── buttons ──────────────────────────────────────────────────── */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 24px; border-radius: var(--radius-full); font-weight: 700; font-size: 15px; font-family: var(--font-body); cursor: pointer; border: none; transition: transform var(--dur-micro) var(--ease), box-shadow var(--dur-micro) var(--ease), background-color var(--dur-micro) var(--ease), color var(--dur-micro) var(--ease), border-color var(--dur-micro) var(--ease); white-space: nowrap; min-height: 48px; }
  .btn .arrow { transition: transform var(--dur-micro) var(--ease); display: inline-flex; }
  .btn:hover .arrow { transform: translateX(4px); }
  .btn.btn-green { background: var(--g-600); color: #fff; box-shadow: var(--shadow-green); }
  .btn.btn-green:hover { background: var(--g-700); transform: translateY(-2px); }
  .btn.btn-outline-dark { background: transparent; color: var(--ink); border: 1.5px solid rgba(29,27,18,.28); }
  .btn.btn-outline-dark:hover { border-color: var(--g-600); color: var(--g-700); background: rgba(255,255,255,.5); }
  .btn.btn-white { background: #fff; color: var(--g-800); }
  .btn.btn-white:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
  .btn.btn-ghost-dark { background: rgba(255,255,255,.08); color: #fff; border: 1.5px solid rgba(255,255,255,.32); }
  .btn.btn-ghost-dark:hover { background: rgba(255,255,255,.16); }
  .btn-sm { padding: 10px 16px; font-size: 13px; min-height: 40px; }
  .btn-block { width: 100%; }

  /* ── navbar ───────────────────────────────────────────────────── */
  .navbar { position: sticky; top: 0; z-index: 1000; background: rgba(255, 249, 224, .78); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid rgba(29,27,18,.10); }
  .navbar::before { content: ''; display: block; height: 3px; width: 100%; background: linear-gradient(90deg, var(--g-600) 0% 55%, var(--y-500) 55% 82%, var(--r-500) 82% 100%); }
  .nav-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; }
  .nav-logo { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-heading); font-size: 21px; font-weight: 800; color: var(--ink); letter-spacing: -.3px; }
  .nav-logo-mark { width: 30px; height: 30px; border-radius: 9px; background: var(--g-600); position: relative; flex-shrink: 0; box-shadow: 0 3px 0 0 var(--y-500); }
  .nav-logo-mark::after { content: ''; position: absolute; inset: 8px; border-radius: 4px; background: var(--y-400); }
  .nav-logo span { color: var(--g-600); }
  .brand-lockup { gap: 12px; }
  .brand-lockup .nav-logo-mark { width: 40px; height: 40px; border-radius: 12px; box-shadow: 0 4px 0 0 var(--y-500); }
  .brand-lockup .nav-logo-mark::after { inset: 10px; border-radius: 5px; }
  .brand-lockup-text { display: flex; flex-direction: column; gap: 2px; line-height: 1; }
  .brand-lockup-word { font-size: 30px; letter-spacing: -.6px; }
  .brand-lockup-tagline { font-family: var(--font-body); font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--g-600); }
  .nav-links { display: flex; align-items: center; gap: 28px; }
  .nav-links a { font-size: 14.5px; font-weight: 600; color: var(--muted); transition: color var(--dur-micro); }
  .nav-links a:hover { color: var(--g-700); }
  .nav-actions { display: flex; align-items: center; gap: 14px; }
  .nav-help-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(29,27,18,.16); background: transparent; color: var(--muted); cursor: pointer; transition: var(--dur-micro); flex-shrink: 0; }
  .nav-help-btn:hover { color: var(--g-700); border-color: var(--g-600); background: var(--g-tint); }
  .lang-pill { display: flex; background: rgba(255,255,255,.6); border: 1px solid rgba(29,27,18,.14); border-radius: var(--radius-full); padding: 3px; }
  .lang-pill button { background: none; border: none; padding: 5px 10px; border-radius: var(--radius-full); font-size: 12px; font-weight: 700; color: var(--muted); cursor: pointer; transition: var(--dur-micro); text-transform: uppercase; font-family: var(--font-body); }
  .lang-pill button[aria-pressed="true"] { background: var(--g-600); color: #fff; }
  .hamburger { display: none; background: none; border: 1px solid rgba(29,27,18,.18); border-radius: var(--radius-sm); width: 44px; height: 44px; align-items: center; justify-content: center; cursor: pointer; color: var(--ink); }
  .mobile-panel { display: none; }

  /* ── hero ─────────────────────────────────────────────────────── */
  .hero { position: relative; padding: 56px 0 88px; overflow: hidden; background: var(--y-400); }
  .hero-grid { display: grid; grid-template-columns: 6.4fr 5.6fr; gap: 48px; align-items: center; }
  .hero-badge { opacity: 0; transform: translateY(14px); animation: heroIn var(--dur-feature) var(--ease) forwards; animation-delay: .05s; }
  .hero-h1 { font-size: clamp(32px, 5vw, 64px); line-height: 1.04; letter-spacing: -1.6px; color: var(--ink); margin: 22px 0 20px; overflow-wrap: break-word; word-break: break-word; }
  .hero-h1 span { display: block; opacity: 0; transform: translateY(20px); animation: heroIn var(--dur-feature) var(--ease) forwards; }
  .hero-h1 span:first-child { animation-delay: .15s; }
  .hero-h1 span.grad { animation-delay: .28s; color: var(--g-700); }
  .hero-actions { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 8px; opacity: 0; transform: translateY(16px); animation: heroIn var(--dur-feature) var(--ease) forwards; animation-delay: .4s; }
  .hero-trust-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 22px; margin-top: 40px; padding-top: 26px; border-top: 1px solid rgba(29,27,18,.14); opacity: 0; transform: translateY(16px); animation: heroIn var(--dur-feature) var(--ease) forwards; animation-delay: .62s; }
  .hero-trust-item { display: flex; align-items: center; gap: 9px; font-size: 14.5px; font-weight: 700; color: var(--ink); }
  .hero-trust-item svg { color: var(--g-600); flex-shrink: 0; }
  .hero-trust-sep { color: var(--y-700); font-weight: 400; }
  @keyframes heroIn { to { opacity: 1; transform: translateY(0); } }
  @media (prefers-reduced-motion: reduce) {
    .hero-badge, .hero-h1 span, .hero-actions, .hero-trust-row { animation: none !important; opacity: 1 !important; transform: none !important; }
  }

  /* ── hero product visual (realistic marketplace UI) ──────────── */
  .hero-visual { position: relative; opacity: 0; transform: translateY(24px) scale(.98); animation: heroIn var(--dur-feature) var(--ease) forwards; animation-delay: .35s; }
  @media (prefers-reduced-motion: reduce) { .hero-visual { animation: none !important; opacity: 1 !important; transform: none !important; } }
  .dash-card { position: relative; z-index: 2; background: #fff; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); border: 1px solid rgba(29,27,18,.08); overflow: hidden; }
  .dash-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid rgba(29,27,18,.08); }
  .dash-head-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--g-700); background: var(--g-tint); padding: 5px 10px; border-radius: var(--radius-full); }
  .dash-head-tag .pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--g-600); animation: pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
  .dash-body { padding: 20px 22px 22px; }
  .dash-title { font-family: var(--font-heading); font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 4px; }
  .dash-meta { display: flex; gap: 14px; font-size: 12.5px; color: var(--muted); font-weight: 600; margin-bottom: 16px; }
  .dash-chip-verified { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--g-700); background: var(--g-tint); padding: 4px 9px; border-radius: var(--radius-full); margin-bottom: 16px; }
  .dash-parties { display: flex; gap: 12px; margin-bottom: 18px; }
  .dash-party { flex: 1; display: flex; align-items: center; gap: 9px; background: var(--y-50); border-radius: var(--radius-sm); padding: 9px 12px; }
  .dash-avatar { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #fff; }
  .dash-avatar.green { background: var(--g-600); }
  .dash-avatar.gold { background: var(--y-500); color: #453207; }
  .dash-party-lbl { font-size: 10.5px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .3px; }
  .dash-party-val { font-size: 12.5px; color: var(--ink); font-weight: 700; }
  .dash-progress-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  .dash-progress-row span:first-child { font-size: 12.5px; font-weight: 700; color: var(--muted); }
  .dash-progress-row span:last-child { font-size: 12.5px; font-weight: 800; color: var(--g-700); }
  .dash-bar { height: 8px; border-radius: var(--radius-full); background: var(--y-100); overflow: hidden; margin-bottom: 18px; }
  .dash-bar-fill { height: 100%; border-radius: var(--radius-full); background: var(--g-600); width: 66%; transition: width 1s var(--ease); }
  .dash-milestones { display: flex; flex-direction: column; gap: 9px; margin-bottom: 18px; }
  .dash-ms { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--ink); }
  .dash-ms-dot { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .dash-ms-dot.done { background: var(--g-600); color: #fff; }
  .dash-ms-dot.active { background: var(--y-100); border: 2px solid var(--y-500); }
  .dash-ms-dot.pending { background: var(--y-50); border: 2px solid rgba(29,27,18,.14); }
  .dash-ms.muted { color: var(--muted); }
  .dash-footer { display: flex; align-items: center; justify-content: space-between; background: var(--g-tint); border-radius: var(--radius-sm); padding: 12px 14px; }
  .dash-footer-lbl { font-size: 11px; color: var(--g-700); font-weight: 700; text-transform: uppercase; letter-spacing: .3px; }
  .dash-footer-val { font-size: 16px; font-weight: 800; color: var(--ink); font-family: var(--font-heading); }
  .dash-lock { width: 30px; height: 30px; border-radius: 50%; background: var(--g-600); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

  .float-chip { position: absolute; z-index: 3; display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid rgba(29,27,18,.08); border-radius: var(--radius-md); padding: 12px 14px; box-shadow: var(--shadow-md); animation: float 7s ease-in-out infinite; }
  .float-chip.top { top: -18px; right: -10px; animation-delay: 0s; }
  .float-chip.bottom { bottom: -20px; right: -16px; animation-delay: 2.8s; }
  .float-chip-icon { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .float-chip-icon.green { background: var(--g-tint); color: var(--g-600); }
  .float-chip-icon.gold { background: var(--y-100); color: var(--y-900); }
  .float-chip h5 { font-size: 12.5px; font-weight: 700; color: var(--ink); }
  .float-chip p { font-size: 11.5px; color: var(--muted); }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @media (prefers-reduced-motion: reduce) { .float-chip, .dash-head-tag .pulse { animation: none; } }

  /* ── reveal (scroll) ──────────────────────────────────────────── */
  .reveal { opacity: 0; transform: translateY(20px); transition: opacity var(--dur-feature) var(--ease), transform var(--dur-feature) var(--ease); }
  .reveal[data-visible="true"] { opacity: 1; transform: translateY(0); }
  .rd1[data-visible="true"] { transition-delay: .06s; } .rd2[data-visible="true"] { transition-delay: .12s; }
  .rd3[data-visible="true"] { transition-delay: .18s; } .rd4[data-visible="true"] { transition-delay: .24s; }
  @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } }

  /* ── section header ───────────────────────────────────────────── */
  .section-pad { padding: var(--s-24) 0; }
  .sec-head { max-width: 640px; margin: 0 auto var(--s-12); text-align: center; }
  .sec-head h2 { font-size: clamp(28px, 3.4vw, 40px); letter-spacing: -.7px; color: var(--ink); margin: 16px 0 14px; }
  .sec-head p { font-size: 17px; color: var(--muted); }
  .sec-head.left { margin-left: 0; text-align: left; }
  .on-dark .sec-head h2 { color: #fff; }
  .on-dark .sec-head p { color: rgba(255,255,255,.7); }

  /* ── trust bar (horizontal metric bar) ───────────────────────── */
  .trust-section { padding: var(--s-10) 0; background: var(--white); border-top: 1px solid rgba(29,27,18,.08); border-bottom: 1px solid rgba(29,27,18,.08); }
  .trust-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; margin-bottom: var(--s-10); }
  .trust-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--y-50); border: 1px solid var(--y-line); border-radius: var(--radius-full); font-size: 13.5px; font-weight: 700; color: var(--ink); }
  .trust-chip .flag-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--g-500); }
  .trust-chip.badge { color: var(--g-700); border-color: transparent; background: var(--g-tint); }
  .trust-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s-6); }
  .trust-stat { text-align: center; }
  .trust-stat h3 { font-size: 38px; letter-spacing: -.8px; color: var(--ink); font-family: var(--font-heading); white-space: nowrap; }
  .trust-stat span { font-size: 13px; color: var(--muted); font-weight: 600; }

  /* ── escrow / how it works — main product story ─────────────── */
  .escrow-section { background: var(--white); }

  /* ── categories (asymmetric grid) ─────────────────────────────── */
  .cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; max-width: 1160px; margin: 0 auto; }
  .cat-card { display: flex; flex-direction: column; min-height: 192px; padding: 26px; border-radius: var(--radius-md); border: 1px solid rgba(29,27,18,.10); background: #fff; box-shadow: var(--shadow-sm); transition: transform var(--dur-standard) var(--ease), box-shadow var(--dur-standard) var(--ease), border-color var(--dur-standard) var(--ease); }
  .cat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--g-500); }
  .cat-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; background: var(--g-tint); color: var(--g-600); transition: color var(--dur-micro) var(--ease); }
  .cat-card h3 { font-size: 16.5px; margin-bottom: 6px; }
  .cat-card p { font-size: 13.5px; color: var(--muted); margin-bottom: 16px; }
  .cat-meta { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: var(--g-700); padding-top: 14px; border-top: 1px solid rgba(29,27,18,.10); margin-top: auto; }
  .cat-meta .go { transition: transform var(--dur-micro) var(--ease); }
  .cat-card:hover .cat-meta .go { transform: translateX(3px); }

  /* ── pricing ──────────────────────────────────────────────────── */
  .price-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--s-6); max-width: 980px; margin: 0 auto; }
  .price-card { background: #fff; border: 1px solid rgba(29,27,18,.10); border-radius: var(--radius-lg); padding: 32px; text-align: center; }
  .price-card.hi { background: var(--g-700); color: #fff; box-shadow: var(--shadow-green); transform: translateY(-8px); }
  .price-card.zero { background: var(--y-100); border-color: transparent; }
  .price-card h3 { font-size: 14px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 14px; }
  .price-card.hi h3 { color: rgba(255,255,255,.7); }
  .price-card .val { font-family: var(--font-heading); font-size: 44px; font-weight: 800; color: var(--ink); margin-bottom: 10px; }
  .price-card.hi .val { color: #fff; }
  .price-card.zero .val { color: var(--y-900); }
  .price-card p.desc { font-size: 14px; color: var(--muted); }
  .price-card.hi p.desc { color: rgba(255,255,255,.75); }

  /* ── security (deep green break #1) ──────────────────────────── */
  .sec-section { background: var(--g-900); color: #fff; position: relative; overflow: hidden; }
  .sec-section::before { content: ''; position: absolute; inset: 0; pointer-events: none; background:
      radial-gradient(circle at 8% 8%, rgba(255,206,69,.14), transparent 45%),
      radial-gradient(circle at 92% 92%, rgba(229,72,77,.12), transparent 45%); }
  .sec-section .container { position: relative; z-index: 1; }
  .sec-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
  .sec-card { padding: 28px 22px; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); }
  .sec-card-icon { width: 50px; height: 50px; border-radius: 14px; background: rgba(255,206,69,.14); color: var(--y-400); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
  .sec-card h3 { font-size: 16px; margin-bottom: 8px; color: #fff; }
  .sec-card p { font-size: 13.5px; color: rgba(255,255,255,.68); line-height: 1.55; }

  /* ── FAQ (controlled accordion, grid-trick smooth height) ──────── */
  .faq-list { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
  .faq-item { border: 1px solid rgba(29,27,18,.12); border-radius: var(--radius-md); background: #fff; overflow: hidden; }
  .faq-item button.faq-trigger { all: unset; box-sizing: border-box; cursor: pointer; width: 100%; padding: 18px 22px; display: flex; align-items: center; justify-content: space-between; gap: 16px; font-weight: 700; font-size: 15px; color: var(--ink); }
  .faq-plus { width: 26px; height: 26px; border-radius: 50%; background: var(--g-tint); color: var(--g-600); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform var(--dur-standard) var(--ease); }
  .faq-item[data-open="true"] .faq-plus { transform: rotate(135deg); background: var(--g-600); color: #fff; }
  .faq-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows var(--dur-standard) var(--ease); }
  .faq-item[data-open="true"] .faq-body { grid-template-rows: 1fr; }
  .faq-body-inner { overflow: hidden; }
  .faq-body p { padding: 0 22px 20px; font-size: 14px; color: var(--muted); line-height: 1.6; }
  @media (prefers-reduced-motion: reduce) { .faq-body { transition: none; } }
  .faq-footer { max-width: 760px; margin: 32px auto 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding-top: 24px; border-top: 1px solid rgba(29,27,18,.12); }
  .faq-view-all { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; color: var(--g-700); }
  .faq-view-all:hover { color: var(--g-800); }
  .faq-help-cta { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 600; color: var(--muted); }

  /* ── final CTA (deep green break #2) ─────────────────────────── */
  .cta-section { padding: var(--s-24) 0; background: var(--y-400); }
  .cta-box { position: relative; overflow: hidden; border-radius: var(--radius-lg); padding: 80px 40px; text-align: center; color: #fff; background: var(--g-800); }
  .cta-box::before { content: ''; position: absolute; inset: 0; pointer-events: none; background:
      radial-gradient(circle at 12% 15%, rgba(255,206,69,.22), transparent 45%),
      radial-gradient(circle at 88% 88%, rgba(229,72,77,.16), transparent 45%); }
  .cta-box > * { position: relative; z-index: 1; }
  .cta-box h2 { font-size: clamp(30px, 3.8vw, 44px); margin-bottom: 18px; color: #fff; letter-spacing: -.8px; }
  .cta-box p { font-size: 17px; color: rgba(255,255,255,.72); margin-bottom: 36px; max-width: 520px; margin-inline: auto; }
  .cta-actions { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }

  /* ── footer ───────────────────────────────────────────────────── */
  .footer { padding: 56px 0 28px; background: var(--g-900); color: rgba(255,255,255,.7); }
  .f-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 44px; }
  .f-brand p { color: rgba(255,255,255,.55); margin-top: 14px; max-width: 260px; font-size: 13.5px; line-height: 1.6; }
  .f-brand .nav-logo { color: #fff; }
  .f-col h4 { font-size: 12.5px; font-weight: 800; color: #fff; margin-bottom: 18px; text-transform: uppercase; letter-spacing: .5px; }
  .f-col ul { display: flex; flex-direction: column; gap: 11px; }
  .f-col a { color: rgba(255,255,255,.55); font-size: 13.5px; transition: var(--dur-micro); }
  .f-col a:hover { color: var(--y-400); }
  .f-link-btn { all: unset; color: rgba(255,255,255,.55); font-size: 13.5px; font-family: var(--font-body); cursor: pointer; transition: var(--dur-micro); }
  .f-link-btn:hover { color: var(--y-400); }
  .f-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 28px; border-top: 1px solid rgba(255,255,255,.10); font-size: 13px; flex-wrap: wrap; gap: 16px; }
  .footer .lang-pill { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
  .footer .lang-pill button { color: rgba(255,255,255,.6); }
  .footer .lang-pill button[aria-pressed="true"] { background: var(--g-600); color: #fff; }

  /* ── responsive ───────────────────────────────────────────────── */
  @media (max-width: 1080px) {
    .hero-grid { grid-template-columns: 1fr; text-align: center; }
    .hero-actions, .hero-trust-row { justify-content: center; }
    .hero-visual { max-width: 460px; margin: 0 auto; padding-top: 30px; }
    .cat-grid { grid-template-columns: repeat(2, 1fr); }
    .spec-grid { grid-template-columns: repeat(2, 1fr); }
    .proj-layout { grid-template-columns: 1fr; }
    .sec-grid { grid-template-columns: repeat(2, 1fr); }
    .trust-stats { grid-template-columns: repeat(2, 1fr); gap: 32px; }
    .f-grid { grid-template-columns: 1fr 1fr; gap: 40px; }
    .steps-row { grid-template-columns: 1fr 1fr; gap: 16px; }
    .prob-row { grid-template-columns: 60px 1fr; row-gap: 12px; }
    .prob-arrow { display: none; }
  }
  /* nav content needs ~975px minimum to fit without wrapping — switch to the
     hamburger menu earlier than the rest of the mobile layout kicks in, or
     tablet widths (761–1023px) overflow the desktop nav row */
  @media (max-width: 1023px) {
    .nav-links, .nav-actions .btn, .nav-actions .lang-pill { display: none; }
    .hamburger { display: flex; }
    .mobile-panel.open { display: block; border-top: 1px solid rgba(29,27,18,.1); background: rgba(255,249,224,.98); padding: 16px 0 22px; }
    .mobile-panel a.mp-link { display: block; padding: 14px 0; font-size: 15px; font-weight: 600; color: var(--ink); border-bottom: 1px solid rgba(29,27,18,.1); }
    .mp-link-btn { all: unset; box-sizing: border-box; display: block; width: 100%; padding: 14px 0; font-size: 15px; font-weight: 600; font-family: var(--font-body); color: var(--ink); border-bottom: 1px solid rgba(29,27,18,.1); cursor: pointer; }
    .mobile-panel .mp-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
  }
  @media (max-width: 760px) {
    .brand-lockup .nav-logo-mark { width: 34px; height: 34px; }
    .brand-lockup-word { font-size: 24px; }
    .brand-lockup-tagline { font-size: 9.5px; letter-spacing: 1px; }
    .hero { padding: 40px 0 56px; }
    .price-grid { grid-template-columns: 1fr; }
    .price-card.hi { transform: none; }
    .cat-grid, .spec-grid { grid-template-columns: 1fr; }
    .steps-row { grid-template-columns: 1fr; }
    .f-grid { grid-template-columns: 1fr; gap: 32px; }
    .f-brand p { max-width: none; }
    .cta-box { padding: 52px 22px; }
    .cta-actions { flex-direction: column; }
    .cta-actions .btn { width: 100%; }
    .section-pad { padding: var(--s-16) 0; }
    .trust-stats { grid-template-columns: repeat(2, 1fr); }
    .trust-stat h3 { font-size: 27px; }
    .f-bottom { flex-direction: column; text-align: center; }
    .escrow-visual { padding: 26px 22px; }
    .ev-stats { gap: 20px; }
    .test-card { padding: 32px 24px; }
    .test-quote { font-size: 17px; }
    .proj-card.featured h3 { font-size: 21px; }
  }
`}</style>

      <div className="lp">
        <div className="grain" aria-hidden="true" />
        <noscript>
          <style>{`.reveal, .hero-badge, .hero-h1 span, .hero-actions, .hero-trust-row, .hero-visual { opacity: 1 !important; transform: none !important; animation: none !important; }`}</style>
        </noscript>
        <a href="#main-content" className="skip-link">
          {lang === "ru" ? "Перейти к содержимому" : lang === "en" ? "Skip to content" : "Asosiy kontentga o'tish"}
        </a>

        <header className="navbar">
          <div className="container nav-row">
            <Link href="/" className="nav-logo brand-lockup">
              <span className="nav-logo-mark" aria-hidden="true" />
              <span className="brand-lockup-text">
                <span className="brand-lockup-word">Bobo<span>&amp;Doda</span></span>
                <span className="brand-lockup-tagline">{t("brand_tagline")}</span>
              </span>
            </Link>
            <nav className="nav-links" aria-label={t("a11y.mainNav")}>
              {navLinks.map((l) => (
                <a key={l.href} href={l.href}>{l.label}</a>
              ))}
            </nav>
            <div className="nav-actions">
              <button
                type="button"
                className="nav-help-btn"
                aria-label={t("nav_help")}
                title={t("nav_help")}
                onClick={() => openSupportModal({ source: "navbar" })}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 1.8-2 3.5" /><path d="M12 17h.01" /></svg>
              </button>
              <div className="lang-pill" role="group" aria-label={t("a11y.language")}>
                {langOptions.map((opt) => (
                  <button key={opt} type="button" onClick={() => setLang(opt)} aria-pressed={lang === opt}>
                    {opt}
                  </button>
                ))}
              </div>
              <Link href="/kirish?tab=kirish" className="btn btn-outline-dark btn-sm">{t("nav_login")}</Link>
              <Link href="/kirish" className="btn btn-green btn-sm">{t("nav_start")}</Link>
              <button
                className="hamburger"
                aria-expanded={menuOpen}
                aria-label={t("a11y.openMenu")}
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
              <button
                type="button"
                className="mp-link mp-link-btn"
                onClick={() => {
                  setMenuOpen(false);
                  openSupportModal({ source: "navbar" });
                }}
              >
                {t("nav_help")}
              </button>
              <div className="mp-actions">
                <div className="lang-pill" role="group" aria-label={t("a11y.language")}>
                  {langOptions.map((opt) => (
                    <button key={opt} type="button" onClick={() => setLang(opt)} aria-pressed={lang === opt}>{opt}</button>
                  ))}
                </div>
                <Link href="/kirish?tab=kirish" className="btn btn-outline-dark btn-block">{t("nav_login")}</Link>
                <Link href="/kirish" className="btn btn-green btn-block">{t("nav_start")}</Link>
              </div>
            </div>
          </div>
        </header>

        <div className="lp-scroll">
        <main id="main-content">
          {/* HERO */}
          <section className="hero">
            <div className="canvas-decor" aria-hidden="true">
              <div className="dotgrid" />
              <div className="blob" style={{ width: 520, height: 520, top: -180, right: -160, background: "radial-gradient(circle, rgba(255,255,255,.30), transparent 68%)", animation: reduced ? "none" : "driftA 16s ease-in-out infinite" }} />
              <div className="blob" style={{ width: 360, height: 360, bottom: -140, left: -120, background: "radial-gradient(circle, rgba(11,67,34,.10), transparent 70%)", animation: reduced ? "none" : "driftB 20s ease-in-out infinite" }} />
              <div className="line" style={{ left: "14%" }} />
              <div className="line" style={{ right: "14%" }} />
            </div>
            <div className="container hero-grid">
              <div>
                <span className="eyebrow hero-badge"><span className="dot" />{t("hero_tag")}</span>
                <h1 className="hero-h1">
                  <span>{t("hero_h1a")}</span>
                  <span className="grad">{t("hero_h1b")}</span>
                </h1>
                <div className="hero-actions">
                  <Link href="/kirish?tab=register&role=xaridor" className="btn btn-green">
                    {t("hero_cta1")}<span className="arrow" aria-hidden="true">→</span>
                  </Link>
                  <Link href="/kirish?tab=register&role=mutaxassis" className="btn btn-outline-dark">{t("hero_cta2")}</Link>
                </div>
                <div className="hero-trust-row">
                  <span className="hero-trust-item">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    {t("hero_trust_escrow")}
                  </span>
                  <span className="hero-trust-sep">·</span>
                  <span className="hero-trust-item">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    {t("trust_badge_verified")}
                  </span>
                  <span className="hero-trust-sep">·</span>
                  <span className="hero-trust-item">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z" /></svg>
                    {t("trust_countries_short")}
                  </span>
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--g-600)" }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </div>
                  <div className="dash-body">
                    <div className="dash-title">{t("proj1_title")}</div>
                    <div className="dash-meta">
                      <span>{t("proj1_budget")}</span>
                      <span>·</span>
                      <span>{t("proj1_timeline")}</span>
                    </div>
                    <span className="dash-chip-verified">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      {t("verified_label")}
                    </span>
                    <div className="dash-parties">
                      <div className="dash-party">
                        <span className="dash-avatar green">X</span>
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
                      <span>80%</span>
                    </div>
                    <div className="dash-bar"><div className="dash-bar-fill" style={{ width: "80%" }} /></div>
                    <div className="dash-milestones">
                      <div className="dash-ms">
                        <span className="dash-ms-dot done"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg></span>
                        {t("hero_dash_m1")}
                      </div>
                      <div className="dash-ms">
                        <span className="dash-ms-dot active" />
                        {t("escrow_status_2")}
                      </div>
                      <div className="dash-ms muted">
                        <span className="dash-ms-dot pending" />
                        {t("hero_dash_m3")}
                      </div>
                    </div>
                    <div className="dash-footer">
                      <div>
                        <div className="dash-footer-lbl">{t("hero_dash_escrow")}</div>
                        <div className="dash-footer-val">{t("proj1_budget")}</div>
                      </div>
                      <span className="dash-lock">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="float-chip bottom">
                  <span className="float-chip-icon green"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z" /></svg></span>
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
                <span className="trust-chip"><span className="flag-dot" />{t("country_uz")}</span>
                <span className="trust-chip"><span className="flag-dot" />{t("country_kz")}</span>
                <span className="trust-chip"><span className="flag-dot" />{t("country_kg")}</span>
                <span className="trust-chip"><span className="flag-dot" />{t("country_tj")}</span>
                <span className="trust-chip"><span className="flag-dot" />{t("country_tm")}</span>
                <span className="trust-chip badge">{t("trust_badge_startups")}</span>
                <span className="trust-chip badge">{t("trust_badge_secure")}</span>
                <span className="trust-chip badge">{t("trust_badge_verified")}</span>
              </div>
            </div>
          </section>

          {/* ESCROW — main product story, scroll-driven */}
          <section className="section-pad escrow-section" id="how-it-works">
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
                  <div
                    className={`step-item reveal rd${i + 1} ${activeStep === i ? "active" : ""}`}
                    key={i}
                    ref={(el) => { stepRefs.current[i] = el; }}
                  >
                    <div className="step-num">{i + 1}</div>
                    <h3>{s.h}</h3>
                    <p>{s.p}</p>
                  </div>
                ))}
              </div>

              <div className="escrow-visual reveal" role="status" aria-live="polite">
                <div className="ev-row">
                  <div>
                    <div className="ev-status">{escrowStatuses[activeStep]}</div>
                    <div className="ev-amount">{t("proj1_budget")}</div>
                  </div>
                  <span className="ev-lock">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </span>
                </div>
                <div className="ev-bar"><div className="ev-bar-fill" style={{ width: `${escrowFill}%` }} /></div>
                <div className="ev-stats">
                  <div className="ev-stat"><h5>0%</h5><span>{t("ev_s1")}</span></div>
                  <div className="ev-stat"><h5>100%</h5><span>{t("ev_s2")}</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* CATEGORIES — asymmetric grid */}
          <section className="section-pad canvas" id="categories">
            <div className="canvas-decor" aria-hidden="true">
              <div className="dotgrid" />
              <div className="hline" style={{ top: "18%" }} />
              <div className="blob" style={{ width: 380, height: 380, bottom: "-10%", left: "-8%", background: "radial-gradient(circle, rgba(11,67,34,.08), transparent 70%)" }} />
            </div>
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow"><span className="dot" />{t("cat_tag")}</span>
                <h2>{t("cat_h2_main")}</h2>
                <p>{t("cat_sub_main")}</p>
              </div>
              <div className="cat-grid">
                {categories.map((c, i) => (
                  <Link href="/kirish" className={`cat-card reveal rd${(i % 4) + 1}`} key={c.key}>
                    <div>
                      <div className="cat-icon">
                        <CategoryIcon name={c.icon} />
                      </div>
                      <h3>{t(`c_${c.key}`)}</h3>
                      <p>{t(`c_${c.key}_p`)}</p>
                    </div>
                    <div className="cat-meta">
                      {t(`c_${c.key}_price`)}
                      <span className="go" aria-hidden="true">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* PRICING */}
          <section className="section-pad" style={{ background: "var(--white)" }} id="pricing">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow"><span className="dot" />{t("pricing_tag")}</span>
                <h2>{t("pricing_h2")}</h2>
                <p>{t("pricing_sub")}</p>
              </div>
              <div className="price-grid">
                <div className="price-card reveal">
                  <h3>{t("price_specialist_title")}</h3>
                  <div className="val">{PLATFORM_FEE_PERCENT}%</div>
                  <p className="desc">{t("price_specialist_desc")}</p>
                </div>
                <div className="price-card hi reveal rd1">
                  <h3>{t("price_client_title")}</h3>
                  <div className="val">{t("price_client_value")}</div>
                  <p className="desc">{t("price_client_desc")}</p>
                </div>
                <div className="price-card zero reveal rd2">
                  <h3>{t("price_hidden_title")}</h3>
                  <div className="val">0</div>
                  <p className="desc">{t("price_hidden_desc")}</p>
                </div>
              </div>
            </div>
          </section>

          {/* SECURITY — deep green contrast break */}
          <section className="section-pad sec-section on-dark" id="security">
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow on-dark"><span className="dot" />{t("sec_tag")}</span>
                <h2>{t("sec_h2")}</h2>
                <p>{t("sec_sub")}</p>
              </div>
              <div className="sec-grid">
                {[
                  { h: t("sec1_h"), p: t("sec1_p"), icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /> },
                  { h: t("sec2_h"), p: t("sec2_p"), icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></> },
                  { h: t("sec3_h"), p: t("sec3_p"), icon: <><polyline points="20 6 9 17 4 12" /></> },
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
          <section className="section-pad canvas" id="faq">
            <div className="canvas-decor" aria-hidden="true">
              <div className="dotgrid" />
            </div>
            <div className="container">
              <div className="sec-head reveal">
                <span className="eyebrow"><span className="dot" />{t("faq_tag")}</span>
                <h2>{t("faq_h2")}</h2>
              </div>
              <div className="faq-list">
                {faqs.map((f, i) => {
                  const open = openFaq === i;
                  return (
                    <div className="faq-item reveal" data-open={open} key={f.q}>
                      <button
                        type="button"
                        className="faq-trigger"
                        aria-expanded={open}
                        aria-controls={`faq-panel-${i}`}
                        id={`faq-trigger-${i}`}
                        onClick={() => setOpenFaq(open ? null : i)}
                      >
                        {f.q}
                        <span className="faq-plus" aria-hidden="true">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </span>
                      </button>
                      <div className="faq-body" id={`faq-panel-${i}`} role="region" aria-labelledby={`faq-trigger-${i}`}>
                        <div className="faq-body-inner">
                          <p>{f.a}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="faq-footer reveal">
                <Link href="/savol-javob" className="faq-view-all">
                  {t("faq_view_all")} <span aria-hidden="true">→</span>
                </Link>
                <div className="faq-help-cta">
                  <span>{t("faq_still_need_help")}</span>
                  <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => openSupportModal({ source: "faq" })}>
                    {t("faq_ask_support")}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* FINAL CTA — deep green break #2 */}
          <section className="cta-section">
            <div className="container">
              <div className="cta-box reveal">
                <h2>{t("cta_ready")}</h2>
                <p>{t("cta_desc")}</p>
                <div className="cta-actions">
                  <Link href="/kirish?tab=register&role=xaridor" className="btn btn-white">
                    {t("cta_btn1")}<span className="arrow" aria-hidden="true">→</span>
                  </Link>
                  <Link href="/kirish?tab=register&role=mutaxassis" className="btn btn-ghost-dark">
                    {t("cta_btn2")}<span className="arrow" aria-hidden="true">→</span>
                  </Link>
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
              </div>
              <div className="f-col">
                <h4>{t("f_product")}</h4>
                <ul>
                  <li><a href="#how-it-works">{t("f_how")}</a></li>
                  <li><a href="#pricing">{t("f_pricing")}</a></li>
                </ul>
              </div>
              <div className="f-col">
                <h4>{t("f_legal")}</h4>
                <ul>
                  <li><Link href="/shartlar">{t("f_terms")}</Link></li>
                  <li><Link href="/maxfiylik">{t("f_privacy")}</Link></li>
                  <li><Link href="/oferta">{t("f_offer")}</Link></li>
                </ul>
              </div>
              <div className="f-col">
                <h4>{t("f_support")}</h4>
                <ul>
                  <li><Link href="/savol-javob">{t("f_faq")}</Link></li>
                  <li><Link href="/yordam-markazi">{t("f_help")}</Link></li>
                  <li>
                    <button type="button" className="f-link-btn" onClick={() => openSupportModal({ source: "footer" })}>
                      {t("f_contact_us")}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            <div className="f-bottom">
              <p>&copy; 2026 Bobo&amp;Doda. {t("foot_rights")}</p>
              <div className="lang-pill" role="group" aria-label={t("a11y.language")}>
                {langOptions.map((opt) => (
                  <button key={opt} type="button" onClick={() => setLang(opt)} aria-pressed={lang === opt}>{opt}</button>
                ))}
              </div>
            </div>
          </div>
        </footer>
        </div>
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
    case "shield":
      return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="M9 12l2 2 4-4" /></svg>;
    case "chart":
      return <svg {...props}><rect x="3" y="12" width="4" height="8" /><rect x="10" y="7" width="4" height="13" /><rect x="17" y="3" width="4" height="17" /></svg>;
    case "cloud":
      return <svg {...props}><path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4 2A4 4 0 0 0 6.5 19h11Z" /></svg>;
    case "flask":
      return <svg {...props}><path d="M9 2v6.5L4.3 17a2 2 0 0 0 1.75 3h11.9a2 2 0 0 0 1.75-3L15 8.5V2" /><path d="M8.5 2h7" /><path d="M8 14h8" /></svg>;
    case "headset":
      return <svg {...props}><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" /><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z" /></svg>;
    default:
      return null;
  }
}
