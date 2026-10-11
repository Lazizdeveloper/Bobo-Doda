"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LangSwitch } from "@/components/shared/LangSwitch";
import { Logo } from "@/components/shared/Logo";
import { Card } from "@/components/ui/Card";
import { useT, type Lang } from "@/lib/i18n";

type LegalKind = "terms" | "privacy" | "offer";

interface LegalDoc {
  title: string;
  intro: string;
  dateText: string;
  sections: [string, string][];
}

const COMPANY_INFO: Record<
  Lang,
  {
    title: string;
    entityName: string;
    stir: string;
    address: string;
    phone: string;
    email: string;
    license: string;
  }
> = {
  uz: {
    title: "Yuridik rekvizitlar va rasmiy ma'lumotlar",
    entityName: "Kompaniya: «BOBOLOLADONO SOLUTIONS» Mas'uliyati Cheklangan Jamiyati (MCHJ)",
    stir: "STIR (INN): 309876543",
    address: "Yuridik manzil: O'zbekiston Respublikasi, 100015, Toshkent shahri, Mirobod tumani, Nukus ko'chasi, 29-uy",
    phone: "Aloqa telefoni: +998 (71) 200-40-50",
    email: "Elektron pochta: legal@bobololadono.uz, support@bobololadono.uz",
    license: "Faoliyat turi: Axborot texnologiyalari va raqamli elektron xizmatlar ko'rsatish vositachiligi",
  },
  ru: {
    title: "Юридические реквизиты и контакты",
    entityName: "Компания: ООО «BOBOLOLADONO SOLUTIONS»",
    stir: "ИНН: 309876543",
    address: "Юридический адрес: Республика Узбекистан, 100015, г. Ташкент, Мирабадский район, ул. Нукус, д. 29",
    phone: "Телефон: +998 (71) 200-40-50",
    email: "Электронная почта: legal@bobololadono.uz, support@bobololadono.uz",
    license: "Вид деятельности: Посреднические цифровые услуги и информационные технологии",
  },
  en: {
    title: "Legal Entity Details & Official Contacts",
    entityName: "Company: LLC «BOBOLOLADONO SOLUTIONS»",
    stir: "Tax ID (TIN): 309876543",
    address: "Registered address: 29 Nukus Street, Mirobod district, Tashkent, 100015, Republic of Uzbekistan",
    phone: "Contact phone: +998 (71) 200-40-50",
    email: "Email: legal@bobololadono.uz, support@bobololadono.uz",
    license: "Business activities: Digital platform mediation and IT services",
  },
};

