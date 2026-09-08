import type {
  VerificationRecord,
  Dispute,
  SupportTicket,
} from "@/lib/types";
import type {
  TransactionRecord,
  TrustReport,
  UserAppeal,
  CategoryManagementItem,
  PlatformSettingItem,
  InternalNote,
  AuditEvent,
} from "@/lib/admin-types";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";

/* ==========================================================================
   1. KYC / VERIFICATION APPLICATIONS
   ========================================================================== */
export const seedVerifications: VerificationRecord[] = [
  {
    userId: "u-1",
    status: "tasdiqlangan",
    country: "UZ",
    documentType: "passport",
    legalName: "Rustam Qosimov",
    birthDate: "1994-05-12",
    documents: [
      "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    ],
    submittedAt: "2026-01-12T10:00:00.000Z",
  },
  {
    userId: "u-2",
    status: "tasdiqlangan",
    country: "UZ",
    documentType: "id_card",
    legalName: "Nigora Karimova",
    birthDate: "1997-08-23",
    documents: [
      "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    ],
    submittedAt: "2026-01-16T12:00:00.000Z",
  },
  {
    userId: "u-3",
    status: "tasdiqlangan",
    country: "UZ",
    documentType: "passport",
    legalName: "Jasur Bekchanov",
    birthDate: "1996-11-04",
    documents: [
      "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    ],
    submittedAt: "2026-02-02T09:00:00.000Z",
  },
  {
    userId: "u-4",
    status: "korib_chiqilmoqda",
    country: "UZ",
    documentType: "id_card",
    legalName: "Zarina Saidova",
    birthDate: "1999-03-15",
    documents: [
      "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    ],
    submittedAt: "2026-04-18T10:30:00.000Z",
  },
  {
    userId: "u-5",
    status: "korib_chiqilmoqda",
    country: "UZ",
    documentType: "passport",
    legalName: "Umid Aliyev",
    birthDate: "1995-09-30",
    documents: [
      "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    ],
    submittedAt: "2026-04-19T14:15:00.000Z",
  },
  {
    userId: "u-6",
    status: "korib_chiqilmoqda",
    country: "UZ",
    documentType: "id_card",
    legalName: "Shahzod Mirzayev",
    birthDate: "1998-01-18",
    documents: [
      "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    ],
    submittedAt: "2026-04-20T08:45:00.000Z",
  },
  {
    userId: "u-7",
    status: "rad_etilgan",
    country: "UZ",
    documentType: "passport",
    legalName: "Aziza Toshmatova",
    birthDate: "2000-07-09",
    documents: [
      "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    ],
    submittedAt: "2026-03-20T16:00:00.000Z",
    rejectionReason: "Hujjat surati xira va chetlari kesilgan. Iltimos, sifatliroq formatda qayta yuklang.",
  },
  {
    userId: "u-sus1",
    status: "rad_etilgan",
    country: "UZ",
    documentType: "passport",
    legalName: "Botir Qobilov",
    birthDate: "1993-12-05",
    documents: [
      "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    ],
    submittedAt: "2026-04-10T12:30:00.000Z",
    rejectionReason: "Taqdim etilgan passport boshqa foydalanuvchi hisobiga tegishli.",
  },
];

/* `seedDisputes` asosiy seed'ga (`lib/mock-api/seed.ts`) ko'chirildi —
   ikkala tomon (foydalanuvchi va admin) bitta manbadan foydalanishi uchun. */
export { seedDisputes } from "@/lib/mock-api/seed";

/* ==========================================================================
   3. SUPPORT TICKETS
   ========================================================================== */
export const seedSupportTickets: SupportTicket[] = [
  {
    id: "tkt-1",
    userId: "u-b1",
    topic: "tolov",
    subject: "Escrow to'lovi bo'yicha bank hisobvarag'i va invoys olish",
    message: "Kompaniyamiz nomidan o'tkazilgan 7,500,000 UZS to'lov uchun rasmiy elektron hisob-faktura (EHF / Didox) talab etiladi.",
    status: "ochiq",
    createdAt: "2026-04-18T09:30:00.000Z",
  },
  {
    id: "tkt-2",
    userId: "u-1",
    topic: "tolov",
    subject: "Humo kartasiga mablag' yechish kechikmoqda",
    message: "Kecha 4,000,000 UZS mablag'ni yechishga so'rov yuborgan edim, holat hali ham 'kutilmoqda' turibdi. Qachon tushadi?",
    status: "ochiq",
    createdAt: "2026-04-19T11:15:00.000Z",
  },
  {
    id: "tkt-3",
    userId: "u-4",
    topic: "hisob",
    subject: "KYC arizam holatini bilish",
    message: "Shaxsni tasdiqlash uchun ID kartamni yuklagandim. Ko'rib chiqish qancha vaqt oladi?",
    status: "javob_berildi",
    createdAt: "2026-04-18T15:40:00.000Z",
  },
  {
    id: "tkt-4",
    userId: "u-b4",
    topic: "shartnoma",
    subject: "Mutaxassis aloqaga chiqmayapti",
    message: "Xizmat uchun taklif yubordim, biroq mutaxassis 3 kundan beri javob yozmayapti. Taklifni bekor qilsam bo'ladimi?",
    status: "yopilgan",
    createdAt: "2026-04-10T14:00:00.000Z",
  },
];

/* ==========================================================================
   4. PAYOUT / WITHDRAWAL REQUESTS
   ========================================================================== */
/* `seedWithdrawals` asosiy seed'ga (`lib/mock-api/seed.ts`) ko'chirildi —
   `seedVerifications` bilan bir xil sabab: yechish so'rovlari IKKALA tomonga
   ham tegishli. Ilgari ular faqat admin paneli ochilganda yozilardi, ya'ni
   mutaxassis o'zining kutilayotgan so'rovini ko'rmasdi. */
export { seedWithdrawals } from "@/lib/mock-api/seed";

/* ==========================================================================
   5. TRANSACTIONS
   ========================================================================== */
export const seedTransactions: TransactionRecord[] = [
  {
    id: "tx-1",
    type: "deposit",
    userId: "u-b1",
    userName: "TechCorp Tashkent MChJ",
    amount: 7500000,
    currency: "UZS",
    referenceId: "cnt-1",
    description: "Shartnoma #cnt-1 uchun to'liq Escrow oldindan to'lovi (Uzcard)",
    status: "muvaffaqiyatli",
    createdAt: "2026-03-03T10:05:00.000Z",
  },
  {
    id: "tx-2",
    type: "milestone_tolov",
    userId: "u-1",
    userName: "Rustam Qosimov",
    amount: 3150000,
    currency: "UZS",
    referenceId: "ms-1-1",
    description: "1-Bosqich: Figma Dizayn qabul qilindi, mutaxassis hisobiga o'tkazildi (komissiya ushlandi)",
    status: "muvaffaqiyatli",
    createdAt: "2026-03-05T17:00:00.000Z",
  },
  {
    id: "tx-3",
    type: "commission",
    userId: "u-1",
    userName: "Bobo&Doda Platform",
    amount: 350000,
    currency: "UZS",
    referenceId: "ms-1-1",
    description: "10% Platforma xizmat haqi (Komissiya)",
    status: "muvaffaqiyatli",
    createdAt: "2026-03-05T17:00:00.000Z",
  },
  {
    id: "tx-4",
    type: "deposit",
    userId: "u-b2",
    userName: "ArtSoft Studios",
    amount: 2000000,
    currency: "UZS",
    referenceId: "cnt-2",
    description: "Shartnoma #cnt-2 uchun Escrow to'lovi (Click)",
    status: "muvaffaqiyatli",
    createdAt: "2026-02-10T11:05:00.000Z",
  },
  {
    id: "tx-5",
    type: "milestone_tolov",
    userId: "u-2",
    userName: "Nigora Karimova",
    amount: 1800000,
    currency: "UZS",
    referenceId: "ms-2-1",
    description: "Shartnoma #cnt-2 to'liq bajarildi va mablag' chiqarildi",
    status: "muvaffaqiyatli",
    createdAt: "2026-02-15T10:10:00.000Z",
  },
  {
    id: "tx-6",
    type: "commission",
    userId: "u-2",
    userName: "Bobo&Doda Platform",
    amount: 200000,
    currency: "UZS",
    referenceId: "ms-2-1",
    description: "10% Platforma xizmat haqi",
    status: "muvaffaqiyatli",
    createdAt: "2026-02-15T10:10:00.000Z",
  },
  {
    id: "tx-7",
    type: "deposit",
    userId: "u-b3",
    userName: "Zamona Logistics",
    amount: 1800000,
    currency: "UZS",
    referenceId: "cnt-3",
    description: "Shartnoma #cnt-3 Escrow to'lovi (Payme)",
    status: "muvaffaqiyatli",
    createdAt: "2026-02-18T14:10:00.000Z",
  },
  {
    id: "tx-8",
    type: "deposit",
    userId: "u-b5",
    userName: "Apex Retail Group",
    amount: 7500000,
    currency: "UZS",
    referenceId: "cnt-4",
    description: "Shartnoma #cnt-4 Escrow to'lovi (Uzcard)",
    status: "muvaffaqiyatli",
    createdAt: "2026-03-12T16:05:00.000Z",
  },
];

/* ==========================================================================
   6. TRUST & SAFETY REPORTS
   ========================================================================== */
export const seedTrustReports: TrustReport[] = [
  {
    id: "rep-1",
    reporterId: "u-b1",
    reporterName: "TechCorp Tashkent MChJ",
    targetType: "user",
    targetId: "u-sus1",
    targetTitle: "Botir Qobilov",
    reasonType: "off_platform",
    description: "Foydalanuvchi platformadan tashqarida (Telegram orqali) to'lov qilishni va 20% arzonroq qilishni taklif qildi. Skrinshot ilova qilingan.",
    evidenceUrl: "https://example.com/evidence1.png",
    severity: "high",
    status: "resolved",
    assignedAdminId: "adm-ops",
    assignedAdminName: "Dilnoza Rahimova",
    resolutionNote: "Foydalanuvchiga ogohlantirish berildi va cheklov o'rnatildi.",
    actionTaken: "suspended",
    createdAt: "2026-04-09T14:00:00.000Z",
    resolvedAt: "2026-04-10T11:00:00.000Z",
  },
  {
    id: "rep-2",
    reporterId: "u-2",
    reporterName: "Nigora Karimova",
    targetType: "user",
    targetId: "u-block1",
    targetTitle: "CopyMaster_UZ",
    reasonType: "plagiarism",
    description: "Ushbu foydalanuvchi mening Dribbble va Behance akkauntimdagi portfoliolarimni ko'chirib o'ziniki qilib joylashtirgan.",
    evidenceUrl: "https://dribbble.com/shots/example",
    severity: "critical",
    status: "resolved",
    assignedAdminId: "adm-ceo",
    assignedAdminName: "Saidkarim — CEO",
    resolutionNote: "Plagiat to'liq tasdiqlandi. Hisob butunlay bloklandi va portfoliolar o'chirildi.",
    actionTaken: "removed",
    createdAt: "2026-04-14T10:30:00.000Z",
    resolvedAt: "2026-04-15T09:30:00.000Z",
  },
  {
    id: "rep-3",
    reporterId: "u-b2",
    reporterName: "ArtSoft Studios",
    targetType: "service",
    targetId: "svc-6",
    targetTitle: "Sayt va Landing Page uchun SEO Kopirayting",
    reasonType: "spam",
    description: "Xizmat tavsifida noto'g'ri kalit so'zlar va spam havolalar kiritilgan.",
    severity: "low",
    status: "new",
    assignedAdminId: "adm-ops",
    assignedAdminName: "Dilnoza Rahimova",
    createdAt: "2026-04-19T16:00:00.000Z",
  },
];

/* ==========================================================================
   7. USER APPEALS
   ========================================================================== */
export const seedUserAppeals: UserAppeal[] = [
  {
    id: "apl-1",
    userId: "u-sus1",
    userName: "Botir Qobilov",
    userRole: "mutaxassis",
    restrictionType: "suspended",
    originalReason: "Platformadan tashqarida to'lov qabul qilishga urinish",
    appealText: "Assalomu alaykum. Men qoidalarni yaxshi bilmagan edim. Mijoz o'zi Telegram orqali yozishni so'ragandi. Qoidalarni to'liq o'qib chiqdim va boshqa takrorlanmasligiga va'da beraman. Iltimos, hisobimni qayta tiklab bering.",
    evidenceUrls: [],
    status: "pending",
    reviewerId: undefined,
    reviewerName: undefined,
    createdAt: "2026-04-12T15:00:00.000Z",
  },
];

/* ==========================================================================
   8. CATEGORIES & TAXONOMY
   ========================================================================== */
/* Slug'lar ilovaning HAQIQIY kategoriyalari bilan bir xil
   (`lib/category-fields.ts` → `CATEGORIES`). Ilgari bu ro'yxat mustaqil edi:
   admin panelida ilovada mavjud bo'lmagan "mobil-ilovalar"/"matnlar" turardi,
   ilovadagi kontent/video/audio/biznes esa umuman ko'rinmasdi.
   `serviceCount` seed'da 0 — haqiqiy son `getAdminData()` da xizmatlardan
   HISOBLANADI (ilgari qattiq yozilgan o'ylab topilgan raqam edi). */
export const seedCategories: CategoryManagementItem[] = [
  {
    id: "cat-dasturlash",
    slug: "dasturlash",
    nameUz: "Dasturlash va IT",
    nameRu: "Разработка и IT",
    nameEn: "Development & IT",
    icon: "💻",
    order: 1,
    active: true,
    serviceCount: 0,
    subcategories: [
      { id: "sub-1", slug: "veb-saytlar", nameUz: "Veb-saytlar yaratish", nameRu: "Создание сайтов", nameEn: "Web Development", active: true },
      { id: "sub-2", slug: "telegram-botlar", nameUz: "Telegram botlar", nameRu: "Телеграм боты", nameEn: "Telegram Bots", active: true },
      { id: "sub-3", slug: "backend-api", nameUz: "Backend va API", nameRu: "Бэкенд и API", nameEn: "Backend & APIs", active: true },
    ],
  },
  {
    id: "cat-dizayn",
    slug: "dizayn",
    nameUz: "Dizayn va Brending",
    nameRu: "Дизайн и брендинг",
    nameEn: "Design & Branding",
    icon: "🎨",
    order: 2,
    active: true,
    serviceCount: 0,
    subcategories: [
      { id: "sub-4", slug: "logotip", nameUz: "Logotip va Brandbook", nameRu: "Логотипы и брендбуки", nameEn: "Logos & Brand Identity", active: true },
      { id: "sub-5", slug: "ui-ux", nameUz: "Veb va Mobil UI/UX", nameRu: "Веб и мобайл UI/UX", nameEn: "UI/UX Design", active: true },
    ],
  },
  {
    id: "cat-marketing",
    slug: "marketing",
    nameUz: "Marketing va SMM",
    nameRu: "Маркетинг и SMM",
    nameEn: "Marketing & SMM",
    icon: "📈",
    order: 3,
    active: true,
    serviceCount: 0,
    subcategories: [
      { id: "sub-6", slug: "smm-boshqaruvi", nameUz: "SMM to'liq yuritish", nameRu: "Ведение SMM", nameEn: "SMM Management", active: true },
      { id: "sub-7", slug: "target-reklama", nameUz: "Target reklama", nameRu: "Таргетированная реклама", nameEn: "Targeted Ads", active: true },
    ],
  },
  {
    id: "cat-kontent",
    slug: "kontent",
    nameUz: "Kontent va Kopirayting",
    nameRu: "Контент и копирайтинг",
    nameEn: "Content & Copywriting",
    icon: "✍️",
    order: 4,
    active: true,
    serviceCount: 0,
    subcategories: [
      { id: "sub-8", slug: "seo-maqolalar", nameUz: "SEO maqolalar", nameRu: "SEO статьи", nameEn: "SEO Articles", active: true },
    ],
  },
  {
    id: "cat-tarjima",
    slug: "tarjima",
    nameUz: "Tarjima Xizmatlari",
    nameRu: "Услуги перевода",
    nameEn: "Translation Services",
    icon: "🌐",
    order: 5,
    active: true,
    serviceCount: 0,
    subcategories: [
      { id: "sub-9", slug: "ingliz-rus-uzbek", nameUz: "Ingliz, Rus, O'zbek", nameRu: "Английский, русский, узбекский", nameEn: "EN, RU, UZ Translation", active: true },
    ],
  },
  {
    id: "cat-video",
    slug: "video",
    nameUz: "Video va Animatsiya",
    nameRu: "Видео и анимация",
    nameEn: "Video & Animation",
    icon: "🎬",
    order: 6,
    active: true,
    serviceCount: 0,
    subcategories: [
      { id: "sub-10", slug: "montaj", nameUz: "Video montaj", nameRu: "Видеомонтаж", nameEn: "Video Editing", active: true },
    ],
  },
  {
    id: "cat-audio",
    slug: "audio",
    nameUz: "Audio va Ovoz",
    nameRu: "Аудио и озвучка",
    nameEn: "Audio & Voice",
    icon: "🎧",
    order: 7,
    active: true,
    serviceCount: 0,
    subcategories: [
      { id: "sub-11", slug: "ovoz-berish", nameUz: "Ovoz berish", nameRu: "Озвучка", nameEn: "Voice Over", active: true },
    ],
  },
  {
    id: "cat-biznes",
    slug: "biznes",
    nameUz: "Biznes va Konsalting",
    nameRu: "Бизнес и консалтинг",
    nameEn: "Business & Consulting",
    icon: "📊",
    order: 8,
    active: true,
    serviceCount: 0,
    subcategories: [
      { id: "sub-12", slug: "biznes-reja", nameUz: "Biznes reja", nameRu: "Бизнес-план", nameEn: "Business Plans", active: true },
    ],
  },
];

/* ==========================================================================
   9. PLATFORM SETTINGS
   ========================================================================== */
export const seedPlatformSettings: PlatformSettingItem[] = [
  {
    key: "platform_commission_percent",
    group: "finance",
    label: "Platforma Komissiyasi",
    description:
      "Bajarilgan shartnomalardan olinadigan xizmat haqi ulushi. Super Admin tomonidan o'zgartiriladi va real vaqtda platformaning barcha hisob-kitoblariga tatbiq etiladi.",
    value: PLATFORM_FEE_PERCENT,
    type: "percent",
    readOnly: false,
  },
  {
    key: "registration_enabled",
    group: "security",
    label: "Ro'yxatdan o'tish ochiq",
    description:
      "O'chirilsa yangi foydalanuvchilar ro'yxatdan o'ta olmaydi (mavjud hisoblar ishlayveradi). Hujum yoki texnik ishlar paytidagi kill-switch.",
    value: true,
    type: "boolean",
  },
  {
    key: "payments_paused",
    group: "finance",
    label: "To'lovlar to'xtatilgan",
    description:
      "Yoqilsa xaridorlar shartnomani mablag'lay olmaydi (escrow to'lovi bloklanadi). To'lov provayderi ishlamay qolganda ishlatiladi.",
    value: false,
    type: "boolean",
  },
  {
    key: "escrow_auto_release_days",
    group: "escrow",
    label: "Avtomatik Qabul Qilish Muddati (Kun)",
    description: "Mutaxassis ishni topshirgandan so'ng xaridor javob bermasa mablag' avtomatik o'tkaziladigan muddat.",
    value: 3,
    type: "number",
  },
  {
    key: "min_payout_amount",
    group: "finance",
    label: "Minimal Yechish Miqdori (UZS)",
    description: "Mutaxassis o'z balansidan yechib olishi mumkin bo'lgan minimal summa.",
    value: 50000,
    type: "number",
  },
  {
    key: "mandatory_kyc_threshold",
    group: "security",
    label: "Majburiy KYC Chegarasi (UZS)",
    description: "Oylik aylanmasi ushbu summadan oshgan mutaxassislar uchun shaxsni tasdiqlash majburiy bo'ladi. Chegara backend tomonida qo'llanadi — frontend prototipida aylanma hisoblanmaydi.",
    value: 15000000,
    type: "number",
    readOnly: true,
  },
  {
    key: "marketplace_instant_offer_enabled",
    group: "marketplace",
    label: "To'g'ridan-to'g'ri Takliflar Tizimi",
    description: "Xaridorlarga mutaxassisga oldindan to'lovsiz taklif yuborish imkoniyatini yoqish.",
    value: true,
    type: "boolean",
  },
];

/* ==========================================================================
   10. INTERNAL OPERATOR NOTES
   ========================================================================== */
export const seedInternalNotes: InternalNote[] = [
  {
    id: "note-1",
    targetId: "u-1",
    targetType: "user",
    adminId: "adm-ceo",
    adminName: "Saidkarim — CEO",
    text: "Top darajadagi ishonchli dasturchi. Barcha shartnomalarni 100% o'z vaqtida topshirgan.",
    createdAt: "2026-03-01T10:00:00.000Z",
  },
  {
    id: "note-2",
    targetId: "dsp-1",
    targetType: "dispute",
    adminId: "adm-ops",
    adminName: "Dilnoza Rahimova",
    text: "Mutaxassis bilan telefon orqali bog'lanildi. Ertaga 18:00 gacha xatoliklarni to'g'irlab berishini bildirdi.",
    createdAt: "2026-04-18T16:00:00.000Z",
  },
  {
    id: "note-3",
    targetId: "u-sus1",
    targetType: "user",
    adminId: "adm-ops",
    adminName: "Dilnoza Rahimova",
    text: "Qayta apellyatsiya yubordi. Agar takrorlansa hisobni butunlay o'chirish lozim.",
    createdAt: "2026-04-13T11:00:00.000Z",
  },
];

/* ==========================================================================
   11. AUDIT EVENTS
   ========================================================================== */
export const seedAuditLog: AuditEvent[] = [
  {
    id: "aud-1",
    adminId: "adm-ceo",
    adminName: "Saidkarim — CEO",
    action: "KYC Tasdiqlandi",
    target: "u-1 (Rustam Qosimov)",
    details: "Passport AB 1234567 ma'lumotlari to'liq tekshirildi va tasdiqlandi.",
    previousState: "korib_chiqilmoqda",
    newState: "tasdiqlangan",
    createdAt: "2026-01-12T14:30:00.000Z",
  },
  {
    id: "aud-2",
    adminId: "adm-ops",
    adminName: "Dilnoza Rahimova",
    action: "Pul Yechish Tasdiqlandi",
    target: "wdr-2 (Nigora Karimova)",
    details: "1,800,000 UZS Humo kartasiga o'tkazildi.",
    previousState: "kutilmoqda",
    newState: "tasdiqlangan",
    createdAt: "2026-02-16T14:00:00.000Z",
  },
  {
    id: "aud-3",
    adminId: "adm-ceo",
    adminName: "Saidkarim — CEO",
    action: "Foydalanuvchi Bloklandi",
    target: "u-block1 (CopyMaster_UZ)",
    details: "Plagiat va mualliflik huquqini buzganlik uchun hisob butunlay bloklandi.",
    previousState: "faol",
    newState: "bloklangan",
    createdAt: "2026-04-15T09:30:00.000Z",
  },
  {
    id: "aud-4",
    adminId: "adm-ops",
    adminName: "Dilnoza Rahimova",
    action: "Foydalanuvchi Vaqtincha To'xtatildi",
    target: "u-sus1 (Botir Qobilov)",
    details: "Platformadan tashqarida to'lov qilishga uringanligi sababli 7 kunga to'xtatildi.",
    previousState: "faol",
    newState: "suspended",
    createdAt: "2026-04-10T11:00:00.000Z",
  },
  {
    id: "aud-5",
    adminId: "adm-ceo",
    adminName: "Saidkarim — CEO",
    action: "Yangi Admin Tayinlandi",
    target: "admin@bobododa.uz",
    details: "Dilnoza Rahimova ga operatsion administrator huquqlari berildi.",
    createdAt: "2026-01-05T09:00:00.000Z",
  },
];
