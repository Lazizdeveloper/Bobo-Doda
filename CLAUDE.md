# Bobo&Doda — ikki tomonlama marketplace (frontend, mock)

**Markaziy Osiyo** freelance marketplace'i (O'zbekiston, Qozog'iston, Qirg'iziston,
Tojikiston, Turkmaniston). Asosiy ustunlik: **bosqichli to'lov kafolati
(milestone escrow)** — pul bosqichma-bosqich, har bir qism qabul qilingandan
keyingina mutaxassisga o'tadi. UI matnlarida shu ishonch tuyg'usi aks etsin.

## Arxitektura: ikki yo'l → bitta Shartnoma. Yollash bosqichida TO'LOV YO'Q
- **A yo'l (to'g'ridan-to'g'ri taklif — Offer)**: xaridor bozorda xizmat/
  mutaxassisni topadi → to'lovsiz taklif yuboradi (`createOffer`: mavzu, xabar,
  taxminiy byudjet; OfferModal) → taklif chatida yozishadi (Message'lar taklif
  id'siga bog'lanadi) → mutaxassis qabul qilsa (`acceptOffer`) shartnoma
  ochiladi (bosqich `kutilmoqda`, chat shartnomaga ko'chadi) yoki rad etadi
  (`declineOffer`); xaridor kutilayotgan taklifini o'zi bekor qila oladi
  (`withdrawOffer` → `bekor_qilingan`). Bitta mutaxassisga bitta kutilayotgan
  taklif. Taklif chatlari Xabarlar sahifalarida ham ko'rinadi.
- **B yo'l (faol, Upwork modeli)**: xaridor ish e'lon qiladi (`createJob`,
  5 bosqichli wizard) → mutaxassis taklif yuboradi → xaridor takliflarni
  boshqaradi (ko'rilmoqda/suhbat/rad) → yollaydi (`hireProposal`, bosqichlarni
  o'zi belgilaydi, HAMMASI `kutilmoqda` — to'lovsiz; qolgan takliflar avto-rad).
- Ikkalasi ham `Contract` + `Milestone[]` ga keladi; workroom ikkala rol uchun
  alohida sahifa: `/mutaxassis/shartnomalar/[id]` (topshirish) va
  `/xaridor/shartnomalar/[id]` (faollashtirish/qabul/o'zgartirish so'rash + sharh).
- **To'lov modeli — TO'LIQ OLDINDAN (Fiverr/Kwork, Markaziy Osiyo uchun tanlangan)**:
  taklif qabul qilinsa/yollansa shartnoma **`imzolangan`** bo'ladi (barcha bosqich
  `kutilmoqda`, ish BOSHLANMAYDI). Xaridor **butun summani** bitta to'lovda
  escrow'ga tashlaydi (`fundContract`) → shartnoma **`faol`**, barcha bosqich
  `mablaglangan`, ish boshlanadi. Pul har bosqich qabul qilinganda mutaxassisga
  o'tadi — bu asosiy mahsulot g'oyasi.