const CONTENT: Record<LegalKind, Record<Lang, LegalDoc>> = {
  terms: {
    uz: {
      title: "Foydalanish shartlari",
      intro:
        "Ushbu hujjat «BOBOLOLADONO SOLUTIONS» MCHJ platformasidan foydalanish bo'yicha barcha huquqiy me'yorlar, taraflarning majburiyatlari va kafolatlarini tartibga soluvchi rasmiy kelishuv hisoblanadi.",
      dateText: "Oxirgi tahrir: 2026-yil 1-mart",
      sections: [
        [
          "1. Umumiy qoidalar va platformaning maqomi",
          "Bobololadono — raqamli xizmatlar bo'yicha buyurtmachilar (xaridorlar) hamda erkin ijrochilar (mutaxassislar) o'rtasida shartnomalar tuzish, xavfsiz to'lovlar kafolatini ta'minlash va bajarilgan ishlarni qabul qilishga ko'maklashuvchi axborot-texnologik platformadir. Platforma to'g'ridan-to'g'ri ish beruvchi hisoblanmaydi, balki mustaqil taraflar o'rtasidagi bitimlarni kafolatlovchi vositachi sifatida faoliyat yuritadi.",
        ],
        [
          "2. Foydalanuvchi hisobi, xavfsizlik va verifikatsiya",
          "Foydalanuvchi ro'yxatdan o'tish paytida faqat ishonchli va to'g'ri ma'lumotlarni taqdim etishi shart. Har bir foydalanuvchi bitta shaxsiy hisobga ega bo'lish huquqiga ega. Shaxsni tasdiqlash (KYC) talab qilinganda haqiqiy shaxsiy ma'lumotlar taqdim etilishi kerak. Hisob ma'lumotlarini (parol, bir martalik tasdiqlash kodlari) uchinchi shaxslarga berish qat'iyan man etiladi. Hisobdan ruxsatsiz foydalanish holatlari aniqlanganda, platforma ma'muriyatini zudlik bilan xabardor qilish shart.",
        ],
        [
          "3. Buyurtmalar, loyihalar va topshiriqlarni rasmiylashtirish",
          "Barcha kelishuvlar, texnik topshiriqlar, narxlar va muddatlar platformaning ichki tizimida qat'iy qayd etiladi. Ishlarni bajarish va to'lovlarni amalga oshirish jarayonini platformadan tashqariga olib chiqish, tashqi messenjerlarda to'lovlarni to'g'ridan-to'g'ri amalga oshirishga urinish taqiqlanadi. Bunday qoidabuzarliklar aniqlangan taqdirda, foydalanuvchilarning hisoblari muzlatilishi va ularga xizmat ko'rsatish to'xtatilishi mumkin.",
        ],
        [
          "4. Escrow (Eskrou) kafolati va bosqichli to'lovlar tartibi",
          "Platformada barcha to'lovlar xavfsiz Escrow kafolat mexanizmi orqali amalga oshiriladi. Xaridor loyiha summasini platformaning maxsus depozit hisobida zaxiralaydi. Mablag' mutaxassisga faqat belgilangan bosqich to'liq topshirilib, xaridor tomonidan qabul qilingandan keyingina o'tkaziladi. Mutaxassis ishni topshirgach, xaridorga natijani tekshirish uchun 3 (uch) kalendar kuni beriladi. Ushbu muddatda e'tiroz bildirilmasa, bosqich avtomatik tarzda qabul qilingan deb hisoblanadi va mablag' mutaxassis balansiga o'tkaziladi.",
        ],
        [
          "5. Nizolarni ko'rib chiqish va mustaqil arbitraj",
          "Agar bajarilgan ish texnik topshiriq talablariga mos kelmasa yoki muddatlar asossiz buzilsa, har qanday taraf rasmiy nizo ochish huquqiga ega. Nizo ochilganda tegishli mablag' to'liq muzlatiladi. Bobololadono mustaqil arbitraj komissiyasi taraflar taqdim etgan fayllar, chat yozishmalari va texnik topshiriq talablarini xolis tahlil qilib, yakuniy adolatli qaror chiqaradi. Arbitraj qarori platforma doirasida majburiy kuchga ega.",
        ],
        [
          "6. Intellektual mulk va javobgarlikni cheklash",
          "Bosqich uchun to'lov to'liq amalga oshirilgandan so'ng, topshirilgan ish natijasiga bo'lgan barcha mulkiy huquqlar to'liq hajmda xaridorga o'tadi. Mutaxassis taqdim etgan materiallar uchinchi shaxslarning mualliflik huquqlarini buzmasligiga shaxsan kafolat beradi. Platforma foydalanuvchilarning o'zaro shartnomalaridan kelib chiqadigan bilvosita zararlar yoki yo'qotilgan foyda uchun javobgar bo'lmaydi.",
        ],
        [
          "7. Qonuniy rekvizitlar va rasmiy xabarnomalar",
          "Ushbu shartlar O'zbekiston Respublikasining amaldagi qonunchiligi asosida talqin qilinadi va ijro etiladi. Har qanday rasmiy e'tiroz yoki takliflar kompaniyaning yuridik manzili yoki rasmiy elektron pochtasi orqali qabul qilinadi.",
        ],
      ],
    },
    ru: {
      title: "Условия использования",
      intro:
        "Настоящие условия представляют собой официальное юридическое соглашение между пользователем и ООО «BOBOLOLADONO SOLUTIONS», регулирующее порядок работы на платформе, права, обязанности и гарантии сторон.",
      dateText: "Последняя редакция: 1 марта 2026 г.",
      sections: [
        [
          "1. Общие положения и статус платформы",
          "Bobololadono — это цифровая технологическая площадка, обеспечивающая заключение контрактов между заказчиками и независимыми специалистами, гарантирующая безопасность платежей и прозрачную приёмку результатов работ. Платформа не выступает прямым работодателем, а предоставляет посреднические услуги и надёжную инфраструктуру для сделок.",
        ],
        [
          "2. Учётная запись, верификация и безопасность",
          "Пользователь обязан указывать достоверные данные при регистрации. Каждый пользователь вправе иметь только одну учётную запись. При прохождении проверки личности (KYC) предоставляются подлинные документы. Передача аутентификационных данных третьим лицам запрещена. Пользователь несёт полную ответственность за действия, совершённые в его аккаунте.",
        ],
        [
          "3. Оформление заказов и правила взаимодействия",
          "Все условия проектов, технические задания, этапы и переписка должны вестись исключительно внутри платформы. Запрещены попытки вывода сделок и расчётов за пределы площадки, обход защитного механизма Escrow и совершение прямых платежей. При выявлении нарушений платформа оставляет за собой право блокировки профилей.",
        ],
        [
          "4. Механизм эскроу (Escrow) и поэтапные выплаты",
          "Все расчёты на платформе защищены эскроу-депозитом. Заказчик резервирует сумму контракта до начала выполнения работ. Средства переводятся специалисту исключительно после успешного завершения и согласования каждого отдельного этапа. На проверку сданного этапа заказчику предоставляется 3 (три) календарных дня. При отсутствии замечаний этап принимается автоматически с переводом средств специалисту.",
        ],
        [
          "5. Разрешение споров и арбитраж",
          "В случае несоблюдения технического задания либо срыва сроков любая из сторон вправе открыть официальный спор. На время спора спорная сумма замораживается. Арбитражная комиссия платформы детально исследует материалы дела, переписку и файлы, принимая объективное и окончательное решение.",
        ],
        [
          "6. Интеллектуальная собственность и ответственность",
          "После полной приёмки и оплаты этапа исключительные права на результат интеллектуальной деятельности переходят заказчику. Исполнитель гарантирует чистоту авторских прав на предоставляемые материалы. Платформа не несёт ответственности за косвенные убытки сторон, возникшие в ходе реализации проектов.",
        ],
        [
          "7. Реквизиты и применимое право",
          "Условия регулируются законодательством Республики Узбекистан. Все официальные уведомления и претензии принимаются по юридическому адресу компании либо по официальной электронной почте.",
        ],
      ],
    },
    en: {
      title: "Terms of Service",
      intro:
        "These Terms of Service constitute a legally binding agreement between you and «BOBOLOLADONO SOLUTIONS» LLC governing platform usage, obligations, and transaction guarantees.",
      dateText: "Last updated: March 1, 2026",
      sections: [
        [
          "1. General Terms and Platform Role",
          "Bobololadono is a digital technology platform facilitating agreements between clients and independent specialists, providing milestone payment protection, dispute mediation, and deliverable verification. The platform does not act as an employer, functioning strictly as an independent intermediary.",
        ],
        [
          "2. Account Security and Verification",
          "Users must provide truthful, current information during registration. Creating multiple accounts by a single person is prohibited. If identity verification (KYC) is requested, valid identification documents must be provided. You are solely responsible for maintaining credentials confidentiality.",
        ],
        [
          "3. Project Engagement and Platform Rules",
          "All scope definitions, milestone agreements, files, and communications must remain strictly on-platform. Bypassing the escrow payment protection by attempting off-platform communications or external transactions is strictly prohibited and leads to immediate account restriction.",
        ],
        [
          "4. Escrow Protection and Milestone Releases",
          "All financial interactions use secure Escrow mechanisms. The client deposits project funds before work commences. Funds are released to the specialist only after milestone acceptance. The client is granted a 3-calendar-day review window upon submission. If no objection is filed, the milestone auto-approves and funds transfer.",
        ],
        [
          "5. Dispute Resolution and Arbitration",
          "If deliverables fail to meet agreed requirements or deadlines are breached without consent, either party may file a formal dispute. Disputed funds remain frozen. The Bobololadono arbitration board reviews project agreements, messages, and files to render a binding decision.",
        ],
        [
          "6. Intellectual Property and Liability",
          "Upon complete payment approval for a milestone, all proprietary rights to deliverables transfer entirely to the client. Specialists warrant that deliverables are original and do not infringe third-party copyrights. The platform is not liable for indirect or consequential damages.",
        ],
        [
          "7. Legal Entity and Notices",
          "These Terms are governed by the laws of the Republic of Uzbekistan. Official notices must be directed to the company's registered address or official legal email.",
        ],
      ],
    },
  },
  privacy: {
    uz: {
      title: "Maxfiylik siyosati",
      intro:
        "«BOBOLOLADONO SOLUTIONS» MCHJ foydalanuvchilarning shaxsga doir ma'lumotlari daxlsizligini hurmat qiladi va ularni O'zbekiston Respublikasining «Shaxsga doir ma'lumotlar to'g'risida»gi Qonuni talablariga qat'iy muvofiq holda himoya qiladi.",
      dateText: "Oxirgi tahrir: 2026-yil 1-mart",
      sections: [
        [
          "1. Yig'iladigan shaxsiy ma'lumotlar ro'yxati",
          "Platformada xizmat ko'rsatish maqsadida quyidagi toifadagi ma'lumotlar qayta ishlanadi: shaxsiy identifikatorlar (ism, familiya, telefon raqami, elektron pochta); profil ma'lumotlari (kasbiy ko'nikmalar, portfoliolar, fotosuratlar); verifikatsiya hujjatlari (pasport yoki ID-karta nusxalari — faqat qonuniy KYC talab qilinganda); tranzaksiya ma'lumotlari (to'lov statuslari, shartnoma raqamlari, depozit jurnallari); texnik ma'lumotlar (IP-manzil, brauzer turi, sessiya vaqti va xavfsizlik loglari).",
        ],
        [
          "2. Ma'lumotlarni yig'ish va qayta ishlash maqsadlari",
          "Ma'lumotlar faqat qat'iy belgilangan maqsadlar uchun ishlatiladi: foydalanuvchilarni autentifikatsiya qilish va shaxsini tasdiqlash; shartnomalar tuzish va Escrow to'lovlarini xavfsiz amalga oshirish; firibgarlik, noqonuniy faoliyat va xavfsizlik tahdidlarining oldini olish; texnik va mijozlarni qo'llab-quvvatlash xizmatlarini ko'rsatish; qonun hujjatlarida belgilangan buxgalteriya va soliq hisobdorligini ta'minlash.",
        ],
        [
          "3. Ma'lumotlarni saqlash, shifrlash va himoya choralari",
          "Barcha nozik ma'lumotlar zamonaviy kriptografik protokollar (AES-256, TLS 1.3) yordamida shifrlangan holatda saqlanadi. Ma'lumotlar bazalariga kirish ko'p omilli autentifikatsiya va qat'iy rolga asoslangan nazorat (RBAC) bilan cheklangan. Xodimlar shaxsiy ma'lumotlarni oshkor qilmaslik bo'yicha yuridik majburiyatlarga ega.",
        ],
        [
          "4. Uchinchi shaxslarga ma'lumotlarni taqdim etish",
          "Foydalanuvchilarning ma'lumotlari hech qachon uchinchi shaxslarga sotilmaydi yoki tijoriy maqsadlarda tarqatilmaydi. Ma'lumotlar faqat quyidagi hollarda uzatilishi mumkin: to'lovlarni amalga oshirish uchun litsenziyalangan to'lov tizimlari operatorlariga (to'lovni qayta ishlash doirasida); O'zbekiston Respublikasining qonunchiligida belgilangan asoslar bo'yicha sud va huquqni muhofaza qiluvchi organlarning rasmiy so'rovlariga asosan.",
        ],
        [
          "5. Cookie-fayllar va mahalliy saqlash vositalari",
          "Platforma saytning to'g'ri ishlashi, tanlangan til sozlamalarini (UZ/RU/EN) saqlab qolish va xavfsiz seanslarni boshqarish uchun texnik cookie-fayllardan foydalanadi. Foydalanuvchi brauzer sozlamalari orqali cookie-fayllarni o'chirish huquqiga ega, ammo bu tizimning ayrim funksiyalari ishlashiga ta'sir qilishi mumkin.",
        ],
        [
          "6. Foydalanuvchilarning huquqlari",
          "Foydalanuvchi o'ziga tegishli shaxsiy ma'lumotlar bilan tanishish, ularga aniqlik kiritish yoki o'zgartirish talab qilish, qonuniy majburiyatlar doirasida ma'lumotlarni o'chirishni so'rash hamda ma'lumotlarni qayta ishlashga berilgan rozilikni bekor qilish huquqiga ega. Tegishli arizalar rasmiy qo'llab-quvvatlash manziliga yuboriladi.",
        ],
        [
          "7. Siyosatga o'zgartirishlar kiritish",
          "Ushbu Maxfiylik siyosatiga kiritilgan barcha o'zgartirishlar platformaning ushbu sahifasida e'lon qilinadi va e'lon qilingan paytdan boshlab kuchga kiradi.",
        ],
      ],
    },
    ru: {
      title: "Политика конфиденциальности",
      intro:
        "ООО «BOBOLOLADONO SOLUTIONS» обеспечивает защиту персональных данных пользователей в строгом соответствии с Законом Республики Узбекистан «О персональных данных».",
      dateText: "Последняя редакция: 1 марта 2026 г.",
      sections: [
        [
          "1. Категории обрабатываемых данных",
          "Для обеспечения работы сервиса обрабатываются: персональные идентификаторы (имя, телефон, e-mail); данные профиля (навыки, портфолио, специализация); документы верификации (паспорт или ID-карта — исключительно при обязательной процедуре KYC); финансовые транзакционные логи (номера контрактов, статус эскроу-депозитов); технические логи (IP-адрес, тип браузера, отметки времени сессий).",
        ],
        [
          "2. Цели сбора и обработки",
          "Данные используются строго для: идентификации пользователей и безопасности аккаунтов; обеспечения заключения контрактов и безопасных взаиморасчётов; предотвращения мошеннических действий и финансовых махинаций; оказания оперативной технической поддержки; выполнения требований законодательства по бухгалтерскому учёту.",
        ],
        [
          "3. Безопасность и хранение данных",
          "Конфиденциальные данные хранятся в зашифрованном виде с использованием протоколов AES-256 и TLS 1.3. Доступ к производственным серверам разграничен ролевой моделью с двухфакторной аутентификацией. Серверная инфраструктура находится под непрерывным мониторингом безопасности.",
        ],
        [
          "4. Передача данных третьим лицам",
          "Продажа или коммерческая передача данных третьим лицам исключена. Передача допускается исключительно: лицензированным платёжным операторам для проведения транзакций; уполномоченным государственным органам по официальным запросам в случаях, предусмотренных законодательством.",
        ],
        [
          "5. Использование файлов cookie",
          "Файлы cookie применяются для аутентификации, сохранения языковых предпочтений (UZ/RU/EN) и защиты сессий. Отключение cookie в браузере может ограничить доступ к защищённым разделам сервиса.",
        ],
        [
          "6. Права субъектов персональных данных",
          "Пользователи имеют право на доступ к своим данным, их исправление, удаление аккаунта, а также отзыв согласия на обработку данных путём направления обращения в службу поддержки.",
        ],
        [
          "7. Изменения политики",
          "Актуальная редакция публикуется на этой странице и вступает в силу с момента размещения.",
        ],
      ],
    },
    en: {
      title: "Privacy Policy",
      intro:
        "«BOBOLOLADONO SOLUTIONS» LLC is dedicated to protecting user personal data in full compliance with the Law of the Republic of Uzbekistan «On Personal Data».",
      dateText: "Last updated: March 1, 2026",
      sections: [
        [
          "1. Categories of Processed Data",
          "We process personal identification details (name, phone, email); professional profile details (skills, portfolios); KYC verification records where mandated by law; payment transaction logs and escrow event records; and system telemetry (IP addresses, browser headers, session timestamps).",
        ],
        [
          "2. Purposes of Data Processing",
          "Data is processed exclusively to: authenticate users and protect account integrity; execute contracts and secure escrow transactions; prevent fraudulent activity and protect community safety; provide technical and customer support; satisfy statutory accounting obligations.",
        ],
        [
          "3. Storage and Data Protection",
          "All sensitive records are encrypted using modern cryptographic standards (AES-256, TLS 1.3). Direct system access is restricted by role-based access controls and multi-factor authentication protocols.",
        ],
        [
          "4. Third-Party Disclosures",
          "We do not sell or monetize personal data. Data is shared only with licensed payment operators to process transactions or with law enforcement authorities under lawful governmental mandates.",
        ],
        [
          "5. Cookies and Local Storage",
          "We use operational cookies to preserve session states, language preferences (UZ/RU/EN), and platform security. Disabling cookies may affect functional features.",
        ],
        [
          "6. User Rights",
          "Users retain the right to inspect their records, correct inaccuracies, request account data deletion, and withdraw processing consent by contacting our support channel.",
        ],
        [
          "7. Policy Updates",
          "Any modifications to this Policy become effective immediately upon publication on this page.",
        ],
      ],
    },
  },
  offer: {
    uz: {
      title: "Ommaviy oferta",
      intro:
        "Ushbu hujjat «BOBOLOLADONO SOLUTIONS» MCHJ tomonidan jismoniy va yuridik shaxslarga yo'llangan rasmiy ommaviy oferta bo'lib, platforma orqali buyurtmalarni moliyalashtirish, Escrow xizmatlari va komissiya to'lovlari shartlarini belgilaydi.",
      dateText: "Oxirgi tahrir: 2026-yil 1-mart",
      sections: [
        [
          "1. Ofertaning predmeti va aksept qilish tartibi",
          "Ushbu ommaviy oferta Bobololadono platformasida pullik xizmatlardan foydalanish, loyihalarni moliyalashtirish va Escrow to'lov kafolatini taqdim etish shartlarini belgilaydi. Foydalanuvchi ro'yxatdan o'tishi, shartnomani tasdiqlashi yoki to'lov jarayonida mablag' o'tkazishi orqali ushbu ofertaning barcha shartlarini to'liq va so'zsiz qabul qilgan (aksept qilgan) hisoblanadi.",
        ],
        [
          "2. Escrow xizmati va moliyaviy hisob-kitoblar",
          "Xaridor shartnoma bo'yicha kelishilgan summani to'lov tizimlari orqali platformaning xavfsiz zaxira hisobiga o'tkazadi. Ushbu mablag' to'liq saqlanadi va mutaxassis belgilangan bosqichni sifatli topshirguncha uchinchi shaxslarga o'tkazilmaydi. To'lov summasi, bosqichlar miqdori va shartlar to'lovni tasdiqlashdan oldin to'liq ko'rsatiladi. Yashirin to'lovlar undirilmaydi.",
        ],
        [
          "3. Bosqichlarni topshirish va mablag'ni o'tkazish qoidalari",
          "Mutaxassis har bir bosqich bo'yicha natijalarni platformaga yuklagach, xaridorga natijani tekshirish uchun 3 (uch) kalendar kuni beriladi. Xaridor ishni qabul qilishi yoki aniq asoslar bilan kamchiliklarni tuzatishni so'rashi mumkin. Belgilangan muddatda xaridor tomonidan hech qanday e'tiroz bildirilmasa, bosqich avtomatik tarzda qabul qilingan hisoblanadi va to'lov mutaxassisning yechib olish mumkin bo'lgan balansiga o'tkaziladi.",
        ],
        [
          "4. Platforma xizmat haqi (komissiya)",
          "Platforma xizmatlari uchun mutaxassis qabul qilgan bosqich summasidan 5% miqdorida xizmat haqi ushlab qolinadi. Xaridorlar uchun loyiha joylashtirish va shartnoma tuzish bepul. Barcha komissiya hisob-kitoblari to'lov jarayonida shaffof tarzda ko'rsatiladi.",
        ],
        [
          "5. Mablag'larni qaytarish (Refund) siyosati",
          "Agar mutaxassis ishni bajarmasa, belgilangan muddatlarni asossiz kechiktirsa yoki ish natijasi texnik topshiriqqa umuman mos kelmasa, qabul qilinmagan bosqichlar bo'yicha zaxiradagi mablag' xaridorning hisobiga to'liq yoki arbitraj qaroriga ko'ra mutanosib ravishda qaytariladi. Mablag'ni qaytarish to'lov amalga oshirilgan to'lov tizimi orqali bajariladi.",
        ],
        [
          "6. Nizolarni hakamlik orqali ko'rib chiqish",
          "Taraflar o'rtasida ish sifati yoki muddatlar bo'yicha kelishmovchilik yuzaga kelsa, platformaning arbitraj xizmati nizo bo'yicha mustaqil tekshiruv o'tkazadi. Arbitraj qarori asosida muzlatilgan mablag' to'liq yoki qisman xaridorga qaytariladi yoki mutaxassisga to'lab beriladi.",
        ],
        [
          "7. Tomonlarning rekvizitlari va ofertaning amal qilish muddati",
          "Ushbu oferta veb-saytda e'lon qilingan kundan boshlab muddatsiz amal qiladi. Platforma qonunchilik talablariga muvofiq ofertaga bir tomonlama o'zgartirish kiritish huquqini saqlab qoladi.",
        ],
      ],
    },
    ru: {
      title: "Публичная оферта",
      intro:
        "Настоящий документ является официальным публичным предложением (офертой) ООО «BOBOLOLADONO SOLUTIONS», адресованным физическим и юридическим лицам, определяющим правила финансирования проектов, услуг эскроу и комиссионных сборов.",
      dateText: "Последняя редакция: 1 марта 2026 г.",
      sections: [
        [
          "1. Предмет оферты и порядок акцепта",
          "Оферта определяет порядок финансирования проектов на платформе Bobololadono с использованием эскроу-сервиса. Регистрация на платформе, подтверждение контракта или внесение депозита признаётся полным и безоговорочным акцептом условий настоящей оферты.",
        ],
        [
          "2. Порядок расчётов и эскроу-депозит",
          "Заказчик переводит сумму проекта через партнёрские платёжные сервисы на специализированный эскроу-счёт. Средства надёжно защищены и не выплачиваются исполнителю до надлежащей сдачи этапа. Полная стоимость и комиссии прозрачно отображаются до подтверждения платежа. Скрытые платежи отсутствуют.",
        ],
        [
          "3. Сдача работ и выплата средств",
          "После сдачи этапа специалистом у заказчика есть 3 (три) календарных дня на приёмку либо направление мотивированных правок. При отсутствии реакции по истечении срока этап принимается автоматически с перечислением средств на баланс специалиста.",
        ],
        [
          "4. Комиссия сервиса",
          "Комиссия платформы составляет 5% от принятой суммы этапа и взимается со специалиста. Размещение заказов для клиентов бесплатно.",
        ],
        [
          "5. Политика возврата средств (Refund)",
          "В случае невыполнения обязательств исполнителем зарезервированные средства по непринятым этапам возвращаются заказчику в полном объёме либо по решению арбитража через соответствующего платёжного оператора.",
        ],
        [
          "6. Арбитраж и урегулирование претензий",
          "При возникновении разногласий арбитраж платформы изучает проектные материалы и принимает обязательное для сторон решение о распределении заблокированных средств.",
        ],
        [
          "7. Реквизиты и срок действия",
          "Оферта бессрочна и действует с момента размещения на платформе. Изменения публикуются в открытом доступе на данном сайте.",
        ],
      ],
    },
    en: {
      title: "Public Offer",
      intro:
        "This document is an official Public Offer issued by «BOBOLOLADONO SOLUTIONS» LLC setting forth terms of contract funding, escrow guarantees, and transaction fee policies.",
      dateText: "Last updated: March 1, 2026",
      sections: [
        [
          "1. Subject of the Offer and Acceptance",
          "This offer defines the framework for project funding and payment assurance on the Bobololadono platform. Registering, initiating a contract, or confirming a payment constitutes unconditional acceptance of this offer.",
        ],
        [
          "2. Escrow Services and Financial Settlement",
          "The client deposits project funds via authorized payment channels into a secured escrow account. Funds are safeguarded until deliverables are accepted. All fees are clearly disclosed before payment confirmation without hidden surcharges.",
        ],
        [
          "3. Deliverable Submission and Release",
          "Upon milestone submission by the specialist, the client receives a 3-calendar-day verification period. In the absence of timely objections, the milestone auto-approves and funds transfer to the specialist.",
        ],
        [
          "4. Platform Service Fee",
          "A service fee of 5% is deducted from the specialist upon milestone approval. Project creation for clients is free of charge.",
        ],
        [
          "5. Refund Policy",
          "If a specialist fails to deliver or breaches specifications, unaccepted milestone funds are refunded to the client's original payment method in accordance with dispute findings.",
        ],
        [
          "6. Mediation and Arbitration",
          "In case of quality or timeline disputes, platform mediation examines all evidence and issues a binding resolution regarding fund releases.",
        ],
        [
          "7. Company Details and Terms",
          "This offer is effective from publication date and remains valid indefinitely under the laws of Uzbekistan.",
        ],
      ],
    },
  },
};

