const ADMIN_HOST = "admin.bobododa.uz";
const ADMIN_PREFIX = "/admin";

/**
 * Admin panel ichki fayllari `app/admin/*` da qoladi. Lokal dev/xom Railway
 * domenida bu prefiks browser URL'ida ko'rinadi (`/admin/kirish`) — bevosita
 * fayl yo'liga to'g'ri keladi. Kanonik `admin.bobododa.uz`da repo ildizidagi
 * `proxy.ts` uni striplaydi: browser `/kirish` ko'radi va `usePathname()`
 * ham SHUNI qaytaradi (Next.js client hook har doim ko'rinadigan URL'ni
 * o'qiydi, ichki rewrite manbasini emas). Quyidagi ikkita funksiya joriy
 * `pathname`dan kelib chiqib to'g'ri yo'l qiyoslash/yasashni ta'minlaydi —
 * faqat `/admin/**` daraxti ichida (masalan `AdminLayout`) ishlatiladi,
 * chunki faqat o'sha yerda pathname ikkala holatni ham bir xil ishonchli
 * aks ettiradi.
 */
export function toLogicalAdminPath(pathname: string): string {
  if (pathname === ADMIN_PREFIX) return "/";
  if (pathname.startsWith(`${ADMIN_PREFIX}/`)) return pathname.slice(ADMIN_PREFIX.length);
  return pathname;
}

export function adminHref(logicalPath: string, currentPathname: string): string {
  const prefixed = currentPathname === ADMIN_PREFIX || currentPathname.startsWith(`${ADMIN_PREFIX}/`);
  if (!prefixed) return logicalPath;
  return logicalPath === "/" ? ADMIN_PREFIX : `${ADMIN_PREFIX}${logicalPath}`;
}

/**
 * FAQAT effect/event-handler ichida chaqiriladi (masalan allaqachon
 * autentifikatsiyadan o'tgan foydalanuvchini boshqaruv paneliga
 * yo'naltirishda) — render vaqtida EMAS. `/rahbariyat/kirish` sahifasi
 * `/admin/**` daraxtidan tashqarida (uning pathname'i hech qachon `/admin`
 * bilan boshlanmaydi), shuning uchun yuqoridagi pathname-asoslangan usul
 * u yerda ishlamaydi; host tekshiruvi esa faqat mount bo'lgandan keyin
 * (useEffect) xavfsiz — SSR/hydration bilan to'qnashmaydi.
 */
export function adminAbsoluteHref(logicalPath: string): string {
  const onAdminHost = typeof window !== "undefined" && window.location.hostname === ADMIN_HOST;
  if (onAdminHost) return logicalPath;
  return logicalPath === "/" ? ADMIN_PREFIX : `${ADMIN_PREFIX}${logicalPath}`;
}

export function adminDashboardHref(): string {
  return adminAbsoluteHref("/");
}

/**
 * `admin.bobododa.uz` kanonik hostidami — degani. Ildiz layout'da (har
 * qanday sahifada, faqat `/admin/**` ichida emas) ishlaydigan
 * komponentlar uchun (`SupportModalProvider`, `PageFeedbackWidget`):
 * ular uchun pathname prefiks tekshiruvi (`/admin`, `/rahbariyat`) yetarli
 * EMAS, chunki kanonik hostda pathname prefikssiz (masalan `/kirish` —
 * bozor va admin login sahifalari uchun BIR XIL ko'rinadi!). Faqat
 * `mounted` (client-only, useEffect'dan keyin) holatda chaqirilsin —
 * render paytida to'g'ridan-to'g'ri chaqirilsa server/client hydration
 * mos kelmasligi mumkin. */
export function isAdminSurfaceHost(): boolean {
  return typeof window !== "undefined" && window.location.hostname === ADMIN_HOST;
}
