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
- Backend, real Telegram/to'lov, admin, soatlik shartnoma va Connects — YO'Q.
  Nizo ochish, sabab/dalil yuborish va shartnomani muzlatish frontend oqimi bor.
- Komponent kutubxonalari ishlatilmaydi — hammasi `/components/ui` da noldan.

## Stack
- Next.js 16 App Router + React 19 + TypeScript + Tailwind CSS.
- **API chegarasi (`/lib/api`) — UI FAQAT shu yerdan import qiladi.**
  Ekranlar domen service'larini chaqiradi (`contractsService.list()`,
  `paymentsService.fundContract(id)` …), loose funksiyalarni EMAS.
  `contracts.ts` (typed interfeyslar+DTO) · `errors.ts` (`ApiError` taksonomiyasi)
  · `state-machines.ts` · `client.ts` (**adapter — backend'da faqat shu fayl
  almashadi**) · `index.ts`. Eski `export * from "@/lib/mock-api"` tikuvi
  OLIB TASHLANGAN — `@/lib/mock-api` dan to'g'ridan-to'g'ri import qilinmasin,
  yangi operatsiya qo'shilsa avval `contracts.ts` ga interfeys yoziladi.
- Yuklash xatosi: har bir ekranda `loadError` holati + `<ErrorState>` (qayta
  urinish tugmasi bilan). **Xato hech qachon bo'sh ro'yxatga aylantirilmaydi** —
  aks holda foydalanuvchi ma'lumot o'chgan deb o'ylaydi.
- Ma'lumot: `/lib/mock-api` — async funksiyalar, localStorage (`sb2_*` kalitlar),
  `seed.ts` (`SEED_VERSION` bilan — versiya oshsa mock ma'lumot qayta yoziladi
  va sessiya tozalanadi). Ko'p seller: u-1 (demo) + u-s2/u-s3/u-s4 (katalog uchun).
- Shartnoma o'qish funksiyalari (`getContracts`, `getAllMilestones`,
  `getAllMessages`) sessiya roliga qarab filtrlanadi (seller/buyer tomoni).
- i18n: `/lib/i18n` — **UZ/RU/EN**. `dictionary.ts` (uz+ru) + `en.ts` (ingliz,
  alohida qatlam — yetishmasa uz'ga tushadi), Context + `useT()` hook. Til
  `sb_lang` da. Yangi UI matni qo'shsangiz **uch tilга ham** yozing (en.ts ga
  ham). `LangSwitch` — UZ/RU/EN.
- **Valyuta**: joriy ma'lumot modeli summalarni UZS'da saqlaydi va `formatMoney`
  doim UZS ko'rsatadi. Avvalgi faqat belgini almashtiradigan global switch
  moliyaviy jihatdan noto'g'ri bo'lgani uchun header'dan olib tashlangan.
  KZT/KGS/TJS/TMT faqat backend real FX kursi va asl valyutani qaytarganda yoqiladi.
- TrustBadge mantiqla: `computeBadge()` lib/types.ts da (5+/4.5→ishonchli, 25+/4.8→top).

## Dizayn tili: "Suzani Light" (tailwind.config.ts) — BOSHQA RANG QO'SHILMASIN
Ilhom — o'zbek so'zana kashtasi, ammo **oq mato** ustida: fon oq, naqsh va chok
**yashil ip bilan** tikilgan.
Qoida: **oq = muhit (fon) · yashil = harakat (CTA/urg'u) · yashil chok = chiziq**.
Barcha matn/fon juftliklari WCAG AA (>=4.5:1) bo'yicha hisoblab tekshirilgan —
yangi rang qo'shilsa ham shu chegara saqlanishi shart.
- Fon: `bg` #FFFFFF, `card` #FFFFFF, `card-hover` #F2F8F4,
  `surface` #F5FAF7 (ichki "botiq" panel — eski to'q fonli bloklar o'rniga).
  **Oq kartani oq fondan `border-line` + `shadow-card` ajratadi.**
- Harakat: `primary` #15803D (o'rmon yashil), `primary-hover` #116632.
  **To'ldirilgan yashil ustida matn doim `text-on-primary` (#FFFFFF)** —
  hech qachon `text-ink` emas.
- Urg'u: `accent` #4D7C0F (zaytun-lime — eski so'zana lime'ining o'qiladigan varianti)
- Jarayon holati: `info` #0F766E (archa-ko'kish yashil)
- Matn: `ink` #0C1F16, `muted` #4C6156, `faint` #5E7568
- Chegara: `line` #DDEAE3 (ajratgich), `line-strong` #15803D (yashil chok ipi),
  `field` #7B9587 — **forma elementlari chegarasi** (WCAG 1.4.11 uchun 3:1).
  Input/Select/Textarea/Checkbox `border-field` ishlatadi, `border-line` emas.