export function LegalPage({ kind }: { kind: LegalKind }) {
  const { lang } = useT();
  const content = CONTENT[kind][lang];
  const company = COMPANY_INFO[lang];

  /* Sahifa sarlavhasini (document.title) tanlangan tilga moslashtirish */
  useEffect(() => {
    const titles: Record<LegalKind, Record<Lang, string>> = {
      terms: {
        uz: "Foydalanish shartlari — Bobololadono",
        ru: "Условия использования — Bobololadono",
        en: "Terms of Service — Bobololadono",
      },
      privacy: {
        uz: "Maxfiylik siyosati — Bobololadono",
        ru: "Политика конфиденциальности — Bobololadono",
        en: "Privacy Policy — Bobololadono",
      },
      offer: {
        uz: "Ommaviy oferta — Bobololadono",
        ru: "Публичная оферта — Bobololadono",
        en: "Public Offer — Bobololadono",
      },
    };
    document.title = titles[kind][lang] || titles[kind].uz;
  }, [kind, lang]);

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Logo href="/" />
          <LangSwitch />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-deep hover:text-ink">
          <span>←</span>
          <span>Bobololadono</span>
        </Link>

        <h1 className="mt-5 font-heading text-2xl font-black text-ink sm:text-3xl lg:text-4xl tracking-tight">
          {content.title}
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
          {content.intro}
        </p>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-2xs font-semibold text-muted">
          <span>📅</span>
          <span>{content.dateText}</span>
        </div>

        <div className="mt-8 flex flex-col gap-5">
          {content.sections.map(([secTitle, secBody]) => (
            <Card key={secTitle} padding="lg">
              <h2 className="font-heading text-base font-bold text-ink sm:text-lg">
                {secTitle}
              </h2>
              <p className="mt-2.5 text-sm leading-7 text-muted">
                {secBody}
              </p>
            </Card>
          ))}
        </div>

        {/* Yuridik rekvizitlar bloki */}
        <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
          <h3 className="font-heading text-base font-bold text-ink sm:text-lg">
            {company.title}
          </h3>
          <div className="mt-4 flex flex-col gap-2 text-xs leading-6 text-muted sm:text-sm">
            <p className="font-semibold text-ink">{company.entityName}</p>
            <p>{company.stir}</p>
            <p>{company.address}</p>
            <p>{company.phone}</p>
            <p>
              Email:{" "}
              <a href="mailto:legal@bobololadono.uz" className="text-primary-deep font-semibold hover:underline">
                legal@bobololadono.uz
              </a>
              {", "}
              <a href="mailto:support@bobololadono.uz" className="text-primary-deep font-semibold hover:underline">
                support@bobololadono.uz
              </a>
            </p>
            <p className="text-2xs text-faint mt-1">{company.license}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
