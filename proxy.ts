import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* Admin domen ko'chirishi (2026-09) — admin.bobododa.uz o'z domeni bo'ladi,
   lekin bitta Railway "frontend" xizmati ikkalasini ham xizmat qiladi
   (host-asoslangan routing — .claude devops audit topilmasi: alohida
   xizmat bir xil kodni qayta build qiladi va bir xil routing ishini talab
   qiladi, faqat ikki barobar qo'lda deploy/env nusxasi bilan).

   Manzillar HAMMA joyda qattiq yozilgan konstanta — HECH QACHON so'rov
   Host/X-Forwarded-Host header'idan olinmaydi (security audit topilmasi:
   open-redirect oldini olish uchun redirect manzili doim ishonchli
   manbadan, hech qachon foydalanuvchi boshqaradigan header'dan kelishi
   kerak). */
const ADMIN_HOST = "admin.bobododa.uz";
const APP_HOST = "app.bobododa.uz";
const RAW_FRONTEND_HOST = "frontend-production-25bc.up.railway.app";
const ADMIN_ORIGIN = `https://${ADMIN_HOST}`;
const APP_ORIGIN = `https://${APP_HOST}`;

const ADMIN_PREFIX = "/admin";

/* Ichki `app/admin/**` fayl daraxtiga to'g'ri keladigan mantiqiy yo'llar
   (bosh segment). Frontend-engineer audit — to'liq ro'yxat (17 bo'lim +
   ildiz). Yangi admin bo'limi qo'shilsa shu ro'yxat ham yangilanishi
   kerak — aks holda admin.bobododa.uz'da 404 (yoki xatarliroq — app
   host'ga qaytarib yuborish) beradi. */
const ADMIN_LOGICAL_ROUTES = [
  "/kirish",
  "/parolni-almashtirish",
  "/ruxsat-yoq",
  "/foydalanuvchilar",
  "/shartnomalar",
  "/nizolar",
  "/tolovlar",
  "/audit",
  "/xizmatlar",
  "/loyihalar",
  "/verifikatsiya",
  "/shikoyatlar",
  "/apellyatsiyalar",
  "/sharhlar",
  "/yordam",
  "/fikrlar",
  "/kategoriyalar",
  "/sozlamalar",
  "/super",
];

function isAdminLogicalPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return ADMIN_LOGICAL_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/* `/rahbariyat/*` (super_admin login — o'z holicha qoladi, prefikslanmaydi),
   `/_next/*`, `/api/*` va statik fayllar admin host'da HAM to'g'ridan-
   to'g'ri, o'zgarishsiz xizmat qilinadi — aks holda ular `/admin/robots.txt`
   kabi mavjud bo'lmagan yo'lga ko'chib, 404 qaytaradi (frontend-engineer
   audit topilmasi — noindex robots.txt shu sabab yo'qolib qolardi).

   Statik fayl tekshiruvi ATAYLAB FAQAT BIR BO'G'INLI (`/nom.kengaytma`,
   ICHIDA qo'shimcha `/` YO'Q) yo'llarga cheklangan — ikkinchi mustaqil
   security ko'rib chiqishi topilmasi: oldingi "istalgan kengaytma bilan
   tugaydigan har qanday yo'l" qoidasi `/xaridor/shartnomalar/abc.x` yoki
   `/yordam-markazi/foo.bar` kabi KO'P BO'G'INLI marketplace dinamik
   marshrutlarini ham "statik fayl" deb noto'g'ri o'tkazib yuborardi —
   admin host xaridor/mutaxassis kontentini xizmat qilib qo'yardi (bo'lim
   3ning "ikkilanmasin" talabini buzardi). `public/` papkasi haqiqatan
   ham FAQAT bitta bo'g'inli fayllardan iborat (favicon.ico, sw.js,
   logo*.png va h.k. — ichki papka yo'q), shuning uchun bu cheklov haqiqiy
   statik fayllarga ta'sir qilmaydi. */
function isPassthroughOnAdminHost(pathname: string): boolean {
  if (pathname === "/rahbariyat" || pathname.startsWith("/rahbariyat/")) return true;
  if (pathname === "/_next" || pathname.startsWith("/_next/")) return true;
  if (pathname === "/api" || pathname.startsWith("/api/")) return true;
  if (/^\/[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+$/.test(pathname)) return true;
  return false;
}

function withNoIndex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const hostname = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname, search } = request.nextUrl;

  if (hostname === ADMIN_HOST) {
    if (isPassthroughOnAdminHost(pathname)) {
      return withNoIndex(NextResponse.next());
    }
    /* Kanonizatsiya: kimdir eski `/admin/...` havolasi bilan kelsa (masalan
       keshlangan havola, qo'lda kiritilgan URL), prefiksni olib tashlab
       o'ziga qaytaramiz — ikkita URL bitta kontentga xizmat qilmasin.
       Manzil ATAYLAB `ADMIN_ORIGIN` konstantasidan (request.url'dan EMAS)
       — QA ko'rib chiqishida bu qator shubha ostiga olingan edi (mahalliy
       qayta tekshiruvda `request.url` asosli variant ham to'g'ri natija
       berdi, lekin xavfsizlik qoidasi — redirect manzili doim qattiq
       yozilgan konstantadan — bu yerda ham izchil qo'llanildi, chunki
       noaniqlik qolgan edi). */
    if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
      const stripped = pathname.slice(ADMIN_PREFIX.length) || "/";
      return NextResponse.redirect(new URL(`${stripped}${search}`, ADMIN_ORIGIN), 307);
    }
    if (isAdminLogicalPath(pathname)) {
      const internalPath = pathname === "/" ? ADMIN_PREFIX : `${ADMIN_PREFIX}${pathname}`;
      return withNoIndex(NextResponse.rewrite(new URL(`${internalPath}${search}`, request.url)));
    }
    /* Admin bo'lmagan yo'l (masalan `/mutaxassis`, `/xaridor`) — bu host
       xaridor/mutaxassis sahifalarini TAKRORLAMASLIGI kerak (talab —
       bo'lim 3). Haqiqiy joyiga qaytaramiz. */
    return NextResponse.redirect(new URL(`${APP_ORIGIN}${pathname}${search}`), 307);
  }

  if (hostname === APP_HOST || hostname === RAW_FRONTEND_HOST) {
    if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
      const stripped = pathname.slice(ADMIN_PREFIX.length) || "/";
      return NextResponse.redirect(new URL(`${stripped}${search}`, ADMIN_ORIGIN), 307);
    }
    if (pathname === "/rahbariyat" || pathname.startsWith("/rahbariyat/")) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, ADMIN_ORIGIN), 307);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
