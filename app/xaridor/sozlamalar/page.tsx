"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LocationPicker } from "@/components/ui/LocationPicker";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CardManager } from "@/components/shared/cards";
import { AccountSecurity } from "@/components/shared/AccountSecurity";
import { authService, paymentsService, usersService } from "@/lib/api";
import type { AccountPreferences, PaymentCard, User } from "@/lib/types";
import { useT, type Lang } from "@/lib/i18n";
import { initials } from "@/lib/format";

type SettingsTab =
  | "profile"
  | "billing"
  | "security"
  | "notifications"
  | "preferences"
  | "account";

const DEFAULT_PREFERENCES: AccountPreferences = {
  messages: true,
  contracts: true,
  payments: true,
  marketing: false,
  proposals: true,
};

export default function XaridorSozlamalarPage() {
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("it");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [nameError, setNameError] = useState("");

  // Billing state
  const [cards, setCards] = useState<PaymentCard[]>([]);

  // Security connected accounts
  const [googleConnected, setGoogleConnected] = useState(true);
  const [telegramConnected, setTelegramConnected] = useState(false);

  // Notifications state
  const [preferences, setPreferences] = useState<AccountPreferences>(DEFAULT_PREFERENCES);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Preferences (Currency)
  const [currency, setCurrency] = useState<"UZS" | "USD">("UZS");

  // Account state
  const [exporting, setExporting] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // General lifecycle
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      usersService.getCurrent(),
      paymentsService.getCards(),
      usersService.getPreferences().catch(() => DEFAULT_PREFERENCES),
    ])
      .then(([user, cardList, prefs]) => {
        if (user) {
          setCurrentUser(user);
          setFullName(user.fullName || "");
          setPhone(user.phone || "");
          setCompanyName(user.companyName || "");
          setIndustry(user.industry || "it");
          setWebsite(user.website || "");
          setLocation(user.location || "");
          setBio(user.bio || "");
          setAvatarUrl(user.avatarUrl || "");
          setGoogleConnected(user.googleConnected ?? true);
          setTelegramConnected(user.telegramConnected ?? false);
        }
        setCards(cardList || []);
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...prefs,
        });
        setLoading(false);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  // Support ?tab= query parameter from other pages
  useEffect(() => {
    if (typeof window === "undefined") return;
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    const validTabs: SettingsTab[] = [
      "profile",
      "billing",
      "security",
      "notifications",
      "preferences",
      "account",
    ];
    if (tabParam && validTabs.includes(tabParam as SettingsTab)) {
      setActiveTab(tabParam as SettingsTab);
    }
  }, []);

  // Avatar upload handler (under 2MB, png/jpeg/webp)
  function handleAvatarChange(files: FileList | null) {
    if (!files || !files[0]) return;
    setAvatarError("");
    const file = files[0];
    const maxBytes = 2 * 1024 * 1024;
    const validTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!validTypes.includes(file.type)) {
      setAvatarError(t("upload.rejected"));
      return;
    }
    if (file.size > maxBytes) {
      setAvatarError(t("upload.rejected"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Profile save
  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setNameError(t("onboard.errName"));
      return;
    }
    setSavingProfile(true);
    try {
      await usersService.updateUserProfile({
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        industry,
        website: website.trim(),
        location: location.trim(),
        bio: bio.trim(),
        avatarUrl,
        googleConnected,
        telegramConnected,
      });
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              fullName: fullName.trim(),
              companyName: companyName.trim(),
              industry,
              website: website.trim(),
              location: location.trim(),
              bio: bio.trim(),
              avatarUrl,
              googleConnected,
              telegramConnected,
            }
          : null
      );
      toast(t("bset.savedSuccess"));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSavingProfile(false);
    }
  }

  // Connected accounts toggle
  async function toggleGoogle() {
    const nextState = !googleConnected;
    setGoogleConnected(nextState);
    try {
      await usersService.updateUserProfile({ googleConnected: nextState });
      toast(nextState ? "Google akkaunti ulandi" : "Google akkaunti uzildi");
    } catch {
      setGoogleConnected(!nextState);
      toast(t("common.error"), "error");
    }
  }

  async function toggleTelegram() {
    const nextState = !telegramConnected;
    setTelegramConnected(nextState);
    try {
      await usersService.updateUserProfile({
        telegramConnected: nextState,
        telegramUsername: nextState ? "@employer_demo" : undefined,
      });
      toast(nextState ? "Telegram akkaunti ulandi" : "Telegram akkaunti uzildi");
    } catch {
      setTelegramConnected(!nextState);
      toast(t("common.error"), "error");
    }
  }

  // Save Notifications
  async function handleSaveNotifications() {
    setSavingPreferences(true);
    try {
      await usersService.savePreferences(preferences);
      toast(t("bset.savedSuccess"));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSavingPreferences(false);
    }
  }

  // Export Data
  async function handleExportData() {
    setExporting(true);
    try {
      const data = await usersService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `bobododa-xaridor-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast(t("privacy.exported"));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setExporting(false);
    }
  }

  // Delete Account
  async function handleDeleteAccount() {
    if (deleteText !== t("privacy.deleteWord")) return;
    setDeleting(true);
    try {
      await usersService.deleteAccount();
      router.replace("/kirish");
    } catch (error) {
      toast(
        error instanceof Error && error.message === "ACTIVE_CONTRACTS"
          ? t("privacy.activeContracts")
          : t("common.error"),
        "error"
      );
      setDeleting(false);
    }
  }

  function handleLogout() {
    authService.logout();
    router.push("/kirish");
  }

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;
  if (loading) return <SkeletonCard />;

  const industryOptions = [
    { value: "it", label: "IT & Dasturlash (Web, Mobile, AI)" },
    { value: "design", label: "Dizayn & Media (UI/UX, Grafik, 3D)" },
    { value: "marketing", label: "Marketing, SMM & Reklama" },
    { value: "education", label: "Ta'lim, Kurslar & Ilm-fan" },
    { value: "ecommerce", label: "E-tijorat & Chakana savdo" },
    { value: "services", label: "Xizmatlar & Ishlab chiqarish" },
    { value: "finance", label: "Moliya, Huquq & Konsalting" },
    { value: "other", label: "Boshqa faoliyat sohasi" },
  ];

  const navTabs: {
    id: SettingsTab;
    label: string;
    description: string;
    icon: string;
    badge?: number | string;
  }[] = [
    {
      id: "profile",
      label: t("bset.tabProfile"),
      description: "Kompaniya va shaxsiy ma'lumotlar",
      icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    },
    {
      id: "billing",
      label: t("bset.tabBilling"),
      description: "Kartalar, balans va invoyslar",
      badge: cards.length > 0 ? cards.length : undefined,
      icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    },
    {
      id: "security",
      label: t("bset.tabSecurity"),
      description: "Parol, Google va Telegram",
      icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    },
    {
      id: "notifications",
      label: t("bset.tabNotifications"),
      description: "Loyiha va chat bildirishnomalari",
      icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    },
    {
      id: "preferences",
      label: t("bset.tabPreferences"),
      description: "Interfeys tili va valyuta",
      icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
    },
    {
      id: "account",
      label: t("bset.tabAccount"),
      description: "Ma'lumotlar eksporti va chiqish",
      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <BackButton href="/xaridor" label={t("nav.dashboard")} />
      </div>
      {/* Top Header Card with Quick Stats & Badges */}
      <div className="rounded-2xl border border-line/60 bg-gradient-to-r from-card via-card to-surface p-5 sm:p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-primary/20 bg-primary/5 text-primary-deep shadow-sm">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={companyName || fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-heading text-xl font-black">
                  {initials(companyName || fullName || "IB")}
                </span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-xl font-extrabold text-ink sm:text-2xl">
                  {companyName || fullName || t("settings.title")}
                </h1>
                {currentUser?.verified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M13.5 4.5l-7 7L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t("bset.verifiedEmployer")}
                  </span>
                ) : (
                  <Link
                    href="/xaridor/verifikatsiya"
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-500/20 hover:bg-amber-500/15 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M8 5v3m0 3h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    Verifikatsiyadan o&apos;tish
                  </Link>
                )}
              </div>
              <p className="mt-1 text-xs text-muted sm:text-sm">
                {fullName} {phone ? `· ${phone}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/xaridor/xarajatlar"
              className="inline-flex h-9 items-center gap-2 rounded-btn border border-line bg-card px-3.5 text-xs font-medium text-ink shadow-card transition-colors hover:border-primary hover:bg-card-hover"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 3h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" />
                <path d="M2 7h12M5 10h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {t("bset.viewInvoices")}
            </Link>
            <Link
              href="/xaridor/verifikatsiya"
              className="inline-flex h-9 items-center gap-2 rounded-btn border border-line bg-card px-3.5 text-xs font-medium text-ink shadow-card transition-colors hover:border-primary hover:bg-card-hover"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1.5 13.5 4v3.6c0 3.3-2.3 6.1-5.5 6.9-3.2-.8-5.5-3.6-5.5-6.9V4L8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="m6 8 1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("nav.verification")}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none lg:hidden">
        {navTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-btn px-4 py-2.5 text-xs font-medium transition-all ${
                active
                  ? "bg-primary text-on-primary shadow-sm ring-2 ring-primary/30"
                  : "border border-line bg-card text-muted hover:text-ink"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={tab.icon} />
              </svg>
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    active ? "bg-white/20 text-on-primary" : "bg-primary/10 text-primary-deep"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid items-start gap-8 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr]">
        {/* Left Sidebar Column */}
        <aside className="hidden flex-col gap-5 lg:sticky lg:top-24 lg:flex">
          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 rounded-2xl border border-line/70 bg-card p-2 shadow-card" aria-label="Sozlamalar bo'limlari">
            {navTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left transition-all ${
                    active
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                        active ? "text-on-primary" : "text-muted group-hover:text-ink"
                      }`}
                      aria-hidden="true"
                    >
                      <path d={tab.icon} />
                    </svg>
                    <div className="truncate">
                      <p className="text-sm font-semibold leading-snug">{tab.label}</p>
                      <p
                        className={`truncate text-2xs ${
                          active ? "text-white/80" : "text-faint"
                        }`}
                      >
                        {tab.description}
                      </p>
                    </div>
                  </div>

                  {tab.badge && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-semibold ${
                        active
                          ? "bg-white/25 text-on-primary"
                          : "bg-primary/10 text-primary-deep"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Escrow Guarantee Highlight Widget */}
          <Card padding="md" className="border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Escrow Kafolati
                </h3>
                <p className="mt-1 text-2xs leading-relaxed text-muted">
                  Barcha mablag&apos;lar Escrow tizimida xavfsiz saqlanadi. Ish qabul qilinmaguncha to&apos;lov chiqarilmaydi.
                </p>
              </div>
            </div>
          </Card>

          {/* Verification Widget */}
          {!currentUser?.verified && (
            <Card padding="md" className="border-amber-500/25 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-amber-900">
                    Ishonch nishonini oling
                  </h3>
                  <p className="mt-1 text-2xs text-muted">
                    Kompaniyangizni tasdiqlang va mutaxassislardan 3 barobar ko&apos;p taklif oling.
                  </p>
                  <Link
                    href="/xaridor/verifikatsiya"
                    className="mt-2.5 inline-flex items-center gap-1 text-2xs font-semibold text-amber-700 hover:text-amber-800"
                  >
                    Hozir tasdiqlash →
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </aside>

        {/* Right Content Column */}
        <main className="min-w-0 flex flex-col gap-6">
          {/* TAB 1: COMPANY & PROFILE */}
          {activeTab === "profile" && (
            <Card padding="lg">
              <div className="border-b border-line/60 pb-4 mb-6">
                <h2 className="font-heading text-lg font-bold text-ink">
                  {t("bset.profileSection")}
                </h2>
                <p className="text-xs text-muted mt-1">
                  {t("bset.profileHint")}
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-6" noValidate>
                {/* Logo / Avatar Upload section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl border border-line/70 bg-surface/50">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-line bg-card shadow-sm">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={companyName || fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-heading text-2xl font-black text-primary-deep">
                        {initials(companyName || fullName || "K")}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-ink">
                      {t("bset.avatarUpload")}
                    </label>
                    <p className="text-2xs text-muted">
                      {t("bset.avatarHint")}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2.5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {t("bset.changeAvatar")}
                      </Button>
                      {avatarUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger/10 hover:text-danger"
                          onClick={() => setAvatarUrl("")}
                        >
                          {t("bset.removeAvatar")}
                        </Button>
                      )}
                    </div>
                    {avatarError && (
                      <p className="text-2xs text-danger mt-1" role="alert">
                        {avatarError}
                      </p>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      onChange={(e) => handleAvatarChange(e.target.files)}
                    />
                  </div>
                </div>

                {/* Form fields grid */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    label={t("bset.companyName")}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={t("bset.companyNamePh")}
                  />

                  <Select
                    label={t("bset.industry")}
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    options={industryOptions}
                  />

                  <Input
                    label={t("bset.representative")}
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setNameError("");
                    }}
                    error={nameError}
                    required
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted">
                      {t("bset.phoneVerified")}
                    </label>
                    <div className="relative">
                      <Input
                        value={phone}
                        disabled
                        readOnly
                        className="bg-surface/70 cursor-not-allowed pl-9 font-mono text-xs"
                      />
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                        aria-hidden="true"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                  </div>

                  <Input
                    label={t("bset.website")}
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.uz yoki @username"
                  />

                  <LocationPicker
                    label={t("bset.location")}
                    value={location}
                    onChange={setLocation}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Textarea
                    label={t("bset.bio")}
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 500))}
                    placeholder={t("bset.bioPh")}
                    rows={4}
                  />
                  <div className="flex justify-between text-2xs text-faint">
                    <span>Mutaxassislar e&apos;loningizga taklif yuborayotganda ko&apos;rishadi</span>
                    <span>{bio.length}/500</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-line/60">
                  <Button type="submit" loading={savingProfile} className="px-8">
                    {t("common.save")}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 2: BILLING & FINANCES */}
          {activeTab === "billing" && (
            <div className="flex flex-col gap-6">
              {/* Escrow Guarantee Banner */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-card">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-primary-deep">
                      {t("bset.escrowSecurityTitle")}
                    </span>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {t("bset.escrowSecurityDesc")}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3 pt-4 border-t border-line/60">
                      <div className="flex items-center gap-2 text-xs font-medium text-ink">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">✓</span>
                        Bosqichma-bosqich to&apos;lov
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-ink">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">✓</span>
                        100% qaytarish kafolati
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-ink">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">✓</span>
                        Rasmiy invoys va cheklar
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards Management */}
              <Card padding="lg">
                <div className="border-b border-line/60 pb-4 mb-6">
                  <h2 className="font-heading text-lg font-bold text-ink">
                    {t("bset.billingSection")}
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    {t("bset.billingHint")}
                  </p>
                </div>

                <CardManager cards={cards} onChange={setCards} />
              </Card>

              {/* Invoices and Expense history link */}
              <Card padding="lg" className="bg-surface/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-base font-bold text-ink">
                      {t("bset.viewInvoices")}
                    </h3>
                    <p className="text-xs text-muted mt-1">
                      Barcha to&apos;langan shartnomalar, depozitlar va yuklab olinadigan invoyslar tarixi.
                    </p>
                  </div>
                  <Link
                    href="/xaridor/xarajatlar"
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-btn bg-primary px-5 text-xs font-medium text-on-primary shadow-btn hover:bg-primary-hover transition-colors"
                  >
                    <span>Invoyslarni ko&apos;rish</span>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: SECURITY & LOGINS */}
          {activeTab === "security" && (
            <div className="flex flex-col gap-6">
              {/* Identity & Verification Card */}
              <Card padding="lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary-deep">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-base font-bold text-ink">
                          {t("nav.verification")}
                        </h3>
                        {currentUser?.verified ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-2xs font-semibold text-emerald-700">
                            Tasdiqlangan
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-2xs font-semibold text-amber-800">
                            Tasdiqlanmagan
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted max-w-lg">
                        {t("bset.verificationHint")}
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/xaridor/verifikatsiya"
                    className="inline-flex h-9 shrink-0 items-center rounded-btn border border-line bg-card px-4 text-xs font-medium text-ink shadow-card transition-colors hover:border-primary hover:bg-card-hover"
                  >
                    {t("bset.verificationOpen")}
                  </Link>
                </div>
              </Card>

              {/* Connected Accounts Card */}
              <Card padding="lg">
                <div className="border-b border-line/60 pb-4 mb-6">
                  <h2 className="font-heading text-base font-bold text-ink">
                    {t("bset.connectedAccounts")}
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    {t("bset.connectedHint")}
                  </p>
                </div>

                <div className="flex flex-col divide-y divide-line/60">
                  {/* Google Row */}
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-line shadow-sm">
                        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink">Google</p>
                          <span
                            className={`rounded-full px-2 py-0.2 text-[10px] font-semibold ${
                              googleConnected
                                ? "bg-emerald-500/15 text-emerald-700"
                                : "bg-surface text-muted"
                            }`}
                          >
                            {googleConnected ? t("bset.connected") : t("bset.notConnected")}
                          </span>
                        </div>
                        <p className="text-2xs text-muted">
                          {googleConnected
                            ? "Tezkor kirish va parolni xavfsiz tiklash uchun faol"
                            : "Parolni unutganda Google orqali tezkor tiklash"}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant={googleConnected ? "ghost" : "secondary"}
                      size="sm"
                      onClick={toggleGoogle}
                    >
                      {googleConnected ? t("bset.disconnect") : t("bset.connect")}
                    </Button>
                  </div>

                  {/* Telegram Row */}
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#229ED9]/10 text-[#229ED9] border border-[#229ED9]/20 shadow-sm">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink">Telegram</p>
                          <span
                            className={`rounded-full px-2 py-0.2 text-[10px] font-semibold ${
                              telegramConnected
                                ? "bg-emerald-500/15 text-emerald-700"
                                : "bg-surface text-muted"
                            }`}
                          >
                            {telegramConnected ? t("bset.connected") : t("bset.notConnected")}
                          </span>
                        </div>
                        <p className="text-2xs text-muted">
                          {telegramConnected
                            ? "Telegram bot orqali bildirishnomalar va tasdiqlash yoqilgan"
                            : "Loyiha yangilanishlarini Telegram botda qabul qilish"}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant={telegramConnected ? "ghost" : "secondary"}
                      size="sm"
                      onClick={toggleTelegram}
                    >
                      {telegramConnected ? t("bset.disconnect") : t("bset.connect")}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Password Change */}
              <AccountSecurity />
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <Card padding="lg">
              <div className="border-b border-line/60 pb-4 mb-6">
                <h2 className="font-heading text-lg font-bold text-ink">
                  {t("bset.notifSection")}
                </h2>
                <p className="text-xs text-muted mt-1">
                  {t("bset.notifHint")}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="p-3.5 rounded-xl border border-line/70 bg-card hover:bg-surface/50 transition-colors">
                  <Checkbox
                    id="ntf-proposals"
                    label={t("bset.ntfProposals")}
                    checked={preferences.proposals ?? true}
                    onChange={(e) =>
                      setPreferences((p) => ({ ...p, proposals: e.target.checked }))
                    }
                  />
                  <p className="ml-6 mt-1 text-2xs text-muted">
                    E&apos;loningizga yangi frilanser taklif yuborganda bir zumda xabar olasiz.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-line/70 bg-card hover:bg-surface/50 transition-colors">
                  <Checkbox
                    id="ntf-milestones"
                    label={t("bset.ntfMilestones")}
                    checked={preferences.contracts}
                    onChange={(e) =>
                      setPreferences((p) => ({ ...p, contracts: e.target.checked }))
                    }
                  />
                  <p className="ml-6 mt-1 text-2xs text-muted">
                    Mutaxassis ish topshirganda yoki bosqichni tekshiruvga yuborganda bildirishnoma keladi.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-line/70 bg-card hover:bg-surface/50 transition-colors">
                  <Checkbox
                    id="ntf-messages"
                    label={t("bset.ntfMessages")}
                    checked={preferences.messages}
                    onChange={(e) =>
                      setPreferences((p) => ({ ...p, messages: e.target.checked }))
                    }
                  />
                  <p className="ml-6 mt-1 text-2xs text-muted">
                    Frilanserlar va xizmat ko&apos;rsatuvchilar tomonidan yuborilgan yangi chat xabarlari.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-line/70 bg-card hover:bg-surface/50 transition-colors">
                  <Checkbox
                    id="ntf-payments"
                    label={t("bset.ntfPayments")}
                    checked={preferences.payments}
                    onChange={(e) =>
                      setPreferences((p) => ({ ...p, payments: e.target.checked }))
                    }
                  />
                  <p className="ml-6 mt-1 text-2xs text-muted">
                    Escrow to&apos;lov muzlatilishi, mablag&apos; yechilishi va cheklar haqida ogohlantirishlar.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-line/70 bg-card hover:bg-surface/50 transition-colors">
                  <Checkbox
                    id="ntf-marketing"
                    label={t("bset.ntfMarketing")}
                    checked={preferences.marketing}
                    onChange={(e) =>
                      setPreferences((p) => ({ ...p, marketing: e.target.checked }))
                    }
                  />
                  <p className="ml-6 mt-1 text-2xs text-muted">
                    Bobo-Doda platformasidagi yangiliklar, chegirmalar va tavsiyalar.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-line/60 pt-4">
                <Button
                  onClick={handleSaveNotifications}
                  loading={savingPreferences}
                  className="px-8"
                >
                  {t("common.save")}
                </Button>
              </div>
            </Card>
          )}

          {/* TAB 5: PREFERENCES (LANG & CURRENCY) */}
          {activeTab === "preferences" && (
            <div className="flex flex-col gap-6">
              {/* Interface Language */}
              <Card padding="lg">
                <div className="border-b border-line/60 pb-4 mb-6">
                  <h2 className="font-heading text-lg font-bold text-ink">
                    {t("settings.langSection")}
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    {t("bset.prefsHint")}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { id: "uz", name: "O'zbekcha", desc: "Lotin yozuvida" },
                    { id: "ru", name: "Русский", desc: "На русском языке" },
                    { id: "en", name: "English", desc: "International English" },
                  ].map((item) => {
                    const isSelected = lang === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLang(item.id as Lang)}
                        className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-line/70 bg-card hover:border-line hover:bg-surface"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="font-heading text-sm font-bold text-ink">
                            {item.name}
                          </span>
                          {isSelected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary text-2xs">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-2xs text-muted mt-1">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Currency Display */}
              <Card padding="lg">
                <div className="border-b border-line/60 pb-4 mb-6">
                  <h2 className="font-heading text-lg font-bold text-ink">
                    {t("bset.currencySection")}
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    {t("bset.currencyHint")}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
                  <button
                    type="button"
                    onClick={() => setCurrency("UZS")}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      currency === "UZS"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-line/70 bg-card hover:border-line"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-primary-deep bg-primary/10 px-2 py-1 rounded">
                        UZS
                      </span>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-ink">O&apos;zbekiston so&apos;mi</p>
                        <p className="text-2xs text-muted">Asosiy milliy valyuta</p>
                      </div>
                    </div>
                    {currency === "UZS" && <span className="text-primary font-bold">✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrency("USD")}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      currency === "USD"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-line/70 bg-card hover:border-line"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-primary-deep bg-primary/10 px-2 py-1 rounded">
                        USD
                      </span>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-ink">AQSH Dollari ($)</p>
                        <p className="text-2xs text-muted">Xalqaro hisob-kitoblar</p>
                      </div>
                    </div>
                    {currency === "USD" && <span className="text-primary font-bold">✓</span>}
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 6: ACCOUNT MANAGEMENT */}
          {activeTab === "account" && (
            <div className="flex flex-col gap-6">
              {/* Data Export */}
              <Card padding="lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-base font-bold text-ink">
                      {t("privacy.dataTitle")}
                    </h2>
                    <p className="text-xs text-muted mt-1 max-w-lg">
                      {t("bset.exportHint")}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    loading={exporting}
                    onClick={handleExportData}
                    className="shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mr-2">
                      <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t("privacy.export")}
                  </Button>
                </div>
              </Card>

              {/* Logout Card */}
              <Card padding="lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-base font-bold text-ink">
                      {t("settings.logoutTitle")}
                    </h2>
                    <p className="text-xs text-muted mt-1">
                      {t("bset.dangerZoneHint")}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setLogoutOpen(true)}
                    className="shrink-0 text-danger hover:bg-danger/10 hover:text-danger hover:border-danger/30"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2" aria-hidden="true">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    {t("common.logout")}
                  </Button>
                </div>
              </Card>

              {/* Danger Zone: Account Deletion */}
              <Card padding="lg" className="border-danger/25 bg-danger/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-base font-bold text-danger-deep">
                      {t("bset.dangerSection")}
                    </h2>
                    <p className="text-xs text-muted mt-1 max-w-lg">
                      {t("bset.deleteHint")}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => setDeleteOpen(true)}
                    className="shrink-0"
                  >
                    {t("privacy.delete")}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={logoutOpen}
        title={t("settings.logoutTitle")}
        description={t("settings.logoutDesc")}
        confirmLabel={t("common.logout")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
      />

      {/* Delete Account Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("privacy.deleteTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={deleteText !== t("privacy.deleteWord")}
              onClick={handleDeleteAccount}
            >
              {t("privacy.delete")}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-xs text-muted leading-relaxed">
          {t("privacy.deleteDesc")}
        </p>
        <Input
          label={t("privacy.deleteConfirmLabel").replace(
            "{word}",
            t("privacy.deleteWord")
          )}
          value={deleteText}
          onChange={(event) => setDeleteText(event.target.value)}
          placeholder={t("privacy.deleteWord")}
        />
      </Modal>
    </div>
  );
}
