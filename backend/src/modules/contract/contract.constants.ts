/** Bo'lim 37: "reasonable max, sababini izohla" — 20 ta bosqich real fixed-price
 * xizmat uchun ko'p ehtiyotkorlik bilan yetarli (masalan haftalik to'lov
 * jadvali 5 oylik loyihada ham 20 dan oshmaydi); DTO darajasidagi
 * `@ArrayMaxSize(50)` esa faqat payload hajmidan himoya (aniq xato kodi
 * shu chegaradan emas, shu YERDAN keladi). */
export const MAX_MILESTONES = 20;
