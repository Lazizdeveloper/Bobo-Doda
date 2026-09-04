import type { SellerProfile, Service } from "@/lib/types";

/* Profil to'liqligi — YAGONA MANBA.
 *
 * Ilgari Boshqaruv 4 ta mezon, Sozlamalar esa 8 ta mezon bo'yicha hisoblardi:
 * bitta profil uchun ikki ekran ikki xil foiz ko'rsatardi (masalan 75% va 50%).
 * Endi ikkalasi ham shu ro'yxatdan foydalanadi. */

export interface CompletenessInput {
  fullName: string;
  headline: string;
  bio: string;
  skills: string[];
  languagesCount: number;
  location: string;
  portfolioCount: number;
  activeServicesCount: number;
}

export interface CompletenessItem {
  /** i18n kaliti */
  key: string;
  done: boolean;
  /** Sozlamalar sahifasidagi tab (Boshqaruvdan havola shu tabga olib boradi) */
  tab: string;
  /** Tab o'rniga alohida sahifaga olib boradigan mezonlar uchun */
  href?: string;
}

export function completenessItems(
  input: CompletenessInput
): CompletenessItem[] {
  return [
    { key: "settings.ckName", done: input.fullName.trim().length > 0, tab: "profile" },
    { key: "settings.ckHeadline", done: input.headline.trim().length > 0, tab: "profile" },
    { key: "settings.ckBio", done: input.bio.trim().length >= 50, tab: "profile" },
    { key: "settings.ckSkills", done: input.skills.length >= 3, tab: "languages" },
    { key: "settings.ckLanguages", done: input.languagesCount >= 1, tab: "languages" },
    { key: "settings.ckLocation", done: input.location.trim().length > 0, tab: "profile" },
    { key: "settings.ckPortfolio", done: input.portfolioCount >= 1, tab: "portfolio" },
    {
      key: "settings.ckService",
      done: input.activeServicesCount >= 1,
      tab: "profile",
      href: "/mutaxassis/xizmatlarim/yangi",
    },
  ];
}

export function completenessPercent(items: CompletenessItem[]): number {
  if (!items.length) return 0;
  return Math.round((items.filter((i) => i.done).length / items.length) * 100);
}

/** Boshqaruv uchun qulay yordamchi — profil + faol xizmatlar sonidan hisoblaydi */
export function completenessFromProfile(
  profile: SellerProfile,
  fullName: string,
  services: Service[]
): CompletenessItem[] {
  return completenessItems({
    fullName,
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    skills: profile.skills ?? [],
    languagesCount: profile.languages?.length ?? 0,
    location: profile.location ?? "",
    portfolioCount: profile.portfolio?.length ?? 0,
    activeServicesCount: services.filter((s) => s.status === "active").length,
  });
}
