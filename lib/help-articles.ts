import type { Lang } from "@/lib/i18n";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";

export type HelpCategory =
  | "tolov"
  | "escrow"
  | "loyihalar"
  | "profil"
  | "mutaxassis"
  | "xavfsizlik"
  | "account";

export const HELP_CATEGORIES: { key: HelpCategory; label: Record<Lang, string> }[] = [
  { key: "tolov", label: { uz: "To'lov", ru: "Оплата", en: "Payments" } },
  { key: "escrow", label: { uz: "Escrow", ru: "Эскроу", en: "Escrow" } },
  { key: "loyihalar", label: { uz: "Loyihalar", ru: "Проекты", en: "Projects" } },
  { key: "profil", label: { uz: "Profil", ru: "Профиль", en: "Profile" } },
  { key: "mutaxassis", label: { uz: "Mutaxassis", ru: "Специалист", en: "Specialist" } },
  { key: "xavfsizlik", label: { uz: "Xavfsizlik", ru: "Безопасность", en: "Security" } },
  { key: "account", label: { uz: "Account", ru: "Аккаунт", en: "Account" } },
];

export interface HelpArticle {
  slug: string;
  category: HelpCategory;
  title: Record<Lang, string>;
  summary: Record<Lang, string>;
  content: Record<Lang, string[]>;
  related: string[];
  keywords: string[];
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "escrow-qanday-ishlaydi",
    category: "escrow",
    title: {
      uz: "Escrow qanday ishlaydi?",
      ru: "Как работает эскроу?",
      en: "How does escrow work?",
    },
    summary: {
      uz: "Bosqichli to'lov kafolati — pul qachon va qanday himoyalanadi, qachon mutaxassisga o'tadi.",
      ru: "Поэтапная гарантия оплаты — когда и как деньги защищены, когда переходят специалисту.",
      en: "Milestone escrow — when and how your money is protected, and when it reaches the specialist.",
    },
    content: {
      uz: [
        "Taklif qabul qilingach yoki yollash amalga oshirilgach, shartnoma \"imzolangan\" holatda yaratiladi. Bu bosqichda hali hech qanday to'lov talab qilinmaydi.",
        "Xaridor workroom'da butun shartnoma summasini bitta to'lovda escrow hisobiga o'tkazadi. Shundan so'ng shartnoma \"faol\" holatga o'tadi va barcha bosqichlar mablag'langan deb belgilanadi — mutaxassis ishni boshlashi mumkin.",
        "Mutaxassis har bir bosqichni topshirganda, xaridorda 3 kunlik ko'rib chiqish muddati boshlanadi. Xaridor ishni qabul qilishi, o'zgartirish so'rashi mumkin, yoki hech narsa qilmasa — muddat tugagach bosqich avtomatik qabul qilinadi.",
        "Bosqich qabul qilinishi bilan tegishli summa darhol mutaxassisning \"Yechish mumkin\" balansiga o'tadi. Barcha bosqichlar qabul qilinsa, shartnoma yakunlangan deb belgilanadi.",
      ],
      ru: [
        "После принятия предложения или найма контракт создаётся в статусе «подписан». На этом этапе оплата ещё не требуется.",
        "Клиент в рабочем пространстве переводит всю сумму контракта одним платежом на эскроу-счёт. После этого контракт переходит в статус «активен», а все этапы отмечаются как профинансированные — специалист может начинать работу.",
        "Когда специалист сдаёт этап, у клиента начинается 3-дневный период проверки. Клиент может принять работу, запросить доработку, либо, если ничего не сделает — по истечении срока этап принимается автоматически.",
        "Как только этап принят, соответствующая сумма сразу переходит в баланс специалиста «Доступно к выводу». Когда приняты все этапы, контракт отмечается как завершённый.",
      ],
      en: [
        "Once an offer is accepted or a hire is made, the contract is created in a \"signed\" state. No payment is required at this point.",
        "In the contract workroom, the client transfers the full contract amount in a single payment into escrow. The contract then becomes \"active\" and all milestones are marked as funded — the specialist can start work.",
        "When the specialist submits a milestone, a 3-day review period starts for the client. The client can approve the work, request a revision, or — if they take no action — the milestone is auto-approved once the period ends.",
        "The moment a milestone is approved, the corresponding amount moves straight into the specialist's \"Available to withdraw\" balance. Once every milestone is approved, the contract is marked as completed.",
      ],
    },
    related: ["tolov-qachon-chiqadi", "shartnomani-bekor-qilish", "nizolarni-hal-qilish"],
    keywords: ["escrow", "eskrou", "milestone", "bosqich"],
  },
  {
    slug: "tolov-qachon-chiqadi",
    category: "escrow",
    title: {
      uz: "To'lov qachon chiqariladi?",
      ru: "Когда выплачиваются деньги?",
      en: "When is payment released?",
    },
    summary: {
      uz: "Bosqich topshirilgandan qabul qilinguncha bo'lgan 3 kunlik jarayon qanday ishlaydi.",
      ru: "Как работает 3-дневный процесс от сдачи этапа до его приёмки.",
      en: "How the 3-day process from milestone submission to approval works.",
    },
    content: {
      uz: [
        "Mutaxassis bosqichni \"topshirildi\" holatiga o'tkazganda, xaridorga bildirishnoma boradi va 3 kunlik ko'rib chiqish sanog'i boshlanadi (workroom'da countdown ko'rinadi).",
        "Xaridor shu muddat ichida ishni qabul qilishi yoki aniq izoh bilan o'zgartirish so'rashi mumkin. O'zgartirish so'ralsa, mutaxassis ishni qayta topshiradi va 3 kunlik muddat yangidan boshlanadi.",
        "Agar xaridor hech qanday harakat qilmasa, muddat tugagach bosqich avtomatik qabul qilinadi — bu mutaxassisni asossiz kechikishlardan himoya qiladi.",
        "To'lov chiqarilgandan so'ng summa mutaxassisning Daromad sahifasidagi \"Yechish mumkin\" balansiga qo'shiladi va istalgan payt bog'langan kartaga yechib olinishi mumkin.",
      ],
      ru: [
        "Когда специалист переводит этап в статус «сдан», клиенту приходит уведомление и начинается отсчёт 3-дневного периода проверки (в рабочем пространстве виден таймер).",
        "В течение этого срока клиент может принять работу или запросить доработку с конкретным комментарием. При запросе доработки специалист сдаёт этап заново, и 3-дневный срок начинается заново.",
        "Если клиент не предпринимает никаких действий, по истечении срока этап принимается автоматически — это защищает специалиста от необоснованных задержек.",
        "После выплаты сумма добавляется в баланс специалиста «Доступно к выводу» на странице дохода и может быть выведена на привязанную карту в любой момент.",
      ],
      en: [
        "When the specialist moves a milestone to \"submitted\", the client is notified and a 3-day review countdown starts (visible in the workroom).",
        "During this window the client can approve the work or request a revision with a specific comment. If a revision is requested, the specialist resubmits and the 3-day period restarts.",
        "If the client takes no action, the milestone auto-approves once the period ends — protecting the specialist from indefinite delays.",
        "Once released, the amount is added to the specialist's \"Available to withdraw\" balance on the earnings page and can be withdrawn to a linked card at any time.",
      ],
    },
    related: ["escrow-qanday-ishlaydi", "bank-kartalarini-boshqarish", "nizolarni-hal-qilish"],
    keywords: ["payment release", "3 kun", "review", "countdown"],
  },
  {
    slug: "tolov-usullari-va-komissiya",
    category: "tolov",
    title: {
      uz: "To'lov usullari va komissiya",
      ru: "Способы оплаты и комиссия",
      en: "Payment methods and fees",
    },
    summary: {
      uz: "Qaysi kartalar va hamyonlar qo'llab-quvvatlanadi, komissiya qanday hisoblanadi.",
      ru: "Какие карты и кошельки поддерживаются, как рассчитывается комиссия.",
      en: "Which cards and wallets are supported, and how fees are calculated.",
    },
    content: {
      uz: [
        "Escrou'ni mablag'lashda bank kartasi (Uzcard, Humo, Visa, Mastercard) yoki mahalliy hamyon (Payme, Click) tanlashingiz mumkin. To'lov SMS-kod bilan tasdiqlanadi.",
        "Xaridorlar uchun platforma bepul: loyiha joylashtirish, taklif yuborish va yollash uchun hech qanday to'lov olinmaydi.",
        `Mutaxassislar uchun xizmat haqi — har bir qabul qilingan bosqichdan ${PLATFORM_FEE_PERCENT}%. Boshqa yashirin to'lov, obuna yoki qo'shimcha komissiya yo'q.`,
        "Bank kartasi ma'lumotlari to'liq saqlanmaydi — faqat oxirgi 4 raqam, tur va muddat ko'rinadi. Kartalarni Sozlamalar bo'limida boshqarishingiz mumkin.",
      ],
      ru: [
        "При финансировании эскроу можно выбрать банковскую карту (Uzcard, Humo, Visa, Mastercard) или локальный кошелёк (Payme, Click). Платёж подтверждается SMS-кодом.",
        "Для клиентов платформа бесплатна: размещение проекта, отправка предложений и найм не облагаются никакой платой.",
        `Для специалистов комиссия — ${PLATFORM_FEE_PERCENT}% с каждого принятого этапа. Никаких скрытых платежей, подписок или дополнительных комиссий нет.`,
        "Данные банковской карты не сохраняются полностью — видны только последние 4 цифры, тип и срок действия. Управлять картами можно в разделе «Настройки».",
      ],
      en: [
        "When funding escrow, you can choose a bank card (Uzcard, Humo, Visa, Mastercard) or a local wallet (Payme, Click). Payment is confirmed with an SMS code.",
        "The platform is free for clients: posting projects, sending offers, and hiring carry no charge at all.",
        `For specialists, the fee is ${PLATFORM_FEE_PERCENT}% of each accepted milestone. There are no hidden fees, subscriptions, or extra charges.`,
        "Card details are never stored in full — only the last 4 digits, type, and expiry are kept. You can manage your cards in Settings.",
      ],
    },
    related: ["bank-kartalarini-boshqarish", "escrow-qanday-ishlaydi", "shartnomani-bekor-qilish"],
    keywords: ["payment", "tolov", "fee", "komissiya", "uzcard", "humo", "payme", "click"],
  },
  {
    slug: "bank-kartalarini-boshqarish",
    category: "tolov",
    title: {
      uz: "Bank kartalarini boshqarish",
      ru: "Управление банковскими картами",
      en: "Managing bank cards",
    },
    summary: {
      uz: "Karta qo'shish, o'chirish va yechish uchun qaysi kartani tanlash.",
      ru: "Как добавить, удалить карту и выбрать карту для вывода средств.",
      en: "How to add, remove, and choose a card for withdrawals.",
    },
    content: {
      uz: [
        "Sozlamalar bo'limidagi karta menejeridan yangi karta qo'shishingiz mumkin: karta raqami, egasi va amal qilish muddati kiritiladi. Tizim karta turini (Uzcard/Humo/Visa/Mastercard) avtomatik aniqlaydi.",
        "Escrou'ni mablag'lash yoki mablag' yechishda qaysi kartadan foydalanishni har safar tanlashingiz mumkin.",
        "O'zingizga tegishli bo'lmagan kartaga pul yechib bo'lmaydi — egalik har doim tekshiriladi.",
        "Kerak bo'lmagan kartani istalgan payt ro'yxatdan o'chirib tashlashingiz mumkin.",
      ],
      ru: [
        "В менеджере карт в разделе «Настройки» можно добавить новую карту: указываются номер, владелец и срок действия. Система автоматически определяет тип карты (Uzcard/Humo/Visa/Mastercard).",
        "При финансировании эскроу или выводе средств каждый раз можно выбрать нужную карту.",
        "Вывести средства на чужую карту невозможно — принадлежность всегда проверяется.",
        "Ненужную карту можно удалить из списка в любой момент.",
      ],
      en: [
        "In the card manager under Settings, you can add a new card: number, holder, and expiry are entered, and the system automatically detects the card type (Uzcard/Humo/Visa/Mastercard).",
        "When funding escrow or withdrawing funds, you choose which card to use each time.",
        "You can never withdraw to a card that isn't yours — ownership is always verified.",
        "You can remove a card from the list at any time.",
      ],
    },
    related: ["tolov-usullari-va-komissiya", "escrow-qanday-ishlaydi"],
    keywords: ["card", "karta", "withdraw", "yechish"],
  },
  {
    slug: "loyiha-joylashtirish",
    category: "loyihalar",
    title: {
      uz: "Loyihani qanday joylashtirish kerak?",
      ru: "Как разместить проект?",
      en: "How to post a project",
    },
    summary: {
      uz: "5 bosqichli wizard orqali ish e'loni yaratish qadamlari.",
      ru: "Шаги создания заказа через мастер из 5 шагов.",
      en: "The steps for creating a job posting through the 5-step wizard.",
    },
    content: {
      uz: [
        "Xaridor kabinetidagi \"E'lonlarim\" bo'limidan yangi e'lon yaratish mumkin. Birinchi qadamda kategoriya tanlanadi.",
        "Keyingi qadamda sarlavha va batafsil tavsif yoziladi — bu mutaxassislarga ishning mohiyatini tushuntiradi.",
        "Kerakli ko'nikmalar va ixtiyoriy skrining savollari (uchtagacha) qo'shiladi — bu takliflarni saralashda yordam beradi.",
        "Byudjet kiritiladi, so'ng barcha ma'lumotlar ko'rib chiqiladi va e'lon joylashtiriladi. Bu bosqichda hech qanday to'lov talab qilinmaydi.",
        "E'lon joylashtirilgach, mutaxassislar taklif yubora boshlaydi. Takliflarni e'lon sahifasida ko'rib, kimni yollashni tanlashingiz mumkin.",
      ],
      ru: [
        "Новый заказ можно создать в разделе «Мои заказы» кабинета клиента. На первом шаге выбирается категория.",
        "На следующем шаге пишутся заголовок и подробное описание — это объясняет специалистам суть работы.",
        "Добавляются нужные навыки и, по желанию, до трёх отсеивающих вопросов — это помогает сортировать отклики.",
        "Указывается бюджет, затем все данные проверяются и заказ публикуется. На этом этапе оплата не требуется.",
        "После публикации специалисты начинают присылать отклики. Их можно просмотреть на странице заказа и выбрать, кого нанять.",
      ],
      en: [
        "A new project can be created under \"My projects\" in the client dashboard. The first step is choosing a category.",
        "Next, you write a title and a detailed description — this explains the nature of the work to specialists.",
        "Required skills and up to three optional screening questions are added — these help sort incoming proposals.",
        "A budget is entered, then everything is reviewed and the project is published. No payment is required at this stage.",
        "Once published, specialists start sending proposals. You can review them on the project page and choose who to hire.",
      ],
    },
    related: ["taklif-yuborish-va-yollash", "loyiha-takliflarini-boshqarish"],
    keywords: ["post project", "elon", "wizard", "job"],
  },
  {
    slug: "loyiha-takliflarini-boshqarish",
    category: "loyihalar",
    title: {
      uz: "Loyihaga kelgan takliflarni boshqarish",
      ru: "Управление откликами на заказ",
      en: "Managing proposals on your project",
    },
    summary: {
      uz: "Takliflarni ko'rib chiqish, suhbatga taklif qilish, rad etish va yollash.",
      ru: "Просмотр откликов, приглашение к переписке, отклонение и найм.",
      en: "Reviewing, chatting with, declining, and hiring from proposals.",
    },
    content: {
      uz: [
        "E'lon sahifasini ochganingizda yangi takliflar avtomatik \"ko'rib chiqilmoqda\" holatiga o'tadi.",
        "Har bir taklifni ko'rib, mutaxassis bilan suhbatga o'tishingiz, rad etishingiz yoki to'g'ridan-to'g'ri yollashingiz mumkin.",
        "Yollashda bosqichlarni (nom, summa, muddat) o'zingiz belgilaysiz. Bu bosqichda hali to'lov talab qilinmaydi.",
        "Bitta mutaxassis yollangach, e'lonni yopishingiz mumkin — bu qolgan barcha faol takliflarni avtomatik rad etadi va tegishli mutaxassislarga bildirishnoma yuboradi.",
      ],
      ru: [
        "При открытии страницы заказа новые отклики автоматически переходят в статус «на рассмотрении».",
        "Каждый отклик можно просмотреть, пригласить специалиста к переписке, отклонить или сразу нанять.",
        "При найме вы сами определяете этапы (название, сумма, срок). На этом этапе оплата ещё не требуется.",
        "После найма одного специалиста заказ можно закрыть — это автоматически отклонит все остальные активные отклики и уведомит соответствующих специалистов.",
      ],
      en: [
        "When you open the project page, new proposals automatically move to \"under review\".",
        "You can review each proposal, invite the specialist to chat, decline them, or hire them directly.",
        "When hiring, you define the milestones yourself (name, amount, deadline). No payment is required at this step.",
        "Once one specialist is hired, you can close the project — this automatically declines all remaining active proposals and notifies the relevant specialists.",
      ],
    },
    related: ["loyiha-joylashtirish", "escrow-qanday-ishlaydi"],
    keywords: ["proposals", "takliflar", "hire", "yollash"],
  },
  {
    slug: "taklif-yuborish-va-yollash",
    category: "mutaxassis",
    title: {
      uz: "Taklif qanday yuboriladi?",
      ru: "Как отправить отклик?",
      en: "How to send a proposal",
    },
    summary: {
      uz: "Ish e'lonlariga taklif yuborish va xaridorlarga to'g'ridan-to'g'ri murojaat qilish.",
      ru: "Отклики на заказы и прямое обращение к клиентам.",
      en: "Sending proposals on job postings and reaching out to clients directly.",
    },
    content: {
      uz: [
        "Ish e'lonlari ro'yxatida o'zingizga mos loyihani topib, taklif yuborishingiz mumkin — bunda narx va qisqa xabar kiritiladi.",
        "Shuningdek, bozordagi biror xaridor profiliga to'g'ridan-to'g'ri to'lovsiz taklif (Offer) yuborishingiz mumkin — bu holatda taxminiy byudjet va xabar ko'rsatiladi.",
        "Bitta xaridorga bir vaqtda faqat bitta kutilayotgan taklif yuborish mumkin. Xaridor javob berguncha taklif chatida yozishishingiz mumkin.",
        "Xaridor taklifni qabul qilsa, shartnoma avtomatik yaratiladi va workroom'ga o'tasiz.",
      ],
      ru: [
        "В списке заказов можно найти подходящий проект и отправить отклик — указываются цена и краткое сообщение.",
        "Также можно отправить прямое бесплатное предложение (Offer) в профиль клиента на бирже — в этом случае указываются примерный бюджет и сообщение.",
        "Одному клиенту одновременно можно отправить только одно ожидающее предложение. До ответа клиента можно переписываться в чате предложения.",
        "Если клиент принимает предложение, контракт создаётся автоматически, и вы переходите в рабочее пространство.",
      ],
      en: [
        "In the job listings, you can find a matching project and send a proposal — including your price and a short message.",
        "You can also send a free direct offer to a client's profile in the marketplace — in this case you provide an estimated budget and a message.",
        "Only one pending offer can be sent to a given client at a time. You can chat within the offer thread until the client responds.",
        "If the client accepts the offer, a contract is created automatically and you move into the workroom.",
      ],
    },
    related: ["loyiha-takliflarini-boshqarish", "profilni-toliq-toldirish"],
    keywords: ["proposal", "offer", "taklif"],
  },
  {
    slug: "profilni-toliq-toldirish",
    category: "profil",
    title: {
      uz: "Profilni to'liq to'ldirish",
      ru: "Полное заполнение профиля",
      en: "Completing your profile",
    },
    summary: {
      uz: "Profil nima uchun to'liq bo'lishi kerak va u qanday baholanadi.",
      ru: "Почему профиль должен быть заполнен полностью и как он оценивается.",
      en: "Why your profile needs to be complete and how it gets rated.",
    },
    content: {
      uz: [
        "Mutaxassis profilida ism, bio, ko'nikmalar, portfolio namunalari va narxlar ko'rsatiladi. Bio bo'sh bo'lgan profillar mutaxassislar katalogida ko'rinmaydi.",
        "Boshqaruv panelida profil to'liqligi foizda ko'rsatiladi — 100% ga yetguncha eslatma turadi, shundan keyin yashiriladi.",
        "Reyting va bajarilgan loyihalar soniga qarab profilga avtomatik ishonch belgisi (yangi / ishonchli / top mutaxassis) beriladi.",
        "To'liq va aniq profil xaridorlarning e'tiborini tortish va ko'proq taklif olish ehtimolini oshiradi.",
      ],
      ru: [
        "В профиле специалиста указываются имя, био, навыки, примеры портфолио и цены. Профили с пустым био не отображаются в каталоге специалистов.",
        "На панели управления заполненность профиля показывается в процентах — напоминание отображается, пока не достигнуто 100%, после чего скрывается.",
        "В зависимости от рейтинга и количества выполненных проектов профилю автоматически присваивается значок доверия (новый / надёжный / топ-специалист).",
        "Полный и точный профиль повышает шансы привлечь внимание клиентов и получить больше откликов.",
      ],
      en: [
        "A specialist profile shows name, bio, skills, portfolio samples, and rates. Profiles with an empty bio are not shown in the specialist catalog.",
        "The dashboard shows profile completeness as a percentage — a reminder appears until it reaches 100%, then it's hidden.",
        "Based on rating and completed project count, a trust badge (new / trusted / top specialist) is assigned automatically.",
        "A complete, accurate profile increases your chances of catching a client's attention and receiving more proposals.",
      ],
    },
    related: ["taklif-yuborish-va-yollash", "telegram-orqali-tasdiqlash"],
    keywords: ["profile", "profil", "bio", "trust badge"],
  },
  {
    slug: "telegram-orqali-tasdiqlash",
    category: "account",
    title: {
      uz: "Telegram orqali tasdiqlash",
      ru: "Верификация через Telegram",
      en: "Verifying your account via Telegram",
    },
    summary: {
      uz: "Ro'yxatdan o'tish oxirida shaxsni tasdiqlash bosqichi qanday ishlaydi.",
      ru: "Как работает финальный этап подтверждения личности при регистрации.",
      en: "How the final identity-verification step during registration works.",
    },
    content: {
      uz: [
        "Ro'yxatdan o'tib rolni tanlagach (mutaxassis uchun profil bosqichidan so'ng), oqim shaxsni Telegram orqali tasdiqlash bilan yakunlanadi.",
        "Tasdiqlash 6 xonali kod orqali amalga oshiriladi. Kod tasdiqlangach akkountingiz faollashadi va kabinetga yo'naltirilasiz.",
        "Tasdiqlangan foydalanuvchilar boshqa xaridor/mutaxassislar uchun ishonch belgisi sifatida ko'rinadi — bu platformadagi umumiy xavfsizlikni oshiradi.",
        "Sessiya to'xtab qolsa ham tashvishlanmang: keyingi safar kirganingizda tizim onboarding qayerda to'xtaganini eslab, o'sha bosqichdan davom ettiradi.",
      ],
      ru: [
        "После регистрации и выбора роли (для специалистов — после этапа заполнения профиля) процесс завершается верификацией личности через Telegram.",
        "Подтверждение происходит через 6-значный код. После подтверждения аккаунт активируется и вы переходите в кабинет.",
        "Подтверждённые пользователи отображаются как знак доверия для других клиентов/специалистов — это повышает общую безопасность платформы.",
        "Не переживайте, если сессия прервётся: при следующем входе система вспомнит, на каком шаге вы остановились, и продолжит именно с него.",
      ],
      en: [
        "After registering and choosing a role (for specialists, after the profile step), the flow ends with identity verification via Telegram.",
        "Verification uses a 6-digit code. Once confirmed, your account is activated and you're redirected to your dashboard.",
        "Verified users are shown as a trust signal to other clients/specialists — this strengthens overall platform safety.",
        "Don't worry if your session is interrupted: next time you log in, the system remembers where onboarding stopped and continues from there.",
      ],
    },
    related: ["profilni-toliq-toldirish", "nizolarni-hal-qilish"],
    keywords: ["verification", "tasdiqlash", "telegram", "otp", "6 digit"],
  },
  {
    slug: "nizolarni-hal-qilish",
    category: "xavfsizlik",
    title: {
      uz: "Nizolar qanday hal qilinadi?",
      ru: "Как разрешаются споры?",
      en: "How disputes are resolved",
    },
    summary: {
      uz: "Kelishmovchilik yuzaga kelganda mablag' qanday himoyalanadi va qaror qanday chiqariladi.",
      ru: "Как защищаются средства при возникновении конфликта и как принимается решение.",
      en: "How funds are protected when a conflict arises and how a decision is reached.",
    },
    content: {
      uz: [
        "Bosqich bo'yicha kelishmovchilik chiqsa, avval o'zgartirish so'rash tavsiya etiladi — bu ko'pincha muammoni tezroq hal qiladi.",
        "Kelishuvga erishilmasa, ikkala tomon ham nizo ochishi mumkin. Nizo ochilgach, tegishli bosqich summasi muzlatiladi — hech kimga o'tmaydi.",
        "Har ikki tomon o'z dalillarini (yozishmalar, fayllar, izohlar) taqdim etadi. Bobo&Doda jamoasi ularni ko'rib chiqib, adolatli qaror qabul qiladi.",
        "Qaror chiqqach, muzlatilgan summa qarorga muvofiq mutaxassisga o'tkaziladi yoki xaridor balansiga qaytariladi.",
      ],
      ru: [
        "При разногласии по этапу сначала рекомендуется запросить доработку — это часто решает проблему быстрее.",
        "Если договориться не удаётся, любая из сторон может открыть спор. После открытия спора сумма соответствующего этапа замораживается — она никому не переводится.",
        "Обе стороны предоставляют свои доказательства (переписку, файлы, комментарии). Команда Bobo&Doda рассматривает их и принимает справедливое решение.",
        "После вынесения решения замороженная сумма либо переводится специалисту, либо возвращается на баланс клиента — в соответствии с решением.",
      ],
      en: [
        "If there's disagreement over a milestone, requesting a revision first is recommended — it often resolves things faster.",
        "If no agreement is reached, either side can open a dispute. Once opened, the milestone's funds are frozen — they go to no one.",
        "Both sides submit their evidence (messages, files, comments). The Bobo&Doda team reviews it and makes a fair decision.",
        "Once a decision is made, the frozen amount is either released to the specialist or returned to the client's balance, according to the ruling.",
      ],
    },
    related: ["escrow-qanday-ishlaydi", "shartnomani-bekor-qilish"],
    keywords: ["dispute", "nizo", "conflict", "resolution"],
  },
  {
    slug: "shartnomani-bekor-qilish",
    category: "escrow",
    title: {
      uz: "Shartnomani bekor qilish va pulni qaytarish",
      ru: "Отмена контракта и возврат средств",
      en: "Cancelling a contract and getting refunded",
    },
    summary: {
      uz: "Mablag'langan shartnoma bekor qilinsa pul qayerga boradi.",
      ru: "Куда уходят деньги при отмене профинансированного контракта.",
      en: "Where the money goes when a funded contract is cancelled.",
    },
    content: {
      uz: [
        "Shartnoma \"imzolangan\" yoki \"faol\" holatida bo'lsa, uni bekor qilish mumkin. Agar topshirilgan (hali ko'rib chiqilmagan) bosqich bo'lsa, bekor qilish bloklanadi — avval shu bosqich hal qilinishi kerak.",
        "Escrou'da turgan, hali qabul qilinmagan mablag' xaridorning Bobo&Doda balansiga qaytariladi.",
        "Qabul qilingan bosqichlar uchun to'lov mutaxassisda qoladi — bekor qilish faqat hali ishlanmagan/qabul qilinmagan qismga tegishli.",
        "Balansdagi mablag'ni Xarajatlar sahifasidan istalgan payt bog'langan kartaga yechib olishingiz mumkin.",
      ],
      ru: [
        "Контракт можно отменить, если он находится в статусе «подписан» или «активен». Если есть сданный (ещё не проверенный) этап, отмена блокируется — сначала нужно решить вопрос по нему.",
        "Средства в эскроу, ещё не принятые, возвращаются на баланс Bobo&Doda клиента.",
        "Оплата за принятые этапы остаётся у специалиста — отмена касается только ещё не выполненной/не принятой части.",
        "Средства с баланса можно в любой момент вывести на привязанную карту со страницы «Расходы».",
      ],
      en: [
        "A contract can be cancelled while it's \"signed\" or \"active\". If a milestone has been submitted and not yet reviewed, cancellation is blocked until that milestone is resolved.",
        "Funds sitting in escrow that haven't been accepted yet are returned to the client's Bobo&Doda balance.",
        "Payment for already-accepted milestones stays with the specialist — cancellation only affects the not-yet-completed/accepted portion.",
        "Balance funds can be withdrawn to a linked card at any time from the Expenses page.",
      ],
    },
    related: ["escrow-qanday-ishlaydi", "bank-kartalarini-boshqarish"],
    keywords: ["cancel", "bekor qilish", "refund", "balans"],
  },
];
