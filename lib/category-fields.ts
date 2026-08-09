import type { ServiceCategory } from "@/lib/types";

export type FieldType = "select" | "multiselect" | "tags" | "images" | "number";

export interface CategoryField {
  key: string;
  labelKey: string;
  type: FieldType;
  /** i18n kalitlari — select/multiselect variantlari uchun */
  optionKeys?: string[];
  /** tags maydoni placeholder kaliti */
  placeholderKey?: string;
  max?: number;
}

export const CATEGORIES: ServiceCategory[] = [
  "dizayn",
  "dasturlash",
  "tarjima",
  "kontent",
  "marketing",
  "video",
  "audio",
  "biznes",
];

const LANG_OPTIONS = ["opt.uz", "opt.ru", "opt.en"];

export const categoryFields: Record<ServiceCategory, CategoryField[]> = {
  dizayn: [
    { key: "portfolio", labelKey: "field.portfolio", type: "images", max: 5 },
    {
      key: "dizayn_turi",
      labelKey: "field.dizayn_turi",
      type: "select",
      optionKeys: ["opt.logo", "opt.brending", "opt.uiux", "opt.boshqa"],
    },
  ],
  dasturlash: [
    {
      key: "texnologiyalar",
      labelKey: "field.texnologiyalar",
      type: "tags",
      placeholderKey: "field.texnologiyalarPh",
    },
    {
      key: "loyiha_turi",
      labelKey: "field.loyiha_turi",
      type: "select",
      optionKeys: ["opt.vebsayt", "opt.bot", "opt.mobil", "opt.boshqa"],
    },
  ],
  tarjima: [
    { key: "tildan", labelKey: "field.tildan", type: "select", optionKeys: LANG_OPTIONS },
    { key: "tilga", labelKey: "field.tilga", type: "select", optionKeys: LANG_OPTIONS },
    {
      key: "soha",
      labelKey: "field.soha",
      type: "select",
      optionKeys: ["opt.yuridik", "opt.texnik", "opt.umumiy"],
    },
  ],
  kontent: [
    {
      key: "kontent_turi",
      labelKey: "field.kontent_turi",
      type: "select",
      optionKeys: ["opt.maqola", "opt.seo", "opt.post"],
    },
    { key: "til", labelKey: "field.til", type: "multiselect", optionKeys: LANG_OPTIONS },
  ],
  marketing: [
    {
      key: "platforma",
      labelKey: "field.platforma",
      type: "multiselect",
      optionKeys: ["opt.instagram", "opt.telegram", "opt.facebook", "opt.boshqa"],
    },
    {
      key: "xizmat_turi",
      labelKey: "field.xizmat_turi",
      type: "select",
      optionKeys: ["opt.strategiya", "opt.targeting", "opt.boshqarish"],
    },
  ],
  video: [
    {
      key: "format",
      labelKey: "field.format",
      type: "select",
      optionKeys: ["opt.reels", "opt.youtube", "opt.reklama"],
    },
    { key: "davomiylik", labelKey: "field.davomiylik", type: "number" },
  ],
  audio: [
    {
      key: "xizmat_turi",
      labelKey: "field.xizmat_turi",
      type: "select",
      optionKeys: ["opt.ovozlashtirish", "opt.musiqa", "opt.podkast"],
    },
    { key: "til", labelKey: "field.til", type: "select", optionKeys: LANG_OPTIONS },
  ],
  biznes: [
    {
      key: "xizmat_turi",
      labelKey: "field.xizmat_turi",
      type: "select",
      optionKeys: ["opt.hisobot", "opt.prezentatsiya", "opt.tahlil"],
    },
    {
      key: "format",
      labelKey: "field.format",
      type: "select",
      optionKeys: ["opt.pdf", "opt.pptx", "opt.excel"],
    },
  ],
};