- Semantik (faqat status/xabar): `danger` #DC2626, `warning` #B45309,
  `success` #15803D
- **`-deep` variantlar** (`primary-deep` #0E5C2C, `accent-deep` #3F6A0A,
  `info-deep` #0B5A54, `success-deep` #0E5C2C, `warning-deep` #8F4208,
  `danger-deep` #B4161B): matn O'Z RANGINING ochiq to'ldirishi (`bg-X/10`)
  ustida turganda ishlatiladi — to'liq rang u yerda AA dan o'tmaydi.
  Qoida: `bg-X/10` bor joyda matn `text-X-deep`.
- **Yashil ohanglar bir ro'yxatda to'qnashmasin**: `StatusBadge` da jarayon
  holatlari `info` (faol, mablag'langan, ko'rib chiqilmoqda), tugagan holatlar
  `success`, suhbat `accent`. Aks holda ikki yashil badge farqlanmaydi.
- Shrift: Unbounded (`font-heading` — FAQAT `font-bold`/`font-extrabold`, boshqa
  og'irlik yuklanmaydi), Onest (`font-sans`), JetBrains Mono (`font-mono` —
  karta raqami va shunga o'xshash); 12–28px shkala
- Radius: karta 14px, tugma/input 10px
- Soya: `shadow-card` (karta), `shadow-card-hover`, `shadow-overlay` (modal/
  panel), `shadow-raised` (yashil tugma ostidagi to'q yashil chiziq).
- **Modal/drawer pardasi `bg-ink/40`** — oq fonda `bg-bg/80` ko'rinmaydi.
- **Imzo element — yugurma chok (running stitch)**: `<Card stitch>` (panel
  tepasida yashil chok) va `shadow-raised`. Faqat asosiy panellarda — hozir
  3 joyda: xaridor "Harakat talab qilinadi" bloki va ikkala rolning shartnoma
  workroom sarlavhasi. Har kartaga qo'yilsa shovqin bo'ladi.
- Animatsiya minimal (hover 150ms, modal/toast `sb-fade-in` 200ms, skeleton),
  `prefers-reduced-motion` hurmat qilinadi.
- Landing (`public/landing.html`) mustaqil CSS, lekin ayni shu tokenlar bilan.
  DIQQAT: u yerdagi o'zgaruvchi nomlari tarixiy (`--yellow` = harakat yashili,
  `--lime` = zaytun urg'u, `--red` = yashil chok) — qiymatlar yangi palitrada.
- Namunaviy portfolio rasmlari (`seed.ts` → `svgImg`) ham yumshoq yashil
  tonlarda; to'q/sariq blok qo'yilmasin.

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
- **Ishonch markazi**: ikkala rol uchun KYC/verifikatsiya, hujjat yuklash,
  support ticketlar, notification/privacy sozlamalari, data export va xavfsiz
  account deletion frontend oqimlari mavjud.
- **Huquqiy/payment holatlari**: foydalanish shartlari, maxfiylik, oferta hamda
  success/pending/failed/expired/refunded callback ekranlari mavjud.

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
o'zgartirish so'ralgan. `npm run verify` (lint + typecheck + build) toza
bo'lishi shart. Responsive: 360–430 / 768–1024 / 1280px+ (360px da gorizontal
skroll BO'LMASIN — header o'ng bloki shu sababli ixchamlashtirilgan).

**E2E/a11y suitlarini ishga tushirish** (`npm run test:e2e`, `npm run test:a11y`):
ular ishlab turgan serverga ulanadi va standart manzil `127.0.0.1:3001`
(admin testlari uchun `:3100`). Dev serverda kompilyatsiya 30s timeout'ga
tiqilib qolishi mumkin, shuning uchun **production build'ga qarshi** yuriting:

```bash
npm run build && npx next start -p 3001
TEST_BASE_URL=http://127.0.0.1:3001 node scripts/lifecycle-test.cjs
TEST_BASE_URL=http://127.0.0.1:3001 node scripts/stress-test.cjs
TEST_BASE_URL=http://127.0.0.1:3001 node scripts/admin-logic-test.cjs
TEST_BASE_URL=http://127.0.0.1:3001 node scripts/admin-stress-test.cjs
TEST_BASE_URL=http://127.0.0.1:3001 node scripts/accessibility-test.cjs
```

Har biri `{"ok": true}` qaytarishi shart. accessibility-test axe bilan
WCAG 2 A/AA ni tekshiradi — rang kontrasti shu yerda ushlanadi.
