import type {
  AppNotification,
  Contract,
  Job,
  Message,
  Milestone,
  Offer,
  Proposal,
  Review,
  SellerProfile,
  Service,
  User,
} from "@/lib/types";

export const SELLER_ID = "u-1";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysAhead(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

/* Palitradagi ranglar bilan kichik namunaviy portfolio rasmi */
function svgImg(fill: string): string {
  const f = fill.replace("#", "%23");
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='160'%3E%3Crect width='240' height='160' fill='${f}'/%3E%3Ccircle cx='120' cy='80' r='36' fill='%23A3E635' fill-opacity='.28'/%3E%3C/svg%3E`;
}

/** Demo xaridor hisobi (c-2 shartnoma va j-6 ochiq e'lon egasi) */
export const BUYER_ID = "u-b2";

/** Barcha seed hisoblarning demo paroli — telefon raqami + shu parol bilan
   login qilib ikki tomonlama oqimni sinash mumkin (MOCK, ochiq saqlanadi) */
export const DEMO_PASSWORD = "demo123";

const baseUsers: User[] = [
  {
    id: SELLER_ID,
    phone: "+998901234567",
    fullName: "Aziz Karimov",
    role: "mutaxassis",
    createdAt: daysAgo(220),
  },
  { id: "u-b1", phone: "+998935550101", fullName: "Dilnoza Rahimova", role: "xaridor", createdAt: daysAgo(90) },
  { id: BUYER_ID, phone: "+998977770202", fullName: "Jasur Toshpo'latov", role: "xaridor", createdAt: daysAgo(70) },
  { id: "u-b3", phone: "+998909990303", fullName: "Malika Yusupova", role: "xaridor", createdAt: daysAgo(45) },
  { id: "u-b4", phone: "+998887770404", fullName: "Sardor Aliyev", role: "xaridor", createdAt: daysAgo(30) },
  /* Katalog va takliflar uchun qo'shimcha mutaxassislar */
  { id: "u-s2", phone: "+998911112233", fullName: "Madina Abdullayeva", role: "mutaxassis", createdAt: daysAgo(400) },
  { id: "u-s3", phone: "+998933334455", fullName: "Bekzod Rahmonov", role: "mutaxassis", createdAt: daysAgo(150) },
  { id: "u-s4", phone: "+998955556677", fullName: "Nilufar Karimova", role: "mutaxassis", createdAt: daysAgo(60) },
];

/* Seed hisoblar onboarding'ni to'liq o'tgan holatda — login darhol kabinetga olib kiradi */
export const seedUsers: User[] = baseUsers.map((u) => ({
  ...u,
  password: DEMO_PASSWORD,
  roleChosen: true,
  profileDone: true,
  verified: true,
}));

export const seedProfile: SellerProfile = {
  userId: SELLER_ID,
  headline: "Grafik dizayner va Frontend dasturchi",
  bio: "5 yillik tajribaga ega grafik dizayner va frontend dasturchi. Logotip, brending va zamonaviy veb-saytlar bo'yicha ixtisoslashganman. Ishni muddatida va sifatli topshiraman.",
  skills: ["Figma", "Illustrator", "React", "Next.js", "Logo dizayn"],
  categories: ["dizayn", "dasturlash"],
  location: "Toshkent",
  languages: [
    { name: "O'zbek", level: "native" },
    { name: "Rus", level: "fluent" },
    { name: "Ingliz", level: "intermediate" },
  ],
  portfolio: [
    {
      id: "pf-1",
      title: "Onlayn kiyim do'koni uchun logotip va brending",
      description:
        "Zamonaviy minimal logotip, rang palitrasi va Instagram shablonlari. Brend tanilishi 3 oyda sezilarli oshdi.",
      image: svgImg("#FFC53D"),
      category: "dizayn",
    },
    {
      id: "pf-2",
      title: "Restoran uchun buyurtma qabul qiluvchi Telegram bot",
      description:
        "Menyu, savat, to'lov va kuryer paneli bilan to'liq bot. Kuniga 150+ buyurtmani avtomatik qayta ishlaydi.",
      image: svgImg("#A3E635"),
      category: "dasturlash",
    },
    {
      id: "pf-3",
      title: "Fitnes mobil ilova uchun UI/UX dizayn",
      description:
        "28 ekranlik interaktiv Figma prototipi va dizayn tizimi. Dasturchilarga topshirishga tayyor holda.",
      image: svgImg("#143A2D"),
      category: "dizayn",
    },
    {
      id: "pf-4",
      title: "Qurilish kompaniyasi uchun korporativ sayt",
      description:
        "Next.js'da tez yuklanadigan, SEO'ga mos 8 sahifali sayt. Google PageSpeed bahosi 98/100.",
      image: svgImg("#143A2D"),
      category: "dasturlash",
    },
  ],
  responseTimeHours: 1,
  rating: 4.8,
  completedContracts: 47,
  badge: "top_mutaxassis",
  memberSince: daysAgo(220),
  available: true,
};

/* Katalogdagi qo'shimcha mutaxassis profillari — turli badge darajalari ko'rinishi uchun */
export const seedProfiles: Record<string, SellerProfile> = {
  [SELLER_ID]: seedProfile,
  "u-s2": {
    userId: "u-s2",
    headline: "Brend dizayneri — logotip va vizual identifikatsiya",
    bio: "7 yildan beri brendlar bilan ishlayman: logotip, brend kitobi, qadoq dizayni. 120 dan ortiq loyiha, jumladan yirik mahalliy brendlar bilan hamkorlik.",
    skills: ["Logo dizayn", "Brending", "Illustrator", "Figma", "Qadoq dizayni"],
    categories: ["dizayn"],
    location: "Toshkent",
    languages: [
      { name: "O'zbek", level: "native" },
      { name: "Rus", level: "fluent" },
    ],
    portfolio: [
      {
        id: "pf-s2-1",
        title: "Milliy taomlar restorani uchun to'liq brending",
        description: "Logotip, menyu dizayni, tashqi belgi va ijtimoiy tarmoq uslubi.",
        image: svgImg("#FFC53D"),
        category: "dizayn",
      },
      {
        id: "pf-s2-2",
        title: "Bolalar kiyimi brendi uchun qadoq dizayni",
        description: "Qadoq, yorliq va sovg'a qutilari seriyasi.",
        image: svgImg("#A3E635"),
        category: "dizayn",
      },
    ],
    responseTimeHours: 2,
    rating: 4.9,
    completedContracts: 31,
    badge: "top_mutaxassis",
    memberSince: daysAgo(400),
    available: true,
  },
  "u-s3": {
    userId: "u-s3",
    headline: "Video montajchi va motion dizayner",
    bio: "YouTube, Instagram va reklama roliklari uchun professional montaj. DaVinci Resolve va After Effects'da ishlayman. Har oy 40+ video topshiraman.",
    skills: ["Premiere Pro", "DaVinci Resolve", "After Effects", "Motion dizayn"],
    categories: ["video", "audio"],
    location: "Samarqand",
    languages: [
      { name: "O'zbek", level: "native" },
      { name: "Rus", level: "intermediate" },
    ],
    portfolio: [
      {
        id: "pf-s3-1",
        title: "Turizm agentligi uchun 12 ta reklama roligi",
        description: "Rang korreksiyasi, motion grafika va subtitrlar bilan.",
        image: svgImg("#143A2D"),
        category: "video",
      },
    ],
    responseTimeHours: 3,
    rating: 4.6,
    completedContracts: 12,
    badge: "ishonchli",
    memberSince: daysAgo(150),
    available: true,
  },
  "u-s4": {
    userId: "u-s4",
    headline: "SEO kopirayter va tarjimon (UZ/RU/EN)",
    bio: "Moliyaviy va IT mavzularida SEO maqolalar yozaman, texnik hujjatlarni tarjima qilaman. Google'ning birinchi sahifasiga chiqqan 200+ maqola.",
    skills: ["SEO", "Kopirayting", "Texnik tarjima"],
    categories: ["kontent", "tarjima"],
    location: "Toshkent",
    languages: [
      { name: "O'zbek", level: "native" },
      { name: "Rus", level: "fluent" },
      { name: "Ingliz", level: "fluent" },
    ],
    portfolio: [],
    responseTimeHours: 5,
    rating: 4.9,
    completedContracts: 3,
    badge: "yangi",
    memberSince: daysAgo(60),
    available: false,
  },
};

function hoursAgo(n: number): string {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

export const seedNotifications: AppNotification[] = [
  {
    id: "n-1",
    userId: SELLER_ID,
    kind: "elon",
    messageKey: "ntf.newMatchingJob",
    params: { title: "Onlayn do'kon uchun logotip va brend kitobi" },
    href: "/mutaxassis/ish-elonlari/j-1",
    read: false,
    createdAt: hoursAgo(2),
  },
  {
    id: "n-2",
    userId: SELLER_ID,
    kind: "taklif",
    messageKey: "ntf.proposalInterview",
    params: { title: "Onlayn do'kon uchun logotip va brend kitobi" },
    href: "/mutaxassis/takliflarim",
    read: false,
    createdAt: hoursAgo(5),
  },
  {
    id: "n-3",
    userId: SELLER_ID,
    kind: "bosqich",
    messageKey: "ntf.milestoneFunded",
    params: { title: "Admin panel va statistika" },
    href: "/mutaxassis/shartnomalar/c-2",
    read: false,
    createdAt: hoursAgo(26),
  },
  {
    id: "n-4",
    userId: SELLER_ID,
    kind: "xabar",
    messageKey: "ntf.newMessage",
    params: { name: "Jasur Toshpo'latov" },
    href: "/mutaxassis/shartnomalar/c-2",
    read: true,
    createdAt: hoursAgo(30),
  },
  {
    id: "n-5",
    userId: SELLER_ID,
    kind: "taklif",
    messageKey: "ntf.proposalRejected",
    params: { title: "Mobil ilova uchun UI dizayn (fitnes)" },
    href: "/mutaxassis/takliflarim",
    read: true,
    createdAt: daysAgo(11),
  },
  {
    id: "n-9",
    userId: SELLER_ID,
    kind: "taklif",
    messageKey: "ntf.newOffer",
    params: { title: "Restoran menyusi va banner dizayni" },
    href: "/mutaxassis/takliflarim/kelgan/o-1",
    read: false,
    createdAt: hoursAgo(3),
  },
  /* Demo xaridor bildirishnomalari */
  {
    id: "n-6",
    userId: BUYER_ID,
    kind: "taklif",
    messageKey: "ntf.newProposal",
    params: { title: "YouTube kanal uchun 8 ta video montaj" },
    href: "/xaridor/elonlarim/j-6",
    read: false,
    createdAt: hoursAgo(6),
  },
  {
    id: "n-7",
    userId: BUYER_ID,
    kind: "bosqich",
    messageKey: "ntf.milestoneSubmitted",
    params: { title: "Asosiy buyurtma oqimi" },
    href: "/xaridor/shartnomalar/c-2",
    read: false,
    createdAt: daysAgo(1),
  },
  {
    id: "n-8",
    userId: BUYER_ID,
    kind: "xabar",
    messageKey: "ntf.newMessage",
    params: { name: "Aziz Karimov" },
    href: "/xaridor/shartnomalar/c-2",
    read: true,
    createdAt: daysAgo(1),
  },
];

export const seedServices: Service[] = [
  {
    id: "s-1",
    sellerId: SELLER_ID,
    category: "dizayn",
    title: "Professional logotip dizayni — 3 variant bilan",
    description:
      "Biznesingiz uchun zamonaviy va esda qoladigan logotip yarataman. 3 ta boshlang'ich variant, 2 marta bepul tuzatish, barcha formatlarda (SVG, PNG, PDF) topshiriladi.",
    fields: { dizayn_turi: "opt.logo" },
    price: 500000,
    currency: "UZS",
    deliveryDays: 3,
    images: [svgImg("#FFC53D"), svgImg("#A3E635")],
    status: "active",
    createdAt: daysAgo(120),
  },
  {
    id: "s-2",
    sellerId: SELLER_ID,
    category: "dasturlash",
    title: "Next.js'da zamonaviy landing sahifa",
    description:
      "Tez yuklanadigan, SEO'ga mos va mobil qurilmalarga to'liq moslashgan landing sahifa yozib beraman. Dizayndan kodgacha — hammasi bir qo'lda.",
    fields: {
      texnologiyalar: ["React", "Next.js", "Tailwind CSS"],
      loyiha_turi: "opt.vebsayt",
    },
    price: 2500000,
    currency: "UZS",
    deliveryDays: 7,
    images: [svgImg("#143A2D")],
    status: "active",
    createdAt: daysAgo(95),
  },
  {
    id: "s-3",
    sellerId: SELLER_ID,
    category: "dizayn",
    title: "Instagram uchun brending to'plami",
    description:
      "Profil rasmi, highlight muqovalari, post va stories shablonlari — brendingiz bir xil uslubda ko'rinishi uchun to'liq to'plam.",
    fields: { dizayn_turi: "opt.brending" },
    price: 800000,
    currency: "UZS",
    deliveryDays: 5,
    images: [svgImg("#143A2D")],
    status: "active",
    createdAt: daysAgo(60),
  },
  {
    id: "s-4",
    sellerId: SELLER_ID,
    category: "dasturlash",
    title: "Telegram bot yaratish (buyurtma qabul qilish)",
    description:
      "Do'koningiz yoki xizmatingiz uchun buyurtma qabul qiladigan Telegram bot. Admin panel va statistika bilan.",
    fields: {
      texnologiyalar: ["Node.js", "Telegraf"],
      loyiha_turi: "opt.bot",
    },
    price: 1500000,
    currency: "UZS",
    deliveryDays: 10,
    images: [],
    status: "paused",
    createdAt: daysAgo(40),
  },
  {
    id: "s-5",
    sellerId: SELLER_ID,
    category: "dizayn",
    title: "Mobil ilova uchun UI/UX dizayn",
    description:
      "Figma'da to'liq interaktiv prototip: foydalanuvchi oqimi, ekranlar dizayni va dizayn tizimi. Dasturchilarga topshirishga tayyor holda.",
    fields: { dizayn_turi: "opt.uiux" },
    price: 4000000,
    currency: "UZS",
    deliveryDays: 14,
    images: [],
    status: "draft",
    createdAt: daysAgo(10),
  },
  /* Boshqa mutaxassislarning xizmatlari — xaridor katalogi uchun */
  {
    id: "s-6",
    sellerId: "u-s2",
    category: "dizayn",
    title: "Brend kitobi va logotip — premium to'plam",
    description:
      "To'liq vizual identifikatsiya: logotip (3 konsepsiya), rang palitrasi, tipografika, 20 sahifalik brend kitobi. Barcha manba fayllar bilan.",
    fields: { dizayn_turi: "opt.brending" },
    price: 3500000,
    currency: "UZS",
    deliveryDays: 10,
    images: [svgImg("#FFC53D")],
    status: "active",
    createdAt: daysAgo(200),
  },
  {
    id: "s-7",
    sellerId: "u-s2",
    category: "dizayn",
    title: "Mahsulot qadog'i dizayni",
    description:
      "Qadoq, yorliq yoki quti dizayni — bosmaxonaga tayyor holda. 2 ta konsepsiya, 3 marta tuzatish.",
    fields: { dizayn_turi: "opt.boshqa" },
    price: 1200000,
    currency: "UZS",
    deliveryDays: 5,
    images: [svgImg("#A3E635")],
    status: "active",
    createdAt: daysAgo(90),
  },
  {
    id: "s-8",
    sellerId: "u-s3",
    category: "video",
    title: "YouTube video montaj (20 daqiqagacha)",
    description:
      "Kesish, rang korreksiyasi, subtitr, intro/outro va ovoz tozalash. 2 marta bepul tuzatish, 48 soatda topshirish.",
    fields: { format: "opt.youtube", davomiylik: "20" },
    price: 400000,
    currency: "UZS",
    deliveryDays: 2,
    images: [svgImg("#143A2D")],
    status: "active",
    createdAt: daysAgo(100),
  },
  {
    id: "s-9",
    sellerId: "u-s3",
    category: "video",
    title: "Instagram Reels to'plami (5 ta video)",
    description:
      "Trend formatlarda 5 ta qisqa video: dinamik montaj, matn animatsiyasi, musiqa tanlash. Brendingizga moslangan.",
    fields: { format: "opt.reels", davomiylik: "1" },
    price: 900000,
    currency: "UZS",
    deliveryDays: 4,
    images: [svgImg("#143A2D")],
    status: "active",
    createdAt: daysAgo(45),
  },
  {
    id: "s-10",
    sellerId: "u-s4",
    category: "kontent",
    title: "SEO maqola (1500 so'zgacha)",
    description:
      "Kalit so'zlar tahlili bilan SEO'ga mos maqola. Plagiatsiz, manbalar bilan, meta-tavsif qo'shib beriladi.",
    fields: { kontent_turi: "opt.seo", til: ["opt.uz", "opt.ru"] },
    price: 250000,
    currency: "UZS",
    deliveryDays: 3,
    images: [svgImg("#FFC53D")],
    status: "active",
    createdAt: daysAgo(50),
  },
  {
    id: "s-11",
    sellerId: "u-s4",
    category: "tarjima",
    title: "Texnik tarjima RU→UZ (10 sahifagacha)",
    description:
      "Texnik hujjatlar, qo'llanmalar va spetsifikatsiyalarni aniq terminologiya bilan tarjima qilaman. Lug'atga rioya kafolatlanadi.",
    fields: { tildan: "opt.ru", tilga: "opt.uz", soha: "opt.texnik" },
    price: 600000,
    currency: "UZS",
    deliveryDays: 4,
    images: [],
    status: "active",
    createdAt: daysAgo(30),
  },
];

/* Mock ish e'lonlari — faqat o'qish uchun */
export const seedJobs: Job[] = [
  {
    id: "j-1",
    buyerId: "u-b1",
    buyerName: "Dilnoza Rahimova",
    buyerRating: 4.9,
    title: "Onlayn do'kon uchun logotip va brend kitobi",
    description:
      "Yangi ochilayotgan onlayn kiyim do'koni uchun logotip, rang palitrasi va kichik brend kitobi (10-15 sahifa) kerak. Zamonaviy, minimal uslub. Ilhom uchun bir nechta namuna beramiz. Manba fayllar (AI/Figma) topshirilishi shart.",
    category: "dizayn",
    budgetMin: 800000,
    budgetMax: 1500000,
    currency: "UZS",
    skillsRequired: ["Logo dizayn", "Brending", "Figma"],
    screeningQuestions: [
      "Brend kitobi ustida ishlagan tajribangiz bormi? Namuna ko'rsating.",
      "Ishni necha kunda topshira olasiz?",
    ],
    proposalsCount: 7,
    postedAt: daysAgo(1),
    status: "ochiq",
  },
  {
    id: "j-2",
    buyerId: "u-b2",
    buyerName: "Jasur Toshpo'latov",
    buyerRating: 4.7,
    title: "Yetkazib berish xizmati uchun Telegram bot",
    description:
      "Oziq-ovqat yetkazib berish xizmatimiz uchun buyurtma qabul qiladigan Telegram bot kerak: menyu, savat, to'lov (Click/Payme keyinroq), buyurtma holati, kuryer uchun alohida panel. Texnik topshiriq tayyor.",
    category: "dasturlash",
    budgetMin: 3000000,
    budgetMax: 6000000,
    currency: "UZS",
    skillsRequired: ["Node.js", "Telegram Bot API", "PostgreSQL"],
    screeningQuestions: [
      "Shunga o'xshash bot loyihalaringizdan namuna bormi?",
      "Loyihani bosqichlarga qanday bo'lgan bo'lardingiz?",
    ],
    proposalsCount: 12,
    postedAt: daysAgo(3),
    /* p-1 taklifi yollangan (c-2 shartnomasi) — e'lon yopilgan */
    status: "yopilgan",
  },
  {
    id: "j-3",
    buyerId: "u-b3",
    buyerName: "Malika Yusupova",
    buyerRating: 5,
    title: "Korporativ veb-sayt (Next.js, 6-8 sahifa)",
    description:
      "Qurilish kompaniyasi uchun korporativ sayt: bosh sahifa, xizmatlar, loyihalar portfoliosi, yangiliklar, aloqa. Dizayn Figma'da tayyor. SEO va tezlik muhim. Admin panel shart emas, kontent MDX bo'lishi mumkin.",
    category: "dasturlash",
    budgetMin: 8000000,
    budgetMax: 15000000,
    currency: "UZS",
    skillsRequired: ["Next.js", "React", "Tailwind CSS", "SEO"],
    screeningQuestions: ["Portfolio havolangizni yuboring."],
    proposalsCount: 5,
    postedAt: daysAgo(2),
    status: "ochiq",
  },
  {
    id: "j-4",
    buyerId: "u-b4",
    buyerName: "Sardor Aliyev",
    buyerRating: 4.4,
    title: "Blog uchun 10 ta SEO maqola (o'zbek tilida)",
    description:
      "Moliyaviy texnologiyalar mavzusidagi blog uchun har biri 1200-1500 so'zlik 10 ta SEO maqola. Kalit so'zlar ro'yxati beriladi. Plagiatsiz, tekshiruvdan o'tadi.",
    category: "kontent",
    budgetMin: 1000000,
    budgetMax: 2000000,
    currency: "UZS",
    skillsRequired: ["SEO", "Kopirayting"],
    screeningQuestions: [],
    proposalsCount: 9,
    postedAt: daysAgo(5),
    status: "ochiq",
  },
  {
    id: "j-5",
    buyerId: "u-b1",
    buyerName: "Dilnoza Rahimova",
    buyerRating: 4.9,
    title: "Instagram akkauntini yuritish (3 oy)",
    description:
      "Kiyim brendi Instagram sahifasini 3 oy davomida yuritish: kontent-reja, haftasiga 4 post + kunlik stories, oylik hisobot. Dizayn shablonlari bor, moslashtirish kerak.",
    category: "marketing",
    budgetMin: 4000000,
    budgetMax: 7000000,
    currency: "UZS",
    skillsRequired: ["SMM", "Kontent-reja", "Instagram"],
    screeningQuestions: ["Qaysi brendlar bilan ishlagansiz?"],
    proposalsCount: 15,
    postedAt: daysAgo(4),
    status: "ochiq",
  },
  {
    id: "j-6",
    buyerId: "u-b2",
    buyerName: "Jasur Toshpo'latov",
    buyerRating: 4.7,
    title: "YouTube kanal uchun 8 ta video montaj",
    description:
      "Intervyu formatidagi YouTube kanal uchun 8 ta video (har biri 15-20 daqiqa) montaj qilish: kesish, rang korreksiyasi, subtitr, intro/outro. Xom material tayyor.",
    category: "video",
    budgetMin: 2000000,
    budgetMax: 4000000,
    currency: "UZS",
    skillsRequired: ["Premiere Pro", "DaVinci Resolve"],
    screeningQuestions: [],
    proposalsCount: 2,
    postedAt: daysAgo(6),
    status: "ochiq",
  },
  {
    id: "j-7",
    buyerId: "u-b3",
    buyerName: "Malika Yusupova",
    buyerRating: 5,
    title: "Texnik hujjatlarni ruschadan o'zbekchaga tarjima",
    description:
      "Sanoat uskunalari bo'yicha 40 sahifalik texnik qo'llanmani ruschadan o'zbekchaga tarjima qilish. Terminologiya lug'ati beriladi.",
    category: "tarjima",
    budgetMin: 500000,
    budgetMax: 900000,
    currency: "UZS",
    skillsRequired: ["Texnik tarjima"],
    screeningQuestions: [],
    proposalsCount: 3,
    postedAt: daysAgo(1),
    status: "ochiq",
  },
  {
    id: "j-8",
    buyerId: "u-b4",
    buyerName: "Sardor Aliyev",
    buyerRating: 4.4,
    title: "Mobil ilova uchun UI dizayn (fitnes)",
    description:
      "Fitnes ilova uchun 25-30 ekranlik UI dizayn Figma'da. Dizayn tizimi bilan. Wireframe'lar tayyor.",
    category: "dizayn",
    budgetMin: 5000000,
    budgetMax: 9000000,
    currency: "UZS",
    skillsRequired: ["Figma", "UI-UX", "Mobil dizayn"],
    screeningQuestions: ["Mobil ilova dizaynidan namuna ko'rsating."],
    proposalsCount: 11,
    postedAt: daysAgo(12),
    status: "yopilgan",
  },
];

export const seedProposals: Proposal[] = [
  {
    id: "p-1",
    jobId: "j-2",
    sellerId: SELLER_ID,
    bidAmount: 4500000,
    coverLetter:
      "Assalomu alaykum! Shunga o'xshash 3 ta yetkazib berish botini yasaganman (namunalar ilova qilingan). Loyihani 4 bosqichga bo'lib, har birini alohida topshirishni taklif qilaman: arxitektura, buyurtma oqimi, admin panel, yakuniy sozlash. Texnik topshiriqni ko'rib chiqdim — savat logikasi bo'yicha bitta savolim bor: chegirma promokodlari kerakmi?",
    screeningAnswers: [
      {
        question: "Shunga o'xshash bot loyihalaringizdan namuna bormi?",
        answer: "Ha, 3 ta faol bot: @namuna_food_bot, @namuna_dostavka_bot va yana bittasi NDA ostida.",
      },
      {
        question: "Loyihani bosqichlarga qanday bo'lgan bo'lardingiz?",
        answer: "4 bosqich: arxitektura va sxema, asosiy buyurtma oqimi, admin panel va statistika, yakuniy sozlash.",
      },
    ],
    attachedImages: [svgImg("#143A2D")],
    status: "yollandi",
    createdAt: daysAgo(8),
  },
  {
    id: "p-2",
    jobId: "j-1",
    sellerId: SELLER_ID,
    bidAmount: 1200000,
    coverLetter:
      "Salom! 5 yildan beri brending bilan shug'ullanaman, 40 dan ortiq logotip loyihasi yakunlaganman. Kiyim brendlari bilan ishlash tajribam bor. Brend kitobini 12 sahifada, 2 marta bepul tuzatish bilan taklif qilaman. Namunalarim ilovada.",
    screeningAnswers: [
      {
        question: "Brend kitobi ustida ishlagan tajribangiz bormi? Namuna ko'rsating.",
        answer: "Ha, 6 ta brend kitobi tayyorlaganman. Portfolio rasmlarini ilova qildim.",
      },
      {
        question: "Ishni necha kunda topshira olasiz?",
        answer: "Logotip 4 kun, to'liq brend kitobi bilan 9 kun.",
      },
    ],
    attachedImages: [svgImg("#FFC53D"), svgImg("#A3E635")],
    status: "suhbat",
    createdAt: daysAgo(1),
  },
  {
    id: "p-3",
    jobId: "j-7",
    sellerId: SELLER_ID,
    bidAmount: 700000,
    coverLetter:
      "Assalomu alaykum! Texnik tarjima bo'yicha 3 yillik tajribam bor, sanoat uskunalari terminologiyasi bilan tanishman. 40 sahifani 6 kunda, lug'atga to'liq rioya qilgan holda topshiraman.",
    screeningAnswers: [],
    attachedImages: [],
    status: "yuborilgan",
    createdAt: daysAgo(0),
  },
  {
    id: "p-4",
    jobId: "j-8",
    sellerId: SELLER_ID,
    bidAmount: 6000000,
    coverLetter:
      "Salom! Fitnes ilovalar dizayni bo'yicha tajribam bor. 28 ekran + dizayn tizimini 3 haftada topshiraman.",
    screeningAnswers: [
      {
        question: "Mobil ilova dizaynidan namuna ko'rsating.",
        answer: "Portfolio ilova qilingan — 2 ta mobil ilova dizayni.",
      },
    ],
    attachedImages: [],
    status: "rad_etildi",
    createdAt: daysAgo(11),
  },
  /* j-6 (demo xaridorning ochiq e'loni) uchun boshqa mutaxassislardan takliflar */
  {
    id: "p-5",
    jobId: "j-6",
    sellerId: "u-s3",
    bidAmount: 2800000,
    coverLetter:
      "Assalomu alaykum! Intervyu formatidagi kanallar bilan 2 yildan beri ishlayman — hozir 3 ta kanalning doimiy montajchisiman. 8 ta videoni haftasiga 2 tadan, rang korreksiyasi va dinamik subtitrlar bilan topshiraman. Birinchi videoni sinov sifatida 2 kunda ko'rsata olaman.",
    screeningAnswers: [],
    attachedImages: [svgImg("#143A2D")],
    status: "yuborilgan",
    createdAt: hoursAgo(6),
  },
  {
    id: "p-6",
    jobId: "j-6",
    sellerId: "u-s2",
    bidAmount: 3600000,
    coverLetter:
      "Salom! Asosiy yo'nalishim dizayn bo'lsa-da, video uchun intro/outro va motion grafika to'plamini ham o'zim tayyorlayman — kanal bir xil vizual uslubga ega bo'ladi. Montaj + grafika birga: 8 video, har biriga maxsus preview rasm ham kiradi.",
    screeningAnswers: [],
    attachedImages: [svgImg("#FFC53D")],
    status: "yuborilgan",
    createdAt: daysAgo(1),
  },
];

export const seedContracts: Contract[] = [
  {
    id: "c-1",
    sourceType: "xizmat",
    serviceId: "s-1",
    buyerId: "u-b1",
    buyerName: "Dilnoza Rahimova",
    sellerId: SELLER_ID,
    sellerName: "Aziz Karimov",
    title: "Professional logotip dizayni — 3 variant bilan",
    totalAmount: 500000,
    status: "faol",
    createdAt: daysAgo(1),
  },
  {
    id: "c-2",
    sourceType: "taklif",
    jobId: "j-2",
    buyerId: "u-b2",
    buyerName: "Jasur Toshpo'latov",
    sellerId: SELLER_ID,
    sellerName: "Aziz Karimov",
    title: "Yetkazib berish xizmati uchun Telegram bot",
    totalAmount: 4500000,
    status: "faol",
    createdAt: daysAgo(7),
  },
  {
    id: "c-3",
    sourceType: "xizmat",
    serviceId: "s-3",
    buyerId: "u-b3",
    buyerName: "Malika Yusupova",
    sellerId: SELLER_ID,
    sellerName: "Aziz Karimov",
    title: "Instagram uchun brending to'plami",
    totalAmount: 800000,
    status: "faol",
    createdAt: daysAgo(6),
  },
  {
    id: "c-4",
    sourceType: "xizmat",
    serviceId: "s-1",
    buyerId: "u-b4",
    buyerName: "Sardor Aliyev",
    sellerId: SELLER_ID,
    sellerName: "Aziz Karimov",
    title: "Professional logotip dizayni — 3 variant bilan",
    totalAmount: 500000,
    status: "yakunlangan",
    createdAt: daysAgo(20),
  },
  {
    id: "c-5",
    sourceType: "xizmat",
    serviceId: "s-3",
    buyerId: "u-b1",
    buyerName: "Dilnoza Rahimova",
    sellerId: SELLER_ID,
    sellerName: "Aziz Karimov",
    title: "Instagram uchun brending to'plami",
    totalAmount: 800000,
    status: "bekor_qilingan",
    createdAt: daysAgo(15),
  },
  {
    id: "c-6",
    sourceType: "xizmat",
    serviceId: "s-2",
    buyerId: "u-b4",
    buyerName: "Sardor Aliyev",
    sellerId: SELLER_ID,
    sellerName: "Aziz Karimov",
    title: "Next.js'da zamonaviy landing sahifa",
    totalAmount: 2500000,
    status: "nizo",
    createdAt: daysAgo(18),
  },
  {
    /* Imzolangan — demo xaridor to'lov qilib faollashtirishi mumkin */
    id: "c-7",
    sourceType: "taklifnoma",
    buyerId: BUYER_ID,
    buyerName: "Jasur Toshpo'latov",
    sellerId: "u-s4",
    sellerName: "Nilufar Karimova",
    title: "Kompaniya uchun landing sahifa",
    totalAmount: 2500000,
    status: "imzolangan",
    createdAt: hoursAgo(4),
  },
];

export const seedMilestones: Milestone[] = [
  /* c-1: bitta bosqichli xizmat shartnomasi */
  {
    id: "ms-1a",
    contractId: "c-1",
    title: "Logotip — to'liq ish",
    description: "3 variant, 2 marta tuzatish, barcha formatlarda topshirish",
    amount: 500000,
    status: "mablaglangan",
    dueDate: daysAhead(3),
  },

  /* c-2: 4 bosqichli taklif shartnomasi */
  {
    id: "ms-2a",
    contractId: "c-2",
    title: "Bot arxitekturasi va ma'lumotlar sxemasi",
    description: "Texnik hujjat, bot oqim diagrammasi, bazaviy sxema",
    amount: 800000,
    status: "qabul_qilindi",
    dueDate: daysAgo(5),
    submittedAt: daysAgo(6),
    reviewDeadline: daysAgo(3),
    approvedAt: daysAgo(5),
  },
  {
    id: "ms-2b",
    contractId: "c-2",
    title: "Asosiy buyurtma oqimi",
    description: "Menyu, savat, buyurtma berish va holat kuzatuvi",
    amount: 1500000,
    status: "topshirildi",
    dueDate: daysAgo(0),
    submittedAt: daysAgo(1),
    reviewDeadline: daysAhead(2),
  },
  {
    id: "ms-2c",
    contractId: "c-2",
    title: "Admin panel va statistika",
    description: "Buyurtmalarni boshqarish, kuryer paneli, kunlik hisobot",
    amount: 1200000,
    status: "mablaglangan",
    dueDate: daysAhead(10),
  },
  {
    id: "ms-2d",
    contractId: "c-2",
    title: "Yakuniy sozlash va topshirish",
    description: "Serverga joylash, test, hujjatlar va o'rgatish",
    amount: 1000000,
    /* To'liq oldindan to'lov modeli: faol shartnomada barcha bosqich mablag'langan */
    status: "mablaglangan",
    dueDate: daysAhead(20),
  },

  /* c-7: imzolangan — to'lov kutilmoqda (faollashtirish oqimini sinash uchun) */
  {
    id: "ms-7a",
    contractId: "c-7",
    title: "Landing sahifa — to'liq ish",
    description: "Dizayn, moslashuvchan verstka, joylashtirish",
    amount: 2500000,
    status: "kutilmoqda",
    dueDate: daysAhead(12),
  },

  /* c-3: o'zgartirish so'ralgan bosqich */
  {
    id: "ms-3a",
    contractId: "c-3",
    title: "Brending to'plami — to'liq ish",
    description: "Profil rasmi, highlight muqovalari, post va stories shablonlari",
    amount: 800000,
    status: "ozgartirish_soraldi",
    dueDate: daysAhead(2),
    submittedAt: daysAgo(2),
    reviewDeadline: daysAhead(1),
    revisionComment:
      "Rahmat, umumiy uslub yoqdi! Faqat highlight muqovalaridagi ko'k rang brendbook'dagi ochroq ko'kka mos kelmayapti, moslashtirib bera olasizmi? Va stories shabloniga logotip qo'shilsin.",
  },

  /* c-4: yakunlangan */
  {
    id: "ms-4a",
    contractId: "c-4",
    title: "Logotip — to'liq ish",
    description: "3 variant, tuzatishlar, barcha formatlar",
    amount: 500000,
    status: "qabul_qilindi",
    dueDate: daysAgo(16),
    submittedAt: daysAgo(17),
    reviewDeadline: daysAgo(14),
    approvedAt: daysAgo(16),
  },

  /* c-5: bekor qilingan, mablag'lanmagan */
  {
    id: "ms-5a",
    contractId: "c-5",
    title: "Brending to'plami — to'liq ish",
    description: "Profil rasmi, muqovalar, shablonlar",
    amount: 800000,
    status: "kutilmoqda",
    dueDate: daysAgo(8),
  },

  /* c-6: nizo — ko'rib chiqish muddati o'tib ketgan */
  {
    id: "ms-6a",
    contractId: "c-6",
    title: "Landing sahifa — to'liq ish",
    description: "Dizayn, kod, joylash",
    amount: 2500000,
    status: "topshirildi",
    dueDate: daysAgo(10),
    submittedAt: daysAgo(9),
    reviewDeadline: daysAgo(6),
  },
];

export const seedMessages: Message[] = [
  {
    id: "m-1",
    contractId: "c-2",
    senderId: "u-b2",
    text: "Assalomu alaykum! Ikkinchi bosqichni ko'rdim, savat ishlayapti. Faqat promokod maydonini ham tekshirib ko'raman, keyin qabul qilaman.",
    createdAt: daysAgo(1),
  },
  {
    id: "m-2",
    contractId: "c-2",
    senderId: SELLER_ID,
    text: "Vaalaykum assalom! Xo'p, promokodlar test rejimida ishlayapti — CHEGIRMA10 bilan sinab ko'ring. Savol bo'lsa yozing.",
    createdAt: daysAgo(1),
  },
  {
    id: "m-3",
    contractId: "c-2",
    senderId: "u-b2",
    text: "Tekshirdim, hammasi joyida ekan. Ertagacha qabul qilaman.",
    createdAt: daysAgo(0),
  },
  {
    id: "m-4",
    contractId: "c-3",
    senderId: "u-b3",
    text: "Izoh qoldirdim — highlight muqovalaridagi rangni brendbook'ka moslashtirsangiz, qolganini qabul qilaman.",
    createdAt: daysAgo(2),
  },
  {
    id: "m-5",
    contractId: "c-3",
    senderId: SELLER_ID,
    text: "Ko'rdim, rahmat! Bugun kechqurun yangilangan variantni qayta topshiraman.",
    createdAt: daysAgo(2),
  },
  {
    id: "m-6",
    contractId: "c-1",
    senderId: "u-b1",
    text: "Salom! Biznesim haqida qisqacha: ayollar kiyimi, asosiy auditoriya 25-40 yosh. Minimal uslub yoqadi.",
    createdAt: daysAgo(0),
  },
];

/* To'g'ridan-to'g'ri takliflar: o-1 demo mutaxassisga kelgan (qabul/rad
   sinash uchun), o-2 demo xaridor yuborgan (holat kuzatish uchun) */
export const seedOffers: Offer[] = [
  {
    id: "o-1",
    buyerId: "u-b3",
    buyerName: "Malika Yusupova",
    sellerId: SELLER_ID,
    sellerName: "Aziz Karimov",
    title: "Restoran menyusi va banner dizayni",
    message:
      "Assalomu alaykum! Portfolio'ingizdagi brending ishlaringiz yoqdi. Yangi ochilayotgan restoranimiz uchun menyu dizayni (8 sahifa) va 3 ta tashqi banner kerak. Matnlar tayyor, 2 hafta ichida kerak edi. Qiziqsangiz, batafsil gaplashamiz.",
    budget: 1800000,
    status: "yuborilgan",
    createdAt: hoursAgo(3),
  },
  {
    id: "o-2",
    buyerId: BUYER_ID,
    buyerName: "Jasur Toshpo'latov",
    sellerId: "u-s2",
    sellerName: "Madina Abdullayeva",
    serviceId: "s-7",
    title: "Mahsulot qadog'i dizayni",
    message:
      "Salom! Yetkazib berish xizmatimiz uchun yangi qadoq va paket dizayni kerak: 2 o'lcham quti + kraft paket. Logotipimiz bor, brend ranglariga moslash kerak.",
    budget: 1200000,
    status: "yuborilgan",
    createdAt: hoursAgo(8),
  },
];

/* Taklif xabarlari — chat taklif sahifasida boshlanadi */
export const seedOfferMessages: Message[] = [
  {
    id: "m-o1",
    contractId: "o-1",
    senderId: "u-b3",
    text: "Assalomu alaykum! Portfolio'ingizdagi brending ishlaringiz yoqdi. Yangi ochilayotgan restoranimiz uchun menyu dizayni (8 sahifa) va 3 ta tashqi banner kerak. Matnlar tayyor, 2 hafta ichida kerak edi. Qiziqsangiz, batafsil gaplashamiz.",
    createdAt: hoursAgo(3),
  },
  {
    id: "m-o2",
    contractId: "o-2",
    senderId: BUYER_ID,
    text: "Salom! Yetkazib berish xizmatimiz uchun yangi qadoq va paket dizayni kerak: 2 o'lcham quti + kraft paket. Logotipimiz bor, brend ranglariga moslash kerak.",
    createdAt: hoursAgo(8),
  },
  {
    id: "m-o3",
    contractId: "o-2",
    senderId: "u-s2",
    text: "Salom! Qiziq loyiha ekan. Quti o'lchamlari va logotip faylini yuborsangiz, aniq muddat va reja bilan javob beraman.",
    createdAt: hoursAgo(5),
  },
];

export const seedReviews: Review[] = [
  {
    id: "r-1",
    contractId: "c-4",
    sellerId: SELLER_ID,
    buyerName: "Sardor Aliyev",
    rating: 5,
    comment:
      "Ajoyib ish! Logotip kutganimdan ham chiroyli chiqdi, muddatidan oldin topshirdi. Albatta yana murojaat qilaman.",
    createdAt: daysAgo(15),
  },
  {
    id: "r-2",
    contractId: "c-old-1",
    sellerId: SELLER_ID,
    buyerName: "Malika Yusupova",
    rating: 4,
    comment:
      "Sayt sifatli chiqdi, faqat tuzatishlar biroz cho'zildi. Umuman olganda tavsiya qilaman.",
    createdAt: daysAgo(40),
  },
  /* Katalogdagi mutaxassislar profillari uchun sharhlar */
  {
    id: "r-3",
    contractId: "c-old-2",
    sellerId: "u-s2",
    buyerName: "Dilnoza Rahimova",
    rating: 5,
    comment:
      "Brend kitobi juda professional chiqdi. Har bir detal o'ylangan, bosmaxona ham fayllarni maqtadi.",
    createdAt: daysAgo(25),
  },
  {
    id: "r-4",
    contractId: "c-old-3",
    sellerId: "u-s3",
    buyerName: "Sardor Aliyev",
    rating: 4.5,
    comment:
      "Montaj sifatli, subtitrlar aniq. Bitta videoda tuzatish so'ragan edim — tez bajarib berdi.",
    createdAt: daysAgo(12),
  },
];
