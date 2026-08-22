import type { Lang } from "@/lib/i18n";

export type FaqCategory =
  | "umumiy"
  | "escrow"
  | "tolov"
  | "loyihalar"
  | "mutaxassislar"
  | "profil"
  | "tasdiqlash"
  | "xavfsizlik";

export const FAQ_CATEGORIES: { key: FaqCategory; label: Record<Lang, string> }[] = [
  { key: "umumiy", label: { uz: "Umumiy", ru: "Общее", en: "General" } },
  { key: "escrow", label: { uz: "Escrow", ru: "Эскроу", en: "Escrow" } },
  { key: "tolov", label: { uz: "To'lov", ru: "Оплата", en: "Payments" } },
  { key: "loyihalar", label: { uz: "Loyihalar", ru: "Проекты", en: "Projects" } },
  { key: "mutaxassislar", label: { uz: "Mutaxassislar", ru: "Специалисты", en: "Specialists" } },
  { key: "profil", label: { uz: "Profil", ru: "Профиль", en: "Profile" } },
  { key: "tasdiqlash", label: { uz: "Tasdiqlash", ru: "Верификация", en: "Verification" } },
  { key: "xavfsizlik", label: { uz: "Xavfsizlik", ru: "Безопасность", en: "Security" } },
];

export interface FaqItem {
  slug: string;
  category: FaqCategory;
  q: Record<Lang, string>;
  a: Record<Lang, string>;
  keywords: string[];
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    slug: "nima-bu",
    category: "umumiy",
    q: {
      uz: "Bobo&Doda nima?",
      ru: "Что такое Bobo&Doda?",
      en: "What is Bobo&Doda?",
    },
    a: {
      uz: "Bobo&Doda — Markaziy Osiyo uchun bosqichli to'lov kafolati (eskrou) bilan ishlaydigan ish bozori. Xaridorlar loyiha joylashtiradi yoki mutaxassis topadi, mutaxassislar esa ish topadi va pulini xavfsiz oladi.",
      ru: "Bobo&Doda — биржа труда для Центральной Азии с поэтапной гарантией оплаты (эскроу). Клиенты размещают проекты или находят специалистов, а специалисты находят работу и безопасно получают оплату.",
      en: "Bobo&Doda is a job marketplace for Central Asia with milestone escrow protection. Clients post projects or find specialists, and specialists find work and get paid safely.",
    },
    keywords: ["marketplace", "bozor", "eskrou", "escrow"],
  },
  {
    slug: "royxatdan-otish",
    category: "umumiy",
    q: {
      uz: "Ro'yxatdan o'tish qancha vaqt oladi?",
      ru: "Сколько времени занимает регистрация?",
      en: "How long does registration take?",
    },
    a: {
      uz: "Bir necha daqiqa: telefon raqami va parol bilan ro'yxatdan o'tasiz, rolni (mutaxassis yoki xaridor) tanlaysiz va Telegram orqali shaxsingizni tasdiqlaysiz.",
      ru: "Всего пара минут: регистрация по номеру телефона и паролю, выбор роли (специалист или клиент) и подтверждение личности через Telegram.",
      en: "Just a couple of minutes: register with your phone number and password, choose a role (specialist or client), and verify your identity via Telegram.",
    },
    keywords: ["register", "signup", "telegram"],
  },
  {
    slug: "tillar",
    category: "umumiy",
    q: {
      uz: "Platforma qaysi tillarda ishlaydi?",
      ru: "На каких языках доступна платформа?",
      en: "What languages does the platform support?",
    },
    a: {
      uz: "O'zbek, rus va ingliz tillari to'liq qo'llab-quvvatlanadi. Tilni istalgan sahifadagi til tugmasidan almashtirishingiz mumkin.",
      ru: "Полностью поддерживаются узбекский, русский и английский языки. Язык можно переключить кнопкой на любой странице.",
      en: "Uzbek, Russian, and English are fully supported. You can switch languages using the language switcher on any page.",
    },
    keywords: ["language", "til", "uz ru en"],
  },
  {
    slug: "escrow-qanday-ishlaydi",
    category: "escrow",
    q: {
      uz: "Escrow qanday ishlaydi?",
      ru: "Как работает эскроу?",
      en: "How does escrow work?",
    },
    a: {
      uz: "Taklif qabul qilingach yoki yollangach shartnoma tuziladi. Xaridor butun summani bitta to'lovda escrow hisobiga o'tkazadi — shundan keyingina ish boshlanadi. Har bir bosqich qabul qilinganda tegishli summa mutaxassisga o'tadi.",
      ru: "После принятия предложения или найма создаётся контракт. Клиент переводит всю сумму одним платежом на эскроу-счёт — только после этого начинается работа. При приёмке каждого этапа соответствующая сумма переводится специалисту.",
      en: "Once an offer is accepted or a hire is made, a contract is created. The client transfers the full amount in one payment into escrow — only then does work begin. As each milestone is approved, the corresponding amount is released to the specialist.",
    },
    keywords: ["escrow", "eskrou", "himoya", "kafolat"],
  },
  {
    slug: "tolov-qachon-chiqadi",
    category: "escrow",
    q: {
      uz: "To'lov qachon chiqariladi?",
      ru: "Когда выплачиваются деньги?",
      en: "When is payment released?",
    },
    a: {
      uz: "Mutaxassis bosqichni topshirgach, xaridorda 3 kunlik ko'rib chiqish muddati bor. Xaridor qabul qilsa yoki muddat tugasa, pul avtomatik ravishda mutaxassisga o'tadi.",
      ru: "После сдачи этапа у клиента есть 3 дня на проверку. Если клиент принимает работу или срок истекает, деньги автоматически переводятся специалисту.",
      en: "Once a milestone is submitted, the client has 3 days to review it. If the client approves it or the review period expires, funds are automatically released to the specialist.",
    },
    keywords: ["payment release", "3 kun", "review"],
  },
  {
    slug: "ish-sifatsiz-bolsa",
    category: "escrow",
    q: {
      uz: "Ish sifatsiz bo'lsa nima bo'ladi?",
      ru: "Что если работа окажется некачественной?",
      en: "What if the work quality is unsatisfactory?",
    },
    a: {
      uz: "Xaridor o'zgartirish so'rashi mumkin va mutaxassis ishni qayta topshiradi. Kelishuvga erishilmasa, nizo ochiladi — Bobo&Doda jamoasi ikkala tomonni tinglab, adolatli qaror qabul qiladi.",
      ru: "Клиент может запросить доработку, и специалист сдаёт работу заново. Если договориться не удаётся, открывается спор — команда Bobo&Doda выслушивает обе стороны и принимает справедливое решение.",
      en: "The client can request a revision, and the specialist resubmits the work. If no agreement is reached, a dispute is opened — the Bobo&Doda team reviews both sides and makes a fair decision.",
    },
    keywords: ["dispute", "nizo", "revision", "ozgartirish"],
  },
  {
    slug: "tolov-usullari",
    category: "tolov",
    q: {
      uz: "Qanday to'lov usullari qo'llab-quvvatlanadi?",
      ru: "Какие способы оплаты поддерживаются?",
      en: "What payment methods are supported?",
    },
    a: {
      uz: "Uzcard, Humo, Visa, Mastercard bank kartalari, shuningdek Payme va Click kabi mahalliy hamyonlar orqali to'lash mumkin.",
      ru: "Оплата доступна картами Uzcard, Humo, Visa, Mastercard, а также через локальные кошельки Payme и Click.",
      en: "You can pay with Uzcard, Humo, Visa, or Mastercard, as well as local wallets like Payme and Click.",
    },
    keywords: ["uzcard", "humo", "payme", "click", "visa", "mastercard"],
  },
  {
    slug: "xizmat-haqi",
    category: "tolov",
    q: {
      uz: "Xizmat haqi qancha?",
      ru: "Какая комиссия?",
      en: "What are the fees?",
    },
    a: {
      uz: "Mutaxassislar uchun har bir qabul qilingan bosqichdan 5% xizmat haqi olinadi. Xaridorlar uchun e'lon joylashtirish va taklif yuborish — hech qanday to'lovsiz, butunlay bepul.",
      ru: "Для специалистов комиссия — 5% с каждого принятого этапа. Для клиентов размещение заказов и отклики полностью бесплатны.",
      en: "For specialists, the fee is 5% of each accepted milestone. For clients, posting projects and sending offers is completely free.",
    },
    keywords: ["fee", "komissiya", "5%", "bepul"],
  },
  {
    slug: "bekor-qilingan-shartnoma",
    category: "tolov",
    q: {
      uz: "Bekor qilingan shartnomada pulim nima bo'ladi?",
      ru: "Что будет с деньгами при отмене контракта?",
      en: "What happens to my money if a contract is cancelled?",
    },
    a: {
      uz: "Escrow'da turgan, hali qabul qilinmagan mablag' xaridorning Bobo&Doda balansiga qaytadi. Bu summani istalgan payt bog'langan kartaga yechib olish mumkin. Qabul qilingan bosqichlar mutaxassisda qoladi.",
      ru: "Средства в эскроу, ещё не принятые, возвращаются на баланс Bobo&Doda клиента. Эту сумму можно в любой момент вывести на привязанную карту. Принятые этапы остаются у специалиста.",
      en: "Funds held in escrow that haven't been accepted yet are returned to the client's Bobo&Doda balance. This amount can be withdrawn to a linked card at any time. Already-accepted milestones remain with the specialist.",
    },
    keywords: ["cancel", "bekor qilish", "refund", "balans"],
  },
  {
    slug: "loyiha-joylashtirish",
    category: "loyihalar",
    q: {
      uz: "Loyihani qanday joylashtiraman?",
      ru: "Как разместить проект?",
      en: "How do I post a project?",
    },
    a: {
      uz: "Xaridor kabinetida \"E'lonlarim\" bo'limida yangi e'lon wizard'ini oching: kategoriya tanlang, sarlavha/tavsif yozing, kerakli ko'nikmalarni belgilang, byudjetni kiriting va ko'rib chiqib joylashtiring.",
      ru: "В кабинете клиента откройте мастер создания нового заказа в разделе «Мои заказы»: выберите категорию, укажите заголовок и описание, нужные навыки, бюджет и опубликуйте после проверки.",
      en: "In the client dashboard, open the new-project wizard under \"My projects\": choose a category, write a title and description, pick the required skills, set a budget, and publish after review.",
    },
    keywords: ["post project", "elon", "wizard"],
  },
  {
    slug: "takliflarni-boshqarish",
    category: "loyihalar",
    q: {
      uz: "Loyihamga kelgan takliflarni qanday boshqaraman?",
      ru: "Как управлять откликами на мой проект?",
      en: "How do I manage proposals on my project?",
    },
    a: {
      uz: "E'lon sahifasida barcha takliflar ro'yxati ko'rinadi. Har birini ko'rib chiqishingiz, suhbatga taklif qilishingiz, rad etishingiz yoki to'g'ridan-to'g'ri yollashingiz mumkin.",
      ru: "На странице заказа отображается список всех откликов. Каждый можно просмотреть, пригласить к переписке, отклонить или сразу нанять.",
      en: "The project page shows a list of all proposals. You can review each one, invite them to chat, decline them, or hire them directly.",
    },
    keywords: ["proposals", "takliflar", "hire"],
  },
  {
    slug: "yollashda-bosqichlar",
    category: "loyihalar",
    q: {
      uz: "Yollashda bosqichlarni kim belgilaydi?",
      ru: "Кто определяет этапы при найме?",
      en: "Who sets the milestones when hiring?",
    },
    a: {
      uz: "Xaridor yollash jarayonida bosqichlarni o'zi belgilaydi: har bir bosqich nomi, summasi va muddatini kiritadi. Bu bosqichda hali to'lov talab qilinmaydi — mablag'lash workroom'da keyinroq amalga oshiriladi.",
      ru: "При найме клиент сам определяет этапы: указывает название, сумму и срок каждого из них. На этом шаге оплата ещё не требуется — финансирование происходит позже, в рабочем пространстве контракта.",
      en: "During hiring, the client defines the milestones themselves: name, amount, and deadline for each one. No payment is required at this step — funding happens later, in the contract workroom.",
    },
    keywords: ["milestones", "bosqich", "hire"],
  },
  {
    slug: "taklif-yuborish",
    category: "mutaxassislar",
    q: {
      uz: "Qanday qilib taklif yuboraman?",
      ru: "Как отправить отклик?",
      en: "How do I send a proposal?",
    },
    a: {
      uz: "Ish e'lonlariga taklif yuborishingiz yoki bozordagi xaridorlarga to'g'ridan-to'g'ri to'lovsiz taklif (Offer) yuborishingiz mumkin. Ikkala holatda ham xaridor javob berguncha suhbat orqali muloqot qilasiz.",
      ru: "Вы можете отправлять отклики на заказы или напрямую отправлять бесплатное предложение (Offer) клиентам на бирже. В обоих случаях до ответа клиента вы общаетесь в чате.",
      en: "You can send proposals on job postings, or send a free direct offer to clients in the marketplace. In both cases, you communicate via chat until the client responds.",
    },
    keywords: ["proposal", "offer", "taklif"],
  },
  {
    slug: "daromad-yechish",
    category: "mutaxassislar",
    q: {
      uz: "Daromadimni qachon yechib olaman?",
      ru: "Когда я могу вывести заработок?",
      en: "When can I withdraw my earnings?",
    },
    a: {
      uz: "Bosqich qabul qilingach, summa \"Yechish mumkin\" balansingizga qo'shiladi. Daromad sahifasidan istalgan payt bog'langan kartangizga yechib olishingiz mumkin.",
      ru: "После приёмки этапа сумма добавляется в баланс «Доступно к выводу». Со страницы дохода вы можете в любой момент вывести деньги на привязанную карту.",
      en: "Once a milestone is accepted, the amount is added to your \"Available to withdraw\" balance. You can withdraw it to your linked card at any time from the earnings page.",
    },
    keywords: ["withdraw", "yechish", "daromad"],
  },
  {
    slug: "profil-korinishi",
    category: "mutaxassislar",
    q: {
      uz: "Mutaxassis profili qanday baholanadi?",
      ru: "Как оценивается профиль специалиста?",
      en: "How is a specialist's profile rated?",
    },
    a: {
      uz: "Profilingizda reyting, bajarilgan loyihalar soni va ishonch belgisi (yangi / ishonchli / top mutaxassis) ko'rinadi. Ishonch belgisi bajarilgan shartnomalar va reyting asosida avtomatik hisoblanadi.",
      ru: "В профиле отображаются рейтинг, количество выполненных проектов и значок доверия (новый / надёжный / топ-специалист). Значок доверия рассчитывается автоматически на основе завершённых контрактов и рейтинга.",
      en: "Your profile shows your rating, number of completed projects, and a trust badge (new / trusted / top specialist). The trust badge is calculated automatically from completed contracts and rating.",
    },
    keywords: ["rating", "trust badge", "reyting"],
  },
  {
    slug: "profilni-toldirish",
    category: "profil",
    q: {
      uz: "Profilni qanday to'ldiraman?",
      ru: "Как заполнить профиль?",
      en: "How do I complete my profile?",
    },
    a: {
      uz: "Kabinetingizdagi \"Profil\" bo'limida ism, bio, ko'nikmalar, portfolio va narxlaringizni kiriting. To'liqlik darajasi boshqaruv panelida foizda ko'rsatiladi.",
      ru: "В разделе «Профиль» вашего кабинета укажите имя, био, навыки, портфолио и цены. Процент заполненности отображается на панели управления.",
      en: "In the \"Profile\" section of your dashboard, fill in your name, bio, skills, portfolio, and rates. Your completeness percentage is shown on the dashboard.",
    },
    keywords: ["profile", "profil", "bio", "portfolio"],
  },
  {
    slug: "profil-katalogda-korinmayapti",
    category: "profil",
    q: {
      uz: "Profilim nega katalogda ko'rinmayapti?",
      ru: "Почему мой профиль не отображается в каталоге?",
      en: "Why isn't my profile showing in the catalog?",
    },
    a: {
      uz: "Bio maydoni bo'sh bo'lgan profillar mutaxassislar katalogida ko'rsatilmaydi. Profilingizni to'liq to'ldiring — shundan so'ng u xaridorlarga ko'rinadi.",
      ru: "Профили с пустым полем биографии не отображаются в каталоге специалистов. Заполните профиль полностью — после этого он станет виден клиентам.",
      en: "Profiles with an empty bio field are not shown in the specialist catalog. Complete your profile fully — after that, it becomes visible to clients.",
    },
    keywords: ["catalog", "katalog", "visibility"],
  },
  {
    slug: "telegram-tasdiqlash",
    category: "tasdiqlash",
    q: {
      uz: "Telegram orqali tasdiqlash nima uchun kerak?",
      ru: "Зачем нужна верификация через Telegram?",
      en: "Why is Telegram verification required?",
    },
    a: {
      uz: "Telegram tasdiqlash har bir foydalanuvchining shaxsi haqiqiy ekanini tasdiqlaydi va soxta profillardan himoya qiladi — bu butun platformadagi ishonchni ta'minlaydigan asosiy qadam.",
      ru: "Верификация через Telegram подтверждает, что личность каждого пользователя настоящая, и защищает от фейковых профилей — это ключевой шаг для доверия на всей платформе.",
      en: "Telegram verification confirms that each user's identity is real and protects against fake profiles — a key step in maintaining trust across the platform.",
    },
    keywords: ["verification", "tasdiqlash", "telegram", "otp"],
  },
  {
    slug: "tasdiqlash-jarayoni",
    category: "tasdiqlash",
    q: {
      uz: "Tasdiqlash jarayoni qanday ishlaydi?",
      ru: "Как проходит процесс верификации?",
      en: "How does the verification process work?",
    },
    a: {
      uz: "Ro'yxatdan o'tib rolni tanlagandan so'ng, oxirgi bosqichda 6 xonali tasdiqlash kodi orqali akkountingiz faollashtiriladi. Shundan keyingina kabinetingizga kirasiz.",
      ru: "После регистрации и выбора роли на последнем шаге ваш аккаунт активируется с помощью 6-значного кода подтверждения. Только после этого вы получаете доступ в кабинет.",
      en: "After registering and choosing a role, your account is activated in the final step using a 6-digit verification code. Only then do you get access to your dashboard.",
    },
    keywords: ["6 digit code", "kod", "verify"],
  },
  {
    slug: "karta-malumotlari",
    category: "xavfsizlik",
    q: {
      uz: "Karta ma'lumotlarim xavfsizmi?",
      ru: "Безопасны ли данные моей карты?",
      en: "Is my card information safe?",
    },
    a: {
      uz: "To'liq karta raqami hech qachon saqlanmaydi — faqat oxirgi 4 raqam, karta turi va egasi ko'rinadi. Kartani faqat o'zingiz qo'shishingiz va o'chirishingiz mumkin.",
      ru: "Полный номер карты никогда не сохраняется — видны только последние 4 цифры, тип карты и владелец. Добавлять и удалять карту можете только вы сами.",
      en: "The full card number is never stored — only the last 4 digits, card type, and holder name are shown. Only you can add or remove your own cards.",
    },
    keywords: ["card", "karta", "security"],
  },
  {
    slug: "nizo-hal-qilish",
    category: "xavfsizlik",
    q: {
      uz: "Nizo qanday hal qilinadi?",
      ru: "Как разрешаются споры?",
      en: "How are disputes resolved?",
    },
    a: {
      uz: "Nizo ochilganda tegishli mablag' muzlatiladi. Ikkala tomon o'z dalillarini taqdim etadi, Bobo&Doda jamoasi ularni ko'rib chiqib adolatli qaror qabul qiladi.",
      ru: "При открытии спора соответствующая сумма замораживается. Обе стороны предоставляют свои доказательства, команда Bobo&Doda рассматривает их и принимает справедливое решение.",
      en: "When a dispute is opened, the relevant funds are frozen. Both sides submit their evidence, and the Bobo&Doda team reviews it and makes a fair decision.",
    },
    keywords: ["dispute", "nizo", "resolution"],
  },
];
