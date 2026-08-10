
"use client";

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import Link from 'next/link';
import { LangSwitch } from '@/components/shared/LangSwitch';

export default function LandingPage() {
  const { t } = useT();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <style>{`
  :root {
    --brand-primary: #049669; /* Fintech Emerald */
    --brand-primary-hover: #037A55;
    --brand-dark: #0F172A;
    --text-main: #1E293B;
    --text-muted: #64748B;
    --bg-main: #FFFFFF;
    --bg-subtle: #F8FAFC;
    --border-light: #E2E8F0;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 20px;
    --radius-full: 9999px;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
    --shadow-premium: 0 20px 40px -10px rgba(4, 150, 105, 0.15);
    --font-heading: 'Plus Jakarta Sans', sans-serif;
    --font-body: 'Inter', sans-serif;
  }
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--font-body);
    color: var(--text-main);
    background: var(--bg-main);
    line-height: 1.5;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }
  
  a { text-decoration: none; color: inherit; }
  ul { list-style: none; }
  
  /* UTILITIES */
  .container { width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 24px; }
  .text-gradient {
    background: linear-gradient(135deg, var(--brand-primary) 0%, #0284C7 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .tag {
    display: inline-flex; align-items: center; padding: 6px 12px;
    background: rgba(4, 150, 105, 0.1); color: var(--brand-primary);
    border-radius: var(--radius-full); font-weight: 600; font-size: 13px;
    letter-spacing: 0.5px; text-transform: uppercase; font-family: var(--font-heading);
  }
  
  /* BUTTONS */
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 12px 24px; border-radius: var(--radius-full); font-weight: 600;
    font-size: 15px; transition: all 0.3s ease; cursor: pointer; border: none;
    font-family: var(--font-heading);
  }
  .btn-primary {
    background: var(--brand-primary); color: white;
    box-shadow: 0 4px 14px 0 rgba(4, 150, 105, 0.39);
  }
  .btn-primary:hover {
    background: var(--brand-primary-hover); transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(4, 150, 105, 0.23);
  }
  .btn-outline {
    background: transparent; color: var(--text-main);
    border: 1px solid var(--border-light);
  }
  .btn-outline:hover {
    border-color: var(--text-muted); background: var(--bg-subtle);
  }
  
  /* NAVBAR */
  .navbar {
    position: fixed; top: 0; left: 0; width: 100%; z-index: 1000;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
    padding: 16px 0; transition: all 0.3s ease;
  }
  .nav-container { display: flex; align-items: center; justify-content: space-between; }
  .nav-logo { font-family: var(--font-heading); font-size: 24px; font-weight: 800; color: var(--brand-dark); letter-spacing: -0.5px; }
  .nav-logo span { color: var(--brand-primary); }
  .nav-links { display: flex; gap: 32px; }
  .nav-links a { font-size: 15px; font-weight: 500; color: var(--text-muted); transition: color 0.2s; }
  .nav-links a:hover { color: var(--brand-dark); }
  .nav-actions { display: flex; align-items: center; gap: 16px; }
  .lang-switch { display: flex; background: var(--bg-subtle); border-radius: 8px; padding: 4px; }
  .lang-switch button {
    background: none; border: none; padding: 6px 12px; border-radius: 6px;
    font-size: 13px; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: 0.2s;
  }
  .lang-switch button.active { background: white; color: var(--brand-dark); box-shadow: var(--shadow-sm); }
  
  /* HERO SECTION */
  .hero {
    padding: 160px 0 100px; position: relative; overflow: hidden;
    background: radial-gradient(circle at top right, rgba(4, 150, 105, 0.05), transparent 40%),
                radial-gradient(circle at bottom left, rgba(2, 132, 199, 0.05), transparent 40%);
  }
  .hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 64px; align-items: center; }
  .hero-content h1 {
    font-family: var(--font-heading); font-size: clamp(40px, 5vw, 64px);
    font-weight: 800; line-height: 1.1; letter-spacing: -1.5px; color: var(--brand-dark);
    margin: 24px 0;
  }
  .hero-subtitle { font-size: 18px; color: var(--text-muted); margin-bottom: 40px; max-width: 540px; line-height: 1.6; }
  .hero-actions { display: flex; gap: 16px; align-items: center; }
  .hero-trust { display: flex; align-items: center; gap: 24px; margin-top: 48px; padding-top: 32px; border-top: 1px solid var(--border-light); }
  .trust-item { display: flex; align-items: center; gap: 12px; }
  .trust-icon { width: 40px; height: 40px; border-radius: 50%; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; color: var(--brand-primary); }
  .trust-text p { font-size: 13px; color: var(--text-muted); }
  .trust-text h4 { font-size: 16px; font-weight: 700; color: var(--brand-dark); }
  
  /* HERO VISUAL (MARKETPLACE PREVIEW) */
  .hero-visual { position: relative; perspective: 1000px; }
  .specialist-card {
    background: white; border-radius: var(--radius-lg); padding: 24px;
    box-shadow: var(--shadow-premium); border: 1px solid rgba(255,255,255,0.5);
    position: relative; z-index: 2; transform: rotateY(-5deg) rotateX(5deg);
    transition: transform 0.5s ease;
  }
  .specialist-card:hover { transform: rotateY(0) rotateX(0); }
  .sc-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
  .sc-avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; background: #CBD5E1; }
  .sc-info h3 { font-size: 18px; font-weight: 700; color: var(--brand-dark); display: flex; align-items: center; gap: 6px; }
  .sc-info p { font-size: 14px; color: var(--text-muted); }
  .verified-badge { color: #3B82F6; }
  .sc-stats { display: flex; justify-content: space-between; padding: 16px; background: var(--bg-subtle); border-radius: var(--radius-md); margin-bottom: 20px; }
  .sc-stat-col { text-align: center; }
  .sc-stat-val { font-size: 16px; font-weight: 700; color: var(--brand-dark); }
  .sc-stat-lbl { font-size: 12px; color: var(--text-muted); }
  .sc-skills { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
  .sc-skill { padding: 4px 10px; background: white; border: 1px solid var(--border-light); border-radius: var(--radius-sm); font-size: 12px; font-weight: 500; }
  
  /* FLOATING ELEMENTS */
  .float-card {
    position: absolute; background: white; padding: 16px; border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg); border: 1px solid var(--border-light); display: flex; align-items: center; gap: 12px;
    animation: float 6s ease-in-out infinite; z-index: 3;
  }
  .float-card.top-right { top: -20px; right: -20px; animation-delay: 0s; }
  .float-card.bottom-left { bottom: -30px; left: -30px; animation-delay: 3s; }
  .fc-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .fc-icon.green { background: #D1FAE5; color: #059669; }
  .fc-icon.blue { background: #DBEAFE; color: #2563EB; }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }

  /* SECTION HEADERS */
  .section-header { text-align: center; margin-bottom: 64px; max-width: 640px; margin-inline: auto; }
  .section-header h2 { font-family: var(--font-heading); font-size: 36px; font-weight: 800; color: var(--brand-dark); margin-top: 16px; margin-bottom: 24px; letter-spacing: -0.5px; }
  .section-header p { font-size: 18px; color: var(--text-muted); }

  /* HOW IT WORKS / ESCROW */
  .escrow-section { padding: 120px 0; background: var(--bg-subtle); position: relative; overflow: hidden; }
  .escrow-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
  .escrow-steps { display: flex; flex-direction: column; gap: 32px; position: relative; }
  .escrow-steps::before {
    content: ''; position: absolute; left: 24px; top: 24px; bottom: 24px; width: 2px;
    background: linear-gradient(to bottom, var(--brand-primary) 50%, var(--border-light) 50%);
    background-size: 100% 20px;
  }
  .e-step { display: flex; gap: 24px; position: relative; z-index: 1; }
  .e-step-icon {
    width: 50px; height: 50px; border-radius: 50%; background: white; border: 2px solid var(--brand-primary);
    display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--brand-primary);
    flex-shrink: 0; box-shadow: 0 0 0 4px var(--bg-subtle);
  }
  .e-step-content h3 { font-family: var(--font-heading); font-size: 20px; font-weight: 700; margin-bottom: 8px; color: var(--brand-dark); }
  .e-step-content p { color: var(--text-muted); line-height: 1.6; }
  
  .escrow-visual { background: white; padding: 40px; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); position: relative; text-align: center; }
  .ev-lock { width: 80px; height: 80px; border-radius: 50%; background: #D1FAE5; color: #059669; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
  .ev-lock svg { width: 40px; height: 40px; }
  .escrow-visual h4 { font-size: 24px; font-weight: 800; font-family: var(--font-heading); margin-bottom: 12px; }
  .escrow-visual p { color: var(--text-muted); margin-bottom: 32px; }
  .ev-stats { display: flex; justify-content: center; gap: 40px; border-top: 1px solid var(--border-light); padding-top: 32px; }
  .ev-stat h5 { font-size: 28px; font-weight: 800; color: var(--brand-dark); }
  .ev-stat span { font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }

  /* CATEGORIES */
  .categories-section { padding: 120px 0; }
  .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
  .cat-card {
    border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 32px 24px;
    transition: all 0.3s ease; cursor: pointer; background: white; group;
  }
  .cat-card:hover { border-color: var(--brand-primary); box-shadow: var(--shadow-md); transform: translateY(-4px); }
  .cat-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; color: var(--brand-primary); margin-bottom: 24px; transition: 0.3s; }
  .cat-card:hover .cat-icon { background: var(--brand-primary); color: white; }
  .cat-card h3 { font-family: var(--font-heading); font-size: 18px; font-weight: 700; color: var(--brand-dark); margin-bottom: 8px; }
  .cat-card p { color: var(--text-muted); font-size: 14px; margin-bottom: 16px; }
  .cat-meta { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; color: var(--text-main); padding-top: 16px; border-top: 1px solid var(--border-light); }
  
  /* EARLY ACCESS SECTION */
  .testimonials { padding: 120px 0; background: var(--brand-dark); color: white; }
  .testimonials .section-header h2 { color: white; }
  .testimonials .section-header p { color: #94A3B8; }
  .t-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
  .t-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-md); padding: 32px; }
  .t-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(4, 150, 105, 0.15); color: #34D399; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
  .t-card h3 { font-family: var(--font-heading); font-size: 18px; font-weight: 700; margin-bottom: 10px; }
  .t-card p { font-size: 15px; line-height: 1.7; color: #94A3B8; }

  /* WHY JOIN NOW — honest, no fabricated numbers */
  .metrics { padding: 80px 0; border-bottom: 1px solid var(--border-light); }
  .m-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; text-align: center; }
  .m-item { display: flex; flex-direction: column; align-items: center; }
  .m-icon { width: 48px; height: 48px; border-radius: 50%; background: #D1FAE5; color: #059669; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
  .m-item p { font-size: 15px; color: var(--text-main); font-weight: 600; max-width: 220px; }

  /* CTA SECTION */
  .cta-section { padding: 120px 0; }
  .cta-box {
    background: linear-gradient(135deg, var(--brand-dark) 0%, #0F2027 100%);
    border-radius: var(--radius-lg); padding: 80px 40px; text-align: center; color: white;
    position: relative; overflow: hidden;
  }
  .cta-box::before {
    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
    background: radial-gradient(circle at center, rgba(4, 150, 105, 0.2) 0%, transparent 50%);
    pointer-events: none;
  }
  .cta-box h2 { font-family: var(--font-heading); font-size: 40px; font-weight: 800; margin-bottom: 24px; position: relative; z-index: 2; }
  .cta-box p { font-size: 18px; color: #94A3B8; margin-bottom: 40px; max-width: 600px; margin-inline: auto; position: relative; z-index: 2; }
  .cta-actions { display: flex; justify-content: center; gap: 16px; position: relative; z-index: 2; }

  /* FOOTER */
  .footer { padding: 80px 0 40px; background: var(--bg-subtle); border-top: 1px solid var(--border-light); }
  .f-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 64px; margin-bottom: 64px; }
  .f-brand p { color: var(--text-muted); margin-top: 16px; max-width: 300px; }
  .f-col h4 { font-family: var(--font-heading); font-weight: 700; color: var(--brand-dark); margin-bottom: 24px; font-size: 16px; }
  .f-col ul { display: flex; flex-direction: column; gap: 12px; }
  .f-col a { color: var(--text-muted); transition: 0.2s; font-size: 14px; }
  .f-col a:hover { color: var(--brand-primary); }
  .f-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 32px; border-top: 1px solid var(--border-light); color: var(--text-muted); font-size: 14px; }
  
  /* MOBILE RESPONSIVENESS */
  .hamburger { display: none; background: none; border: none; cursor: pointer; color: var(--brand-dark); }
  @media (max-width: 1024px) {
    .hero-grid { grid-template-columns: 1fr; text-align: center; }
    .hero-subtitle { margin-inline: auto; }
    .hero-actions { justify-content: center; }
    .escrow-grid { grid-template-columns: 1fr; }
    .t-grid { grid-template-columns: 1fr; }
    .m-grid { grid-template-columns: 1fr 1fr; gap: 48px; }
    .f-grid { grid-template-columns: 1fr 1fr; gap: 48px; }
  }
  @media (max-width: 768px) {
    .nav-links, .nav-actions .btn { display: none; }
    .hamburger { display: block; }
    .hero { padding: 120px 0 60px; }
    .hero-content h1 { font-size: 36px; }
    .cat-grid { grid-template-columns: 1fr; }
    .m-grid { grid-template-columns: 1fr; }
    .f-grid { grid-template-columns: 1fr; }
    .cta-box { padding: 48px 24px; }
    .cta-box h2 { font-size: 32px; }
    .cta-actions { flex-direction: column; }
    .cta-actions .btn { width: 100%; }
    .f-bottom { flex-direction: column; gap: 16px; text-align: center; }
  }
`}</style>

      {/* Navbar manually converted to JSX to inject LangSwitch */}
      <nav className={`navbar ${scrolled ? 'shadow-sm py-3' : 'py-4'}`} style={{ transition: 'all 0.3s' }}>
        <div className="container nav-container">
          <Link href="/" className="nav-logo">Bobo<span>&Doda</span></Link>
          <div className="nav-links">
            <a href="#how-it-works">{t("nav_how")}</a>
            <a href="#categories">{t("nav_cats")}</a>
          </div>
          <div className="nav-actions">
            <LangSwitch />
            <Link href="/kirish?tab=kirish" className="btn btn-outline">{t("nav_login")}</Link>
            <Link href="/kirish" className="btn btn-primary">{t("nav_start")}</Link>
            <button className="hamburger">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="tag">{t("hero_tag")}</div>
            <h1 dangerouslySetInnerHTML={{ __html: t("hero_h1") }} />
            <p className="hero-subtitle">{t("hero_sub")}</p>
            <div className="hero-actions">
              <Link href="/kirish" className="btn btn-primary">{t("hero_cta1")}</Link>
              <Link href="/kirish?tab=register&role=mutaxassis" className="btn btn-outline">{t("hero_cta2")}</Link>
            </div>
            <div className="hero-trust">
              <div className="trust-item">
                <div className="trust-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                <div className="trust-text">
                  <h4>{t("t_secure")}</h4>
                  <p>{t("t_secure_p")}</p>
                </div>
              </div>
              <div className="trust-item">
                <div className="trust-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                <div className="trust-text">
                  <h4>{t("t_vetted")}</h4>
                  <p>{t("t_vetted_p")}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="float-card top-right">
              <div className="fc-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-dark)' }}>{t("fc_1")}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t("fc_1_sub")}</p>
              </div>
            </div>
            
            <div className="specialist-card">
              <div className="sc-header">
                <div className="sc-avatar" aria-hidden="true" />
                <div className="sc-info">
                  <h3>Aziza T. <svg className="verified-badge" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9z"/></svg></h3>
                  <p>{t("sc_role")}</p>
                </div>
              </div>
              <div className="sc-skills">
                <span className="sc-skill">React</span>
                <span className="sc-skill">Node.js</span>
                <span className="sc-skill">PostgreSQL</span>
              </div>
              <div className="sc-stats">
                <div className="sc-stat-col">
                  <div className="sc-stat-val">✓</div>
                  <div className="sc-stat-lbl">{t("sc_escrow")}</div>
                </div>
                <div className="sc-stat-col">
                  <div className="sc-stat-val">$45/hr</div>
                  <div className="sc-stat-lbl">{t("sc_rate")}</div>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }}>{t("sc_hire")}</button>
            </div>

            <div className="float-card bottom-left">
              <div className="fc-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-dark)' }}>{t("fc_2")}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t("fc_2_sub")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="escrow-section" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <div className="tag">{t("escrow_tag")}</div>
            <h2>{t("escrow_h2")}</h2>
            <p>{t("escrow_sub")}</p>
          </div>
          
          <div className="escrow-grid">
            <div className="escrow-steps">
              <div className="e-step">
                <div className="e-step-icon">1</div>
                <div className="e-step-content">
                  <h3>{t("es1_h")}</h3>
                  <p>{t("es1_p")}</p>
                </div>
              </div>
              <div className="e-step">
                <div className="e-step-icon">2</div>
                <div className="e-step-content">
                  <h3>{t("es2_h")}</h3>
                  <p>{t("es2_p")}</p>
                </div>
              </div>
              <div className="e-step">
                <div className="e-step-icon">3</div>
                <div className="e-step-content">
                  <h3>{t("es3_h")}</h3>
                  <p>{t("es3_p")}</p>
                </div>
              </div>
            </div>
            
            <div className="escrow-visual">
              <div className="ev-lock">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h4>{t("ev_title")}</h4>
              <p>{t("ev_desc")}</p>
              <div className="ev-stats">
                <div className="ev-stat">
                  <h5>$0</h5>
                  <span>{t("ev_s1")}</span>
                </div>
                <div className="ev-stat">
                  <h5>100%</h5>
                  <span>{t("ev_s2")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="categories-section" id="categories">
        <div className="container">
          <div className="section-header">
            <div className="tag">{t("cat_tag")}</div>
            <h2>{t("cat_h2_main")}</h2>
            <p>{t("cat_sub_main")}</p>
          </div>
          
          <div className="cat-grid">
            <div className="cat-card">
              <div className="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div>
              <h3>{t("c_dev")}</h3>
              <p>{t("c_dev_p")}</p>
              <div className="cat-meta">
                <span style={{ color: 'var(--brand-primary)' }}>$15 - $80/hr</span>
              </div>
            </div>
            <div className="cat-card">
              <div className="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7-3-3-7 7v3h3z"/><path d="M18 13l-3-3 2-2 3 3-2 2z"/></svg></div>
              <h3>{t("c_des")}</h3>
              <p>{t("c_des_p")}</p>
              <div className="cat-meta">
                <span style={{ color: 'var(--brand-primary)' }}>$20 - $100/hr</span>
              </div>
            </div>
            <div className="cat-card">
              <div className="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
              <h3>{t("c_wri")}</h3>
              <p>{t("c_wri_p")}</p>
              <div className="cat-meta">
                <span style={{ color: 'var(--brand-primary)' }}>$10 - $50/hr</span>
              </div>
            </div>
            <div className="cat-card">
              <div className="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
              <h3>{t("c_mar")}</h3>
              <p>{t("c_mar_p")}</p>
              <div className="cat-meta">
                <span style={{ color: 'var(--brand-primary)' }}>$15 - $70/hr</span>
              </div>
            </div>
            <div className="cat-card">
              <div className="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
              <h3>{t("c_vid")}</h3>
              <p>{t("c_vid_p")}</p>
              <div className="cat-meta">
                <span style={{ color: 'var(--brand-primary)' }}>$25 - $90/hr</span>
              </div>
            </div>
            <div className="cat-card">
              <div className="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
              <h3>{t("c_biz")}</h3>
              <p>{t("c_biz_p")}</p>
              <div className="cat-meta">
                <span style={{ color: 'var(--brand-primary)' }}>$30 - $150/hr</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="metrics">
        <div className="container m-grid">
          <div className="m-item">
            <div className="m-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
            <p>{t("m_1")}</p>
          </div>
          <div className="m-item">
            <div className="m-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
            <p>{t("m_2")}</p>
          </div>
          <div className="m-item">
            <div className="m-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
            <p>{t("m_3")}</p>
          </div>
          <div className="m-item">
            <div className="m-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg></div>
            <p>{t("m_4")}</p>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <div className="container">
          <div className="section-header">
            <div className="tag" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>{t("test_tag")}</div>
            <h2>{t("test_h2")}</h2>
            <p>{t("test_sub")}</p>
          </div>
          <div className="t-grid">
            <div className="t-card">
              <div className="t-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.9 6.3L22 9l-5 5 1.2 7L12 17.8 5.8 21 7 14 2 9l7.1-.7z"/></svg></div>
              <h3>{t("ea_1_h")}</h3>
              <p>{t("ea_1_p")}</p>
            </div>
            <div className="t-card">
              <div className="t-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <h3>{t("ea_2_h")}</h3>
              <p>{t("ea_2_p")}</p>
            </div>
            <div className="t-card">
              <div className="t-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
              <h3>{t("ea_3_h")}</h3>
              <p>{t("ea_3_p")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-box">
            <h2>{t("cta_ready")}</h2>
            <p>{t("cta_desc")}</p>
            <div className="cta-actions">
              <Link href="/kirish" className="btn btn-primary" style={{ background: 'white', color: 'var(--brand-dark)' }}>{t("cta_btn1")}</Link>
              <Link href="/kirish?tab=register&role=mutaxassis" className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>{t("cta_btn2")}</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="f-grid">
            <div className="f-brand">
              <Link href="/" className="nav-logo">Bobo<span>&Doda</span></Link>
              <p>{t("foot_desc")}</p>
            </div>
            <div className="f-col">
              <h4>{t("f_platform")}</h4>
              <ul>
                <li><Link href="/kirish">{t("f_hire")}</Link></li>
                <li><Link href="/kirish?tab=register">{t("f_work")}</Link></li>
                <li><a href="#how-it-works">{t("f_how")}</a></li>
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
              <h4>{t("f_contact")}</h4>
              <ul>
                <li><a href="mailto:info@bobododa.uz">info@bobododa.uz</a></li>
                <li><a href="#">Telegram Support</a></li>
                <li><a href="#">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="f-bottom">
            <p>© 2026 Bobo&Doda. All rights reserved.</p>
            <div className="lang-switch" style={{ background: 'transparent' }}>
              <LangSwitch />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
