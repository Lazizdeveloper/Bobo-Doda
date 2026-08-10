"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { TagInput } from "@/components/ui/TagInput";
import { Select } from "@/components/ui/Select";
import { FileUpload } from "@/components/ui/FileUpload";
import { useToast } from "@/components/ui/Toast";
import { Checkbox } from "@/components/ui/Checkbox";
import { CardManager } from "@/components/shared/cards";
import { AccountControls } from "@/components/shared/AccountControls";
import { AccountSecurity } from "@/components/shared/AccountSecurity";
import { CATEGORIES } from "@/lib/category-fields";
import { authService, paymentsService, usersService } from "@/lib/api";
import type {
  LanguageLevel,
  PaymentCard,
  PortfolioItem,
  ProfileLanguage,
  ServiceCategory,
} from "@/lib/types";
import { useT, type Lang } from "@/lib/i18n";
import { LIMITS } from "@/lib/validate";

const LEVELS: LanguageLevel[] = ["native", "fluent", "intermediate", "basic"];

export default function SozlamalarPage() {
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [languages, setLanguages] = useState<ProfileLanguage[]>([]);
  const [newLangName, setNewLangName] = useState("");
  const [newLangLevel, setNewLangLevel] = useState<LanguageLevel>("native");
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [pfOpen, setPfOpen] = useState(false);
  const [pfTitle, setPfTitle] = useState("");
  const [pfDesc, setPfDesc] = useState("");
  const [pfImage, setPfImage] = useState<string[]>([]);
  const [pfCategory, setPfCategory] = useState<ServiceCategory>(CATEGORIES[0]);
  const [pfError, setPfError] = useState("");
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [available, setAvailable] = useState(true);
  const [errors, setErrors] = useState<{
    fullName?: string;
    bio?: string;
    location?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      usersService.getCurrent(),
      usersService.getSellerProfile(),
      paymentsService.getCards(),
    ])
      .then(([user, profile, cardList]) => {
        if (user) setFullName(user.fullName);
        setHeadline(profile.headline);
        setBio(profile.bio);
        setSkills(profile.skills);
        setLocation(profile.location);
        setLanguages(profile.languages);
        setPortfolio(profile.portfolio);
        setAvailable(profile.available);
        setCards(cardList);
        setLoading(false);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  async function handleAvailability(next: boolean) {
    setAvailable(next);
    await usersService.setAvailability(next);
    toast(t("settings.saved"));
  }

  function addLanguage() {
    const name = newLangName.trim();
    if (!name) return;
    if (languages.some((l) => l.name.toLowerCase() === name.toLowerCase())) return;
    setLanguages([...languages, { name, level: newLangLevel }]);
    setNewLangName("");
    setNewLangLevel("native");
  }

  function removeLanguage(name: string) {
    setLanguages(languages.filter((l) => l.name !== name));
  }

  function openPortfolioModal() {
    setPfTitle("");
    setPfDesc("");
    setPfImage([]);
    setPfCategory(CATEGORIES[0]);
    setPfError("");
    setPfOpen(true);
  }

  function addPortfolioItem() {
    if (!pfTitle.trim() || !pfImage.length) {
      setPfError(t("settings.pfError"));
      return;
    }
    setPortfolio([
      ...portfolio,
      {
        id: `pf-${Date.now()}`,
        title: pfTitle.trim(),
        description: pfDesc.trim(),
        image: pfImage[0],
        category: pfCategory,
      },
    ]);
    setPfOpen(false);
  }

  function removePortfolioItem(id: string) {
    setPortfolio(portfolio.filter((item) => item.id !== id));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!fullName.trim()) next.fullName = t("onboard.errName");
    if (bio.trim().length < 20) next.bio = t("onboard.errBio");
    if (bio.trim().length > LIMITS.bio) next.bio = t("onboard.errBioLong");
    if (!location.trim()) next.location = t("onboard.errLocation");
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await usersService.updateSellerProfile({
        fullName: fullName.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
        skills,
        location: location.trim(),
        languages,
        portfolio,
      });
      toast(t("settings.saved"));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    authService.logout();
    router.push("/kirish");
  }

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;
  if (loading) return <SkeletonCard />;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-heading text-2xl font-extrabold text-ink">
        {t("settings.title")}
      </h1>

      {/* Tezkor havolalar — Profil/Verifikatsiya/Yordam TopNav'da yo'q */}
      <Card padding="lg">
        <h2 className="font-heading text-base font-bold text-ink">
          {t("settings.quickLinks")}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { href: "/mutaxassis/profil", label: t("nav.profile") },
            { href: "/mutaxassis/verifikatsiya", label: t("nav.verification") },
            { href: "/mutaxassis/yordam", label: t("nav.help") },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex h-9 items-center gap-2 rounded-btn border border-field bg-card px-3.5 text-xs font-medium text-ink shadow-card transition-colors duration-150 hover:border-primary hover:bg-card-hover"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </Card>

      {/* Profil ma'lumotlari */}
      <Card padding="lg">
        <h2 className="font-heading text-base font-bold text-ink">
          {t("settings.profileSection")}
        </h2>
        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4" noValidate>
          <Input
            label={t("onboard.fullName")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.fullName}
          />
          <Input
            label={t("settings.headlineLabel")}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder={t("settings.headlinePh")}
          />
          <div>
            <Textarea
              label={t("onboard.bio")}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              error={errors.bio}
              maxLength={LIMITS.bio}
            />
            <p
              className={`mt-1 text-2xs ${
                bio.trim().length >= 50 ? "text-success" : "text-faint"
              }`}
            >
              {t("settings.bioHint")} · {bio.length}/{LIMITS.bio}
            </p>
          </div>
          <TagInput
            label={t("onboard.skills")}
            value={skills}
            onChange={setSkills}
            placeholder={t("onboard.skillsPh")}
          />
          <Input
            label={t("onboard.location")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("onboard.locationPh")}
            error={errors.location}
          />

          {/* Tillar */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted">
              {t("profile.languages")}
            </span>
            {languages.length > 0 && (
              <ul className="flex flex-col gap-2">
                {languages.map((lng) => (
                  <li
                    key={lng.name}
                    className="flex items-center justify-between gap-3 rounded-input border border-line bg-card px-3 py-2 text-sm"
                  >
                    <span className="text-ink">
                      {lng.name}{" "}
                      <span className="text-muted">· {t(`lang.${lng.level}`)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLanguage(lng.name)}
                      aria-label={t("common.delete")}
                      className="text-faint transition-colors duration-150 hover:text-danger"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={newLangName}
                onChange={(e) => setNewLangName(e.target.value)}
                placeholder={t("settings.langNamePh")}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLanguage();
                  }
                }}
              />
              <Select
                value={newLangLevel}
                onChange={(e) => setNewLangLevel(e.target.value as LanguageLevel)}
                options={LEVELS.map((lvl) => ({
                  value: lvl,
                  label: t(`lang.${lvl}`),
                }))}
                className="sm:w-40"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addLanguage}
                className="sm:w-auto"
              >
                {t("settings.addLang")}
              </Button>
            </div>
          </div>

          {/* Portfolio — bajarilgan ishlar */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted">
              {t("profile.portfolio")}
            </span>
            <p className="text-2xs text-faint">{t("settings.portfolioHint")}</p>
            <div className="mt-1 grid gap-3 sm:grid-cols-2">
              {portfolio.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-input border border-line bg-card p-2.5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-14 w-14 shrink-0 rounded-input border border-line object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-ink">
                      {item.title}
                    </p>
                    {item.category && (
                      <p className="mt-0.5 text-2xs text-faint">
                        {t(`cat.${item.category}`)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePortfolioItem(item.id)}
                    aria-label={t("common.delete")}
                    className="shrink-0 self-start text-faint transition-colors duration-150 hover:text-danger"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={openPortfolioModal}
                className="flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-input border border-dashed border-line bg-card text-muted transition-colors duration-150 hover:border-primary hover:text-ink"
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-2xs">{t("settings.addWork")}</span>
              </button>
            </div>
          </div>

          <Button type="submit" loading={saving} className="self-start">
            {t("common.save")}
          </Button>
        </form>
      </Card>

      {/* Til */}
      <Card padding="lg">
        <h2 className="font-heading text-base font-bold text-ink">
          {t("settings.langSection")}
        </h2>
        <p className="mt-1 text-xs text-muted">{t("settings.langHint")}</p>
        <div className="mt-4">
          <RadioGroup
            options={[
              { value: "uz", label: "O'zbekcha" },
              { value: "ru", label: "Русский" },
              { value: "en", label: "English" },
            ]}
            value={lang}
            onChange={(value) => setLang(value as Lang)}
          />
        </div>
      </Card>

      {/* Ish holati */}
      <Card padding="lg">
        <h2 className="font-heading text-base font-bold text-ink">
          {t("settings.availSection")}
        </h2>
        <p className="mt-1 text-xs text-muted">{t("settings.availHint")}</p>
        <div className="mt-4">
          <Checkbox
            label={t("settings.availLabel")}
            checked={available}
            onChange={(e) => handleAvailability(e.target.checked)}
          />
        </div>
      </Card>

      {/* Kartalarim (Uzcard / Humo) — daromadni yechish uchun */}
      <Card padding="lg">
        <h2 className="font-heading text-base font-bold text-ink">
          {t("card.section")}
        </h2>
        <p className="mt-1 text-xs text-muted">{t("card.sectionHint")}</p>
        <div className="mt-4">
          <CardManager cards={cards} onChange={setCards} />
        </div>
      </Card>

      <AccountSecurity />
      <AccountControls />

      {/* Hisob */}
      <Card padding="lg">
        <h2 className="font-heading text-base font-bold text-ink">
          {t("settings.accountSection")}
        </h2>
        <Button
          variant="danger"
          className="mt-4"
          onClick={() => setLogoutOpen(true)}
        >
          {t("common.logout")}
        </Button>
      </Card>

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

      {/* Portfolio ish qo'shish */}
      <Modal
        open={pfOpen}
        onClose={() => setPfOpen(false)}
        title={t("settings.addWork")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPfOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={addPortfolioItem}>{t("settings.addLang")}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label={t("settings.pfTitle")}
            value={pfTitle}
            onChange={(e) => setPfTitle(e.target.value)}
            placeholder={t("settings.pfTitlePh")}
          />
          <Textarea
            label={t("settings.pfDesc")}
            value={pfDesc}
            onChange={(e) => setPfDesc(e.target.value)}
            placeholder={t("settings.pfDescPh")}
          />
          <Select
            label={t("settings.pfCategory")}
            value={pfCategory}
            onChange={(e) => setPfCategory(e.target.value as ServiceCategory)}
            options={CATEGORIES.map((cat) => ({
              value: cat,
              label: t(`cat.${cat}`),
            }))}
          />
          <FileUpload
            label={t("settings.pfImage")}
            value={pfImage}
            onChange={setPfImage}
            max={1}
          />
          {pfError && (
            <p className="text-2xs text-danger" role="alert">
              {pfError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