- Milestone holatlari: kutilmoqda → mablaglangan (`fundContract` — hammasi birdan)
  → topshirildi (3 kunlik ko'rib chiqish, CountdownBadge) → qabul_qilindi
  (`acceptMilestone` yoki avto); + ozgartirish_soraldi (`requestRevision`).
- Contract holatlari: **imzolangan** (to'lov kutilmoqda) → faol → yakunlangan /
  bekor_qilingan / nizo.
- **Bekor qilish + qaytarish**: `cancelContract` (imzolangan yoki faol; topshirilgan
  ish bo'lsa bloklanadi). Escrow'dagi (mablag'langan, qabul qilinmagan) pul xaridor
  **balansiga** (`sb2_balances`) qaytadi → `withdrawBalance(cardId)` bilan kartaga
  yechadi (Xarajatlar sahifasida). Qabul qilingan bosqichlar mutaxassisda qoladi.
- **Bank kartalari (mahalliy + xalqaro)**: `addCard`/`getCards`/`removeCard`
  (`sb2_cards`). Xavfsizlik: to'liq raqam SAQLANMAYDI — faqat oxirgi 4 raqam +
  tur + egasi + muddat. Turlar: Uzcard (8600), Humo (9860), Visa (4),
  Mastercard (51–55/2221–2720). Validatsiya `lib/validate.ts`: `cardNumber` +
  `detectCardType` (16 raqam+prefiks), `cardExpiry` (MM/YY, o'tmagan).
  Kartalar Sozlamalarda (`CardManager`), to'lov/yechishда tanlanadi (`CardPicker`).
- **Pul KIRISHI (deposit)**: xaridor `fundContract`da usul (Bank kartasi /
  Mahalliy hamyon — Payme/Click/Kaspi) tanlaydi → **SMS-kod (3DS mock, istalgan
  6 raqam)** bilan tasdiqlaydi. Real hayotda: karta/mahalliy hamyon
  (Payme/Click/Kaspi) gateway, hisob raqam berilmaydi.
- **Pul CHIQISHI (payout)**: mutaxassis `withdrawFunds(cardId)`, xaridor
  `withdrawBalance(cardId)` — bog'langan kartaga. Egalik tekshiriladi
  (`assertOwnCard`). Mutaxassis daromadi: "Yechish mumkin" = qabul qilingan −
  yechilgan (`sb2_withdrawn`).
- Contract.sourceType: "xizmat" (xizmatdan kelgan taklif) | "taklifnoma"
  (to'g'ridan-to'g'ri taklif) | "taklif" (e'lon orqali yollash).

## Qamrov
- Ikkala tomon (mutaxassis + xaridor kabinetlari) bitta umumiy localStorage
  bazada — akkaunt almashtirib ikki tomonlama oqimni sinash mumkin.
- Backend, real Telegram/to'lov, admin, soatlik shartnoma, Connects, nizo
  ochish formasi — YO'Q.
- Komponent kutubxonalari ishlatilmaydi — hammasi `/components/ui` da noldan.

## Stack
- Next.js 14 App Router + TypeScript + Tailwind CSS.
- Ma'lumot: `/lib/mock-api` — async funksiyalar, localStorage (`sb2_*` kalitlar),
  `seed.ts` (`SEED_VERSION` bilan — versiya oshsa mock ma'lumot qayta yoziladi
  va sessiya tozalanadi). Ko'p seller: u-1 (demo) + u-s2/u-s3/u-s4 (katalog uchun).
- Shartnoma o'qish funksiyalari (`getContracts`, `getAllMilestones`,
  `getAllMessages`) sessiya roliga qarab filtrlanadi (seller/buyer tomoni).
- i18n: `/lib/i18n` — **UZ/RU/EN**. `dictionary.ts` (uz+ru) + `en.ts` (ingliz,
  alohida qatlam — yetishmasa uz'ga tushadi), Context + `useT()` hook. Til
  `sb_lang` da. Yangi UI matni qo'shsangiz **uch tilга ham** yozing (en.ts ga
  ham). `LangSwitch` — UZ/RU/EN.
- **Valyuta (global o'zgartkich)**: `lib/currency.ts` — Markaziy Osiyo 5 valyutasi
  (UZS/KZT/KGS/TJS/TMT), belgi tilга qarab lokallashadi. `CurrencySwitch` header'da,
  til yonida; tanlov `sb_currency` da. **MOCK: konvertatsiya YO'Q** — `formatMoney`
  faqat belgini almashtiradi, raqam o'zgarmaydi. `formatMoney(amount, lang)` imzosi
  o'zgarmagan (valyuta modul-store'dan o'qiladi); qayta render `useT()` konteksti
  orqali. Maydon yorliqlarida valyuta so'zi yo'q (masalan "Narx", "Summa").
- TrustBadge mantiqla: `computeBadge()` lib/types.ts da (5+/4.5→ishonchli, 25+/4.8→top).

## Dizayn tili: "Suzani" (tailwind.config.ts) — BOSHQA RANG QO'SHILMASIN
Ilhom — o'zbek so'zana kashtasi: to'q archa-yashil mato, zarg'aldoq sariq va
yashil naqsh, hammasi **qizil ip bilan chok qilingan**.
Qoida: **yashil = muhit (fon) · sariq = harakat (CTA/urg'u) · qizil = chiziq**.
- Fon: `bg` #08211A, `card` #0E2E24, `card-hover` #143A2D
- Harakat: `primary` #FFC53D (sariq). **To'ldirilgan sariq ustida matn doim
  `text-on-primary` (#08211A)** — hech qachon `text-ink` emas.
- Urg'u: `accent` #A3E635 (yosh yashil — sariq bilan yashil orasidagi ko'prik)
- Matn: `ink` #F5EFE0, `muted` #9CB6A6, `faint` #7B9A88
- Chegara: `line` rgba(214,74,52,.40), `line-strong` #D64A34 — qizil chok ipi
- Semantik (faqat status/xabar): `danger` #F5355E (qirmizi — qizil chokdan
  ataylab farq qiladi), `warning` #F58C1F, `success` #4ADE80
- Shrift: Unbounded (`font-heading` — FAQAT `font-bold`/`font-extrabold`, boshqa
  og'irlik yuklanmaydi), Onest (`font-sans`), JetBrains Mono (`font-mono` —
  karta raqami va shunga o'xshash); 12–28px shkala
- Radius: karta 14px, tugma/input 10px
- **Imzo element — yugurma chok (running stitch)**: `<Card stitch>` (panel
  tepasida qizil chok) va `shadow-raised` (sariq tugma ostidagi qizil chiziq).
  Faqat asosiy panellarda — hozir 3 joyda: xaridor "Harakat talab qilinadi"
  bloki va ikkala rolning shartnoma workroom sarlavhasi. Har kartaga qo'yilsa
  shovqin bo'ladi.
- Animatsiya minimal (hover 150ms, modal/toast `sb-fade-in` 200ms, skeleton),
  `prefers-reduced-motion` hurmat qilinadi.
- Landing (`public/landing.html`) mustaqil CSS, lekin ayni shu tokenlar bilan
  (`--yellow`/`--lime`/`--red`/`--stitch-h`/`--stitch-v`).

## Oqim
`/kirish` ikki tabli: **Ro'yxatdan o'tish** (ism + telefon + parol,
`register()` — telefon unikal, `PHONE_EXISTS`) va **Kirish** (telefon + parol,
`login()` — `INVALID_CREDENTIALS`, onboarding qayerda to'xtagan bo'lsa sessiya
o'sha holatdan tiklanadi: User'da `roleChosen`/`profileDone`/`verified`
saqlanadi). Parol mock — localStorage'da ochiq (`User.password`, min 6 belgi).
Seed hisoblar paroli: `DEMO_PASSWORD` = "demo123" (masalan +998901234567 —
Aziz Karimov/mutaxassis, +998977770202 — Jasur Toshpo'latov/xaridor).
Ro'yxatdan o'tish avval, Telegram tasdiqlash **eng oxirida**: `/kirish` →
`/rol-tanlash` (mutaxassis → `/mutaxassis/royxat` profil; xaridor → to'g'ridan-
to'g'ri tasdiqlashga, profil bosqichi yo'q) → `/kirish/tasdiqlash` (istalgan
6 xonali kod, `verifyTelegram()`, rolga qarab yo'naltiradi) → dashboard.
Guardlar: `app/mutaxassis/layout.tsx` va `app/xaridor/layout.tsx` (rol +
verified tekshiradi). Header `base` prop bilan ikkala kabinetga moslashadi.
- Mutaxassis sidebar: Boshqaruv, Ish e'lonlari, Takliflarim (kelgan Offer'lar
  bloki tepada, `/takliflarim/kelgan/[id]` da qabul/rad + chat), Xizmatlarim,
  Shartnomalar, Xabarlar, Daromad, Profil, Sozlamalar.
- Xaridor sidebar: Boshqaruv, Bozor, Takliflarim (yuborilgan Offer'lar,
  `/takliflarim/[id]` da holat + chat), E'lonlarim, Shartnomalar, Xabarlar,
  Xarajatlar, Sozlamalar.
- Rol guard'lari: rol-tanlash, /kirish va /kirish/tasdiqlash roli tasdiqlangan
  foydalanuvchini o'z kabinetiga qaytaradi (dublikat ro'yxat oldini oladi);
  har bir layout qarshi rolni o'z kabinetiga yo'naltiradi. `chooseRole`
  User.role'ni ham yangilaydi.
- Egalik tekshiruvlari mock-api'da: updateService/deleteService (sellerId),
  submitMilestone (shartnoma sellerId), withdrawProposal (sellerId, e'lon
  hisobini kamaytiradi), getProposal (taklif egasi yoki e'lon egasi),
  getOffer/acceptOffer/declineOffer/withdrawOffer, fund/accept/requestRevision
  (buyerId). Xizmat tahrirlash sahifasi ham egalikni tekshiradi.
- Bildirishnoma bosilganda o'qilgan bo'ladi (`markNotificationRead`).
  Mutaxassis dashboard'ida kutilayotgan Offer'lar bloki bor.

## Xaridor kabineti (`/xaridor/...`)
- **Boshqaruv**: statistika + "Harakat talab qilinadi" (mablag'lanmagan faol
  shartnomalar, topshirilgan bosqichlar countdown bilan, yangi takliflar soni).
- **Bozor** (`/bozor`): Xizmatlar/Mutaxassislar tablari, qidiruv + kategoriya +
  narx/reyting saralash. Xizmat tafsiloti (`/bozor/xizmat/[id]`) va mutaxassis
  ochiq profili (`/bozor/mutaxassis/[id]`) → **OfferModal** (to'lovsiz taklif).
- **Takliflarim**: yuborilgan Offer'lar; tafsilotda holat eslatmasi
  (kutilmoqda/qabul→shartnoma tugmasi/rad) + taklif chati.
- **E'lonlarim**: ro'yxat (haqiqiy takliflar soni bilan), yangi e'lon wizard'i
  (kategoriya → sarlavha/tavsif → ko'nikma + skrining savollari (3 tagacha) →
  byudjet → ko'rib chiqish). E'lon tafsilotida takliflar boshqaruvi: ochilganda
  yuborilgan → korib_chiqilmoqda (viewed), suhbatga taklif / rad / yollash;
  yollangan taklifda shartnomaga havola. E'lonni yopish faol takliflarni avto-rad
  etadi (bildirishnoma bilan).
- **Yollash** (`/elonlarim/[id]/yollash/[proposalId]`): bosqich qatorlari
  (nom/summa/muddat, qo'shish-o'chirish), jami hisob — to'lovsiz, eslatma:
  mablag'lash keyin workroom'da.
- **Xarajatlar**: jami to'langan + escrow'dagi + **Bobo&Doda hisobi (balans)** —
  bekor qilingan shartnomalardan qaytgan mablag', kartaga yechish tugmasi bilan.
- Sharh: yakunlangan shartnoma workroom'ida bir marta (`createReview`,
  `Review.buyerName` ochiq profillar uchun).
- Katalog (`getSpecialists`) chala (bio bo'sh) profillarni ko'rsatmaydi.

## Platforma tahlilidan kelgan qo'shimchalar (Upwork/Fiverr/Kwork amaliyoti)
- **Escrow avto-qabul**: `applyEscrowRules()` — muddati o'tgan `topshirildi`
  bosqichlar avto `qabul_qilindi` (faqat faol shartnomalarda), hammasi qabul
  qilinsa shartnoma yakunlanadi; ikkala tomonga bildirishnoma.
- **Bildirishnomalar**: Header qo'ng'irog'i, `userId` bo'yicha filtrlanadi.
  Hodisalar: yangi taklif (xaridorga), topshirildi (xaridorga), taklif qabul/
  rad (xaridorga), mablag'landi/qabul qilindi/o'zgartirish so'raldi/
  yollandingiz/yangi Offer (mutaxassisga), yangi xabar (qarshi tomonga —
  shartnoma yoki Offer chatidan).
- **E'lonlar (seller)**: qidiruv, "Sizga mos", "Saqlanganlar" tablari.
- **Taklif tafsiloti** `/takliflarim/[id]`: qaytarib olish (`qaytarib_olingan`).
- **Profil to'liqligi** dashboard'da — 100% bo'lsa yashirinadi.
- **Ish holati**: `SellerProfile.available` (bozor kartalarida ham badge).
- Yangi xaridorda reyting 0 → e'lonlarda "Yangi xaridor" badge (yulduz o'rniga).

## Xavfsizlik (mock doirasida)
- **Kirish validatsiyasi**: `lib/validate.ts` — `amount()` (chekli/musbat/
  ≤10 mlrd butun son; Infinity/NaN/manfiy rad etiladi), `text()`/`textList()`
  (LIMITS bo'yicha trim+qisqartirish — localStorage DoS himoyasi), `safeHref()`
  (faqat "/..." ichki yo'l — open redirect himoyasi). Barcha `create*`/`update*`/
  `hireProposal`/`createJob`/`createOffer`/`createReview`/`sendMessage` shu
  qatlamdan o'tadi. Reyting 1–5 butun son.
- **write() quota himoyasi**: localStorage to'lsa `STORAGE_FULL` (toza xato,
  UI toast ko'rsatadi) — oq ekran/crash bo'lmaydi. `isQuotaError()` nom+kod
  bo'yicha (brauzerlararo).
- **Bildirishnoma href**: yozishda ham (`pushNotification`), o'qishda ham
  (`getNotifications`) `safeHref` bilan tozalanadi.
- **id'lar**: `crypto.randomUUID` (taxmin qilinmaydi).
- **FileUpload**: faqat PNG/JPG/WebP, ≤2MB (tur+hajm tekshiruvi).
- **Bank kartasi**: to'liq raqam saqlanmaydi (faqat last4+tur+muddat); yechish
  faqat o'z kartasiga (`assertOwnCard`). Karta: 16 raqam + tur (Visa/Mastercard/
  Uzcard/Humo) prefiks validatsiyasi (`detectCardType`).
- **Security header'lar** (`next.config.mjs`): CSP (Google Fonts uchun ruxsat
  bilan), X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy.
- **XSS**: React JSX avtomatik escape (dangerouslySetInnerHTML/eval umuman yo'q).
- **ARXITEKTURA CHEKLOVI (bilib qo'yish shart)**: auth+ma'lumot to'liq
  localStorage'da — DevTools orqali har qanday hisobga kirish/ma'lumotni
  o'zgartirish mumkin. Egalik tekshiruvlari (sellerId/buyerId) — UX darajasidagi
  himoya; **haqiqiy xavfsizlik faqat backend bilan keladi**. 6 xonali kodning
  istalganini qabul qilish ham ataylab mock (production'da real Telegram OTP).
- **npm audit**: Next 14.2.35'da advisory'lar bor, lekin deyarli hammasi biz
  ishlatmaydigan server funksiyalariga (Image Optimizer, RSC, middleware,
  WebSocket) tegishli. To'liq yopish Next 16 major upgrade talab qiladi —
  alohida bosqichga qoldirilgan.

## Deploy (Netlify) — DIQQAT
- **`app/page.tsx` YO'Q**. Bosh sahifa (`/`) `next.config.mjs` dagi rewrite
  orqali `public/landing.html` ga boradi. Rewrite Next.js runtime'ini talab
  qiladi — statik hosting'da `/` **404** beradi (aynan shu xato bo'lgan).
- Shuning uchun `netlify.toml` + `@netlify/plugin-nextjs` SHART:
  `publish = ".next"`, plugin e'lon qilingan, `/` uchun qo'shimcha CDN-darajali
  redirect va xavfsizlik header'lari yozilgan.
- `output: 'export'` (statik eksport) MUMKIN EMAS: `[id]` marshrutlari
  UUID bo'lgani uchun `generateStaticParams` bilan oldindan sanab bo'lmaydi,
  hamda `rewrites()`/`headers()` eksportda ishlamaydi.
- Ilova 100% client-side (server kodi, API route, `process.env` yo'q) —
  barcha sahifa `"use client"`, ma'lumot localStorage'da.
- **Loyiha ichiga eski nusxa/zaxira jild tashlanmasin.** `tsconfig.json`
  `include` ataylab aniq papkalar bilan cheklangan (`app/`, `components/`,
  `lib/`, ildizdagi `*.ts`) — ilgari `"**/*.tsx"` edi va papka ichiga tushib
  qolgan loyihaning eski/zaxira nusxasi butun build'ni yiqitgan (Netlify'da
  aynan shu bo'lgan: ilova kompilyatsiya bo'lgan, keyin tip tekshiruvi eski
  nusxada yiqilgan). Qo'lda yuklashda faqat toza jild yuborilsin.

## Tekshirish
`npm run dev` → demo xaridor bilan kiring (+998977770202 / demo123): c-7 (imzolangan — to'lab
faollashtirish oqimini sinash), c-2 (4 bosqichli faol, ms-2b topshirilgan —
qabul/o'zgartirish), j-6 da 2 ta taklif (yollash), o-2 yuborilgan Offer (chat).
Demo mutaxassis (+998901234567 / demo123): o-1 kelgan Offer (qabul/rad), c-2 seller tomoni, c-3 da
o'zgartirish so'ralgan. `npx tsc --noEmit`,
`npm run build`, `npm run lint` toza bo'lishi shart. Responsive: 360–430 /
768–1024 / 1280px+.
