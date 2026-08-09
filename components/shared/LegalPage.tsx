"use client";

import Link from "next/link";
import { LangSwitch } from "@/components/shared/LangSwitch";
import { Logo } from "@/components/shared/Logo";
import { Card } from "@/components/ui/Card";
import { useT, type Lang } from "@/lib/i18n";

type LegalKind = "terms" | "privacy" | "offer";

const CONTENT: Record<
  LegalKind,
  Record<Lang, { title: string; intro: string; sections: [string, string][] }>
> = {
  terms: {
    uz: {
      title: "Foydalanish shartlari",
      intro: "Ushbu shartlar Bobo&Doda platformasidan foydalanishning asosiy qoidalarini belgilaydi.",
      sections: [
        ["Hisob va xavfsizlik", "Foydalanuvchi haqiqiy ma'lumot taqdim etishi, hisob ma'lumotlarini sir saqlashi va shubhali faoliyat haqida darhol xabar berishi shart."],
        ["Marketplace qoidalari", "Taklif, shartnoma, topshiriq va fayllar platforma ichida rasmiylashtiriladi. Aldov, spam, noqonuniy xizmat va platformadan tashqari xavfli to'lovlar taqiqlanadi."],
        ["To'lov himoyasi", "Mablag'lar kelishilgan bosqichlarga bog'lanadi. Ish qabul qilinganda tegishli summa mutaxassisga o'tkaziladi. Qaytarish va nizo qoidalari shartnoma holatiga bog'liq."],
        ["Javobgarlik", "Foydalanuvchilar o'zlari taqdim etgan kontent, xizmat va hujjatlar uchun javob beradi. Platforma qonun talab qilgan holatlarda hisobni cheklashi mumkin."],
      ],
    },
    ru: {
      title: "Условия использования",
      intro: "Эти условия определяют основные правила использования платформы Bobo&Doda.",
      sections: [
        ["Аккаунт и безопасность", "Пользователь обязан предоставлять достоверные данные, сохранять данные входа в тайне и немедленно сообщать о подозрительной активности."],
        ["Правила маркетплейса", "Предложения, контракты, результаты и файлы оформляются внутри платформы. Запрещены мошенничество, спам, незаконные услуги и небезопасные внешние платежи."],
        ["Защита платежей", "Средства привязываются к согласованным этапам. После приёмки соответствующая сумма переводится специалисту. Возвраты и споры зависят от состояния контракта."],
        ["Ответственность", "Пользователи отвечают за предоставленный контент, услуги и документы. Платформа может ограничить аккаунт в предусмотренных законом случаях."],
      ],
    },
    en: {
      title: "Terms of use",
      intro: "These terms set the main rules for using the Bobo&Doda platform.",
      sections: [
        ["Account and security", "Users must provide accurate information, protect login credentials, and report suspicious activity immediately."],
        ["Marketplace rules", "Offers, contracts, deliverables, and files should be handled on-platform. Fraud, spam, illegal services, and unsafe off-platform payments are prohibited."],
        ["Payment protection", "Funds are tied to agreed milestones. The relevant amount is released after work is accepted. Refund and dispute rules depend on contract state."],
        ["Responsibility", "Users are responsible for the content, services, and documents they provide. The platform may restrict accounts where required by law."],
      ],
    },
  },
  privacy: {
    uz: {
      title: "Maxfiylik siyosati",
      intro: "Biz faqat platformani ishlatish, xavfsizlik va qonuniy to'lovlar uchun zarur ma'lumotlarni qayta ishlaymiz.",
      sections: [
        ["Yig'iladigan ma'lumotlar", "Hisob ma'lumotlari, profil, shartnomalar, yozishmalar, to'lov statuslari, qurilma xavfsizlik signallari va verifikatsiya hujjatlari."],
        ["Foydalanish maqsadi", "Xizmat ko'rsatish, firibgarlikni oldini olish, to'lovlarni qayta ishlash, nizolarni ko'rish va qonuniy majburiyatlarni bajarish."],
        ["Saqlash va himoya", "Production tizimida maxfiy ma'lumotlar shifrlanadi, kirish rollar bilan cheklanadi va zarur muddatdan ortiq saqlanmaydi."],
        ["Foydalanuvchi huquqlari", "Foydalanuvchi ma'lumot nusxasini olishi, tuzatishi yoki qonun ruxsat bergan doirada o'chirishni so'rashi mumkin."],
      ],
    },
    ru: {
      title: "Политика конфиденциальности",
      intro: "Мы обрабатываем только данные, необходимые для работы платформы, безопасности и законных платежей.",
      sections: [
        ["Какие данные собираются", "Данные аккаунта и профиля, контракты, сообщения, статусы платежей, сигналы безопасности устройства и документы верификации."],
        ["Цели обработки", "Оказание услуг, предотвращение мошенничества, обработка платежей, рассмотрение споров и выполнение требований закона."],
        ["Хранение и защита", "В production конфиденциальные данные шифруются, доступ ограничивается ролями, а сроки хранения минимизируются."],
        ["Права пользователя", "Пользователь может получить копию данных, исправить их или запросить удаление в пределах, разрешённых законом."],
      ],
    },
    en: {
      title: "Privacy policy",
      intro: "We process only the data needed to operate the platform, protect users, and support lawful payments.",
      sections: [
        ["Data collected", "Account and profile data, contracts, messages, payment status, device security signals, and verification documents."],
        ["Why it is used", "To provide services, prevent fraud, process payments, review disputes, and meet legal obligations."],
        ["Storage and protection", "In production, sensitive data is encrypted, access is role-limited, and retention is minimized."],
        ["User rights", "Users can download, correct, or request deletion of their data where permitted by law."],
      ],
    },
  },
  offer: {
    uz: {
      title: "Ommaviy oferta",
      intro: "Ushbu oferta platformadagi pullik xizmatlar va bosqichli to'lov munosabatlarining asosiy shartlarini bayon qiladi.",
      sections: [
        ["Oferta qabul qilinishi", "Foydalanuvchi shartnomani mablag'lash yoki pullik xizmatni tasdiqlash orqali tegishli shartlarni qabul qiladi."],
        ["Hisob-kitob", "To'lov summasi, komissiya va qaytarish shartlari checkout'dan oldin ko'rsatiladi. Yashirin to'lov olinmaydi."],
        ["Escrow va bosqichlar", "Mablag' bajarilayotgan ish uchun zaxirada turadi va bosqich qabul qilingach yechiladi. Nizo ochilganda tegishli summa muzlatiladi."],
        ["Qaytarish", "Qabul qilinmagan ish bo'yicha qaytarish shartnoma, bajarilgan bosqichlar va payment provider qoidalariga muvofiq amalga oshiriladi."],
      ],
    },
    ru: {
      title: "Публичная оферта",
      intro: "Оферта описывает основные условия платных услуг и поэтапных платежей на платформе.",
      sections: [
        ["Принятие оферты", "Пользователь принимает применимые условия при финансировании контракта или подтверждении платной услуги."],
        ["Расчёты", "Сумма, комиссия и правила возврата показываются до checkout. Скрытые платежи не взимаются."],
        ["Эскроу и этапы", "Средства резервируются под выполняемую работу и освобождаются после приёмки этапа. При споре соответствующая сумма замораживается."],
        ["Возвраты", "Возврат за непринятую работу выполняется с учётом контракта, завершённых этапов и правил платёжного провайдера."],
      ],
    },
    en: {
      title: "Public offer",
      intro: "This offer describes the main terms for paid services and milestone payments on the platform.",
      sections: [
        ["Acceptance", "A user accepts the applicable terms when funding a contract or confirming a paid service."],
        ["Charges", "The amount, fees, and refund rules are shown before checkout. No hidden charges are applied."],
        ["Escrow and milestones", "Funds are reserved for the work and released after milestone approval. The relevant amount is frozen when a dispute opens."],
        ["Refunds", "Refunds for unaccepted work follow the contract, completed milestones, and payment-provider rules."],
      ],
    },
  },
};

export function LegalPage({ kind }: { kind: LegalKind }) {
  const { lang } = useT();
  const content = CONTENT[kind][lang];
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Logo href="/" />
          <LangSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <Link href="/" className="text-xs text-primary hover:text-ink">
          ← Bobo&Doda
        </Link>
        <h1 className="mt-5 font-heading text-2xl font-extrabold text-ink sm:text-3xl">
          {content.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">{content.intro}</p>
        <p className="mt-3 text-2xs text-faint">29.07.2026</p>
        <div className="mt-8 flex flex-col gap-4">
          {content.sections.map(([title, body]) => (
            <Card key={title} padding="lg">
              <h2 className="font-heading text-base font-bold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </Card>
          ))}
        </div>
        <p className="mt-8 text-xs text-faint">
          Legal contact:{" "}
          <a className="text-primary" href="mailto:legal@bobododa.uz">
            legal@bobododa.uz
          </a>
        </p>
      </main>
    </div>
  );
}
