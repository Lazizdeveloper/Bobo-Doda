export type Lang = "uz" | "ru" | "en";

type Entry = { uz: string; ru: string };

export const dictionary: Record<string, Entry> = {
  /* Umumiy */
  "common.save": { uz: "Saqlash", ru: "Сохранить" },
  "common.cancel": { uz: "Bekor qilish", ru: "Отмена" },
  "common.back": { uz: "Orqaga", ru: "Назад" },
  "common.next": { uz: "Keyingisi", ru: "Далее" },
  "common.edit": { uz: "Tahrirlash", ru: "Редактировать" },
  "common.delete": { uz: "O'chirish", ru: "Удалить" },
  "common.close": { uz: "Yopish", ru: "Закрыть" },
  "common.confirm": { uz: "Tasdiqlash", ru: "Подтвердить" },
  "common.sum": { uz: "so'm", ru: "сум" },
  "common.days": { uz: "kun", ru: "дн." },
  "common.hours": { uz: "soat", ru: "ч" },
  "common.months": { uz: "oy", ru: "мес." },
  "common.years": { uz: "yil", ru: "г." },
  "common.error": { uz: "Xatolik yuz berdi. Qayta urinib ko'ring", ru: "Произошла ошибка. Попробуйте ещё раз" },
  "common.notFound": { uz: "Ma'lumot topilmadi", ru: "Данные не найдены" },
  "common.logout": { uz: "Chiqish", ru: "Выйти" },
  "common.required": { uz: "Bu maydon to'ldirilishi shart", ru: "Это поле обязательно" },
  "common.home": { uz: "Bosh sahifaga", ru: "На главную" },
  "common.retry": { uz: "Qayta urinish", ru: "Повторить" },
  "common.clear": { uz: "Tozalash", ru: "Очистить" },
  "common.loading": { uz: "Yuklanmoqda…", ru: "Загрузка…" },
  "a11y.skipToContent": {
    uz: "Asosiy qismga o'tish",
    ru: "Перейти к содержимому",
  },

  /* Pagination va natijalar */
  "pager.prev": { uz: "Oldingi", ru: "Назад" },
  "pager.next": { uz: "Keyingi", ru: "Вперёд" },
  "pager.page": { uz: "Sahifa", ru: "Страница" },
  "pager.showing": {
    uz: "{total} tadan {from}–{to}",
    ru: "{from}–{to} из {total}",
  },
  "search.clear": { uz: "Qidiruvni tozalash", ru: "Очистить поиск" },
  "search.noResults": {
    uz: "«{query}» bo'yicha natija topilmadi",
    ru: "По запросу «{query}» ничего не найдено",
  },

  /* 404 va xatolik sahifalari */
  "err.loadFailed": {
    uz: "Ma'lumotni yuklab bo'lmadi",
    ru: "Не удалось загрузить данные",
  },
  "err.network": {
    uz: "Internet aloqasi yo'q — ulanishni tekshiring",
    ru: "Нет соединения — проверьте интернет",
  },
  "err.unauthenticated": {
    uz: "Sessiya tugadi — qaytadan kiring",
    ru: "Сессия истекла — войдите снова",
  },
  "err.forbidden": {
    uz: "Bu ma'lumotga ruxsatingiz yo'q",
    ru: "У вас нет доступа к этим данным",
  },
  "err.notFound": { uz: "Ma'lumot topilmadi", ru: "Данные не найдены" },
  "err.rateLimited": {
    uz: "Juda ko'p so'rov — biroz kutib qayta urining",
    ru: "Слишком много запросов — попробуйте позже",
  },
  "err.retry": { uz: "Qayta urinish", ru: "Повторить" },
  "err.notFoundTitle": { uz: "Sahifa topilmadi", ru: "Страница не найдена" },
  "err.notFoundDesc": {
    uz: "Bu manzil mavjud emas yoki o'chirilgan. Havolani tekshirib ko'ring.",
    ru: "Этот адрес не существует или был удалён. Проверьте ссылку.",
  },
  "err.crashTitle": { uz: "Nimadir xato ketdi", ru: "Что-то пошло не так" },
  "err.crashDesc": {
    uz: "Kutilmagan xatolik yuz berdi. Qayta urinib ko'ring yoki bosh sahifaga qayting.",
    ru: "Произошла непредвиденная ошибка. Попробуйте ещё раз или вернитесь на главную.",
  },

  /* Bank kartalari (Uzcard / Humo) */
  "card.section": { uz: "Mening kartalarim", ru: "Мои карты" },
  "card.sectionHint": {
    uz: "Bank kartangizni bog'lang (Visa, Mastercard, Uzcard, Humo) — to'lov va pul yechish uchun",
    ru: "Привяжите банковскую карту (Visa, Mastercard, Uzcard, Humo) — для оплаты и вывода средств",
  },
  "card.add": { uz: "Karta qo'shish", ru: "Добавить карту" },
  "card.addTitle": { uz: "Yangi karta bog'lash", ru: "Привязать новую карту" },
  "card.number": { uz: "Karta raqami", ru: "Номер карты" },
  "card.holder": { uz: "Karta egasi", ru: "Владелец карты" },
  "card.holderPh": { uz: "ISM FAMILIYA", ru: "ИМЯ ФАМИЛИЯ" },
  "card.expiry": { uz: "Amal qilish muddati", ru: "Срок действия" },
  "card.empty": {
    uz: "Hali karta bog'lanmagan",
    ru: "Карты ещё не привязаны",
  },
  "card.emptyHint": {
    uz: "Pul yechish uchun avval karta bog'lang",
    ru: "Для вывода средств сначала привяжите карту",
  },
  "card.added": { uz: "Karta bog'landi", ru: "Карта привязана" },
  "card.removed": { uz: "Karta o'chirildi", ru: "Карта удалена" },
  "card.removeTitle": { uz: "Karta o'chirilsinmi?", ru: "Удалить карту?" },
  "card.removeDesc": {
    uz: "Bu kartani ro'yxatdan olib tashlaysiz. Keyin qayta bog'lashingiz mumkin.",
    ru: "Карта будет удалена из списка. Позже вы сможете привязать её снова.",
  },
  "card.errNumber": {
    uz: "16 xonali karta raqamini kiriting (Visa, Mastercard, Uzcard, Humo)",
    ru: "Введите 16-значный номер карты (Visa, Mastercard, Uzcard, Humo)",
  },
  "card.errExpiry": {
    uz: "Muddat noto'g'ri yoki o'tib ketgan (MM/YY)",
    ru: "Неверный или истёкший срок (ММ/ГГ)",
  },
  "card.errHolder": { uz: "Karta egasi ismini kiriting", ru: "Введите владельца карты" },
  "card.exists": { uz: "Bu karta allaqachon bog'langan", ru: "Эта карта уже привязана" },
  "card.limit": { uz: "Kartalar soni chegaraga yetdi (5 ta)", ru: "Достигнут лимит карт (5)" },
  "card.selectTitle": { uz: "Kartani tanlang", ru: "Выберите карту" },
  "card.addNew": { uz: "+ Yangi karta", ru: "+ Новая карта" },
  "card.needCard": {
    uz: "Pul yechish uchun karta bog'lang",
    ru: "Привяжите карту для вывода средств",
  },

  /* Karta orqali to'lov (3DS SMS tasdiqlash) */
  "pay.method": { uz: "To'lov usuli", ru: "Способ оплаты" },
  "pay.cardOption": { uz: "Bank kartasi", ru: "Банковская карта" },
  "pay.localOption": { uz: "Mahalliy hamyon", ru: "Локальный кошелёк" },
  "pay.localHint": {
    uz: "Payme, Click, Kaspi va boshqa mahalliy to'lov tizimlari",
    ru: "Payme, Click, Kaspi и другие локальные платёжные системы",
  },
  "pay.clickHint": {
    uz: "Click ilovasi yoki checkout sahifasi orqali",
    ru: "Через приложение Click или страницу оплаты",
  },
  "pay.paymeHint": {
    uz: "Payme checkout orqali xavfsiz to'lov",
    ru: "Безопасная оплата через Payme checkout",
  },
  "pay.secureRedirect": {
    uz: "Davom etganda xavfsiz to'lov sahifasi ochiladi",
    ru: "После продолжения откроется защищённая страница оплаты",
  },
  "pay.confirmTitle": { uz: "To'lovni tasdiqlang", ru: "Подтвердите оплату" },
  "pay.smsHint": {
    uz: "Bank yuborgan 6 xonali 3D Secure kodini kiriting",
    ru: "Введите 6-значный код 3D Secure, отправленный банком",
  },
  "pay.smsError": { uz: "Kod 6 xonali bo'lishi kerak", ru: "Код должен быть из 6 цифр" },
  "pay.redirectNote": {
    uz: "Davom etgach to'lovni {app} ilovasi yoki checkout sahifasida tasdiqlaysiz",
    ru: "После продолжения подтвердите оплату в приложении или checkout-странице {app}",
  },

  /* Navigatsiya */
  "nav.dashboard": { uz: "Boshqaruv", ru: "Обзор" },
  "nav.services": { uz: "Xizmatlarim", ru: "Мои услуги" },
  "nav.jobs": { uz: "Ish e'lonlari", ru: "Объявления" },
  "nav.proposals": { uz: "Takliflarim", ru: "Мои предложения" },
  "nav.contracts": { uz: "Shartnomalar", ru: "Контракты" },
  "nav.messages": { uz: "Xabarlar", ru: "Сообщения" },
  "nav.earnings": { uz: "Daromad", ru: "Доход" },
  "nav.profile": { uz: "Profil", ru: "Профиль" },
  "nav.settings": { uz: "Sozlamalar", ru: "Настройки" },
  "nav.verification": { uz: "Verifikatsiya", ru: "Верификация" },
  "nav.help": { uz: "Yordam", ru: "Помощь" },
  "nav.openMenu": { uz: "Menyuni ochish", ru: "Открыть меню" },
  "nav.closeMenu": { uz: "Menyuni yopish", ru: "Закрыть меню" },

  /* Ishonch va yordam markazi */
  "verify.title": { uz: "Shaxsni tasdiqlash", ru: "Подтверждение личности" },
  "verify.subtitle": {
    uz: "To'lovlar, yechib olish va ishonchli profil uchun shaxsingizni tasdiqlang",
    ru: "Подтвердите личность для платежей, вывода средств и доверенного профиля",
  },
  "verify.status": { uz: "Tekshiruv holati", ru: "Статус проверки" },
  "verify.boshlanmagan": { uz: "Boshlanmagan", ru: "Не начато" },
  "verify.korib_chiqilmoqda": { uz: "Ko'rib chiqilmoqda", ru: "На проверке" },
  "verify.tasdiqlangan": { uz: "Tasdiqlangan", ru: "Подтверждено" },
  "verify.rad_etilgan": { uz: "Rad etilgan", ru: "Отклонено" },
  "verify.country": { uz: "Mamlakat", ru: "Страна" },
  "country.UZ": { uz: "O'zbekiston", ru: "Узбекистан" },
  "country.KZ": { uz: "Qozog'iston", ru: "Казахстан" },
  "country.KG": { uz: "Qirg'iziston", ru: "Кыргызстан" },
  "country.TJ": { uz: "Tojikiston", ru: "Таджикистан" },
  "country.TM": { uz: "Turkmaniston", ru: "Туркменистан" },
  "verify.documentType": { uz: "Hujjat turi", ru: "Тип документа" },
  "verify.passport": { uz: "Pasport", ru: "Паспорт" },
  "verify.idCard": { uz: "ID karta", ru: "ID-карта" },
  "verify.legalName": { uz: "Hujjatdagi to'liq ism", ru: "Полное имя по документу" },
  "verify.birthDate": { uz: "Tug'ilgan sana", ru: "Дата рождения" },
  "verify.documents": { uz: "Hujjat rasmlari", ru: "Фотографии документа" },
  "verify.documentsHint": {
    uz: "Hujjatning old va orqa tomoni yoki pasportning asosiy sahifasini yuklang",
    ru: "Загрузите лицевую и обратную сторону документа или основной разворот паспорта",
  },
  "verify.privacy": {
    uz: "Hujjatlar faqat shaxsni tekshirish uchun ishlatiladi. Production'da ular shifrlangan server omborida saqlanishi kerak.",
    ru: "Документы используются только для проверки личности. В production они должны храниться в зашифрованном серверном хранилище.",
  },
  "verify.consent": {
    uz: "18 yoshga to'lganman va hujjatlarimni shaxsni tekshirish uchun qayta ishlashga roziman",
    ru: "Мне исполнилось 18 лет, и я согласен на обработку документов для проверки личности",
  },
  "verify.required": {
    uz: "18 yosh talabi, barcha maydonlar, kamida 2 ta rasm va rozilik talab qilinadi",
    ru: "Требуются возраст 18+, все поля, минимум 2 изображения и согласие",
  },
  "verify.submit": { uz: "Tekshiruvga yuborish", ru: "Отправить на проверку" },
  "verify.submitted": { uz: "Hujjatlar tekshiruvga yuborildi", ru: "Документы отправлены на проверку" },
  "help.title": { uz: "Yordam markazi", ru: "Центр помощи" },
  "help.subtitle": {
    uz: "To'lov, shartnoma yoki hisob bo'yicha yordam oling",
    ru: "Получите помощь по оплате, контрактам или аккаунту",
  },
  "help.newTicket": { uz: "Yangi murojaat", ru: "Новое обращение" },
  "help.topic": { uz: "Mavzu turi", ru: "Категория" },
  "help.topic_tolov": { uz: "To'lov", ru: "Оплата" },
  "help.topic_shartnoma": { uz: "Shartnoma", ru: "Контракт" },
  "help.topic_nizo": { uz: "Nizo", ru: "Спор" },
  "help.topic_hisob": { uz: "Hisob", ru: "Аккаунт" },
  "help.topic_texnik": { uz: "Texnik muammo", ru: "Техническая проблема" },
  "help.topic_boshqa": { uz: "Boshqa", ru: "Другое" },
  "help.subject": { uz: "Qisqa mavzu", ru: "Краткая тема" },
  "help.message": { uz: "Muammoni batafsil yozing", ru: "Опишите проблему подробно" },
  "help.required": { uz: "Mavzu va kamida 20 belgili izoh kiriting", ru: "Введите тему и описание не короче 20 символов" },
  "help.send": { uz: "Murojaat yuborish", ru: "Отправить обращение" },
  "help.sent": { uz: "Murojaat qabul qilindi", ru: "Обращение принято" },
  "help.myTickets": { uz: "Murojaatlarim", ru: "Мои обращения" },
  "help.status_ochiq": { uz: "Ochiq", ru: "Открыто" },
  "help.status_javob_berildi": { uz: "Javob berildi", ru: "Есть ответ" },
  "help.status_yopilgan": { uz: "Yopilgan", ru: "Закрыто" },
  "dispute.open": { uz: "Nizo ochish", ru: "Открыть спор" },
  "dispute.title": { uz: "Shartnoma bo'yicha nizo", ru: "Спор по контракту" },
  "dispute.warning": {
    uz: "Nizo ochilganda ish va escrow mablag'i ko'rib chiqish yakunigacha to'xtatiladi. Avval chat orqali kelishishga harakat qiling.",
    ru: "После открытия спора работа и средства в эскроу приостанавливаются до завершения рассмотрения. Сначала попробуйте договориться в чате.",
  },
  "dispute.reason": { uz: "Nizo sababi", ru: "Причина спора" },
  "dispute.reason_scope": { uz: "Kelishilgan ish hajmi", ru: "Объём работ" },
  "dispute.reason_quality": { uz: "Ish sifati", ru: "Качество работы" },
  "dispute.reason_deadline": { uz: "Muddat buzilishi", ru: "Нарушение сроков" },
  "dispute.reason_payment": { uz: "To'lov muammosi", ru: "Проблема с оплатой" },
  "dispute.reason_communication": { uz: "Muloqot muammosi", ru: "Проблема общения" },
  "dispute.reason_other": { uz: "Boshqa sabab", ru: "Другая причина" },
  "dispute.description": { uz: "Vaziyatni batafsil tushuntiring", ru: "Подробно опишите ситуацию" },
  "dispute.evidence": { uz: "Dalillar va skrinshotlar", ru: "Доказательства и скриншоты" },
  "dispute.required": { uz: "Kamida 30 belgili tushuntirish kiriting", ru: "Введите описание не короче 30 символов" },
  "dispute.submit": { uz: "Nizoni ochish", ru: "Открыть спор" },
  "dispute.opened": { uz: "Nizo ochildi, shartnoma vaqtincha to'xtatildi", ru: "Спор открыт, контракт временно приостановлен" },
  "dispute.caseTitle": { uz: "Nizo tafsilotlari", ru: "Детали спора" },
  "dispute.status_ochiq": { uz: "Ochiq", ru: "Открыт" },
  "dispute.status_korib_chiqilmoqda": { uz: "Ko'rib chiqilmoqda", ru: "На рассмотрении" },
  "dispute.status_hal_qilindi": { uz: "Hal qilindi", ru: "Решён" },
  "ntf.disputeOpened": {
    uz: "\"{title}\" shartnomasi bo'yicha nizo ochildi",
    ru: "По контракту «{title}» открыт спор",
  },
  "privacy.notifications": { uz: "Bildirishnoma sozlamalari", ru: "Настройки уведомлений" },
  "privacy.notificationsHint": {
    uz: "Qaysi turdagi muhim xabarlarni olishni tanlang",
    ru: "Выберите, какие типы важных уведомлений получать",
  },
  "privacy.messages": { uz: "Yangi xabarlar", ru: "Новые сообщения" },
  "privacy.contracts": { uz: "Shartnoma va bosqichlar", ru: "Контракты и этапы" },
  "privacy.payments": { uz: "To'lov va yechib olish", ru: "Платежи и вывод средств" },
  "privacy.marketing": { uz: "Yangilik va tavsiyalar", ru: "Новости и рекомендации" },
  "privacy.dataTitle": { uz: "Ma'lumotlar va maxfiylik", ru: "Данные и конфиденциальность" },
  "privacy.dataHint": {
    uz: "Ma'lumotlaringiz nusxasini oling yoki hisobni butunlay o'chiring",
    ru: "Получите копию своих данных или полностью удалите аккаунт",
  },
  "privacy.export": { uz: "Ma'lumotlarni eksport qilish", ru: "Экспортировать данные" },
  "privacy.exported": { uz: "Ma'lumotlar fayli yuklandi", ru: "Файл данных загружен" },
  "privacy.delete": { uz: "Hisobni o'chirish", ru: "Удалить аккаунт" },
  "privacy.deleteTitle": { uz: "Hisobni butunlay o'chirish", ru: "Удалить аккаунт навсегда" },
  "privacy.deleteDesc": {
    uz: "Bu amalni ortga qaytarib bo'lmaydi. Tasdiqlash uchun quyidagi so'zni kiriting.",
    ru: "Это действие необратимо. Для подтверждения введите слово ниже.",
  },
  "privacy.deleteWord": { uz: "O'CHIRISH", ru: "УДАЛИТЬ" },
  "privacy.activeContracts": {
    uz: "Faol, imzolangan yoki nizodagi shartnoma bor. Avval uni yakunlang.",
    ru: "Есть активный, подписанный или спорный контракт. Сначала завершите его.",
  },
  "paymentResult.successTitle": { uz: "To'lov muvaffaqiyatli", ru: "Оплата успешна" },
  "paymentResult.successDesc": { uz: "Mablag' escrow'ga qabul qilindi va shartnoma faollashtiriladi.", ru: "Средства приняты в эскроу, контракт будет активирован." },
  "paymentResult.pendingTitle": { uz: "To'lov tekshirilmoqda", ru: "Платёж проверяется" },
  "paymentResult.pendingDesc": { uz: "Provider tasdig'i kutilmoqda. Sahifani qayta to'lamang.", ru: "Ожидается подтверждение провайдера. Не оплачивайте повторно." },
  "paymentResult.failedTitle": { uz: "To'lov amalga oshmadi", ru: "Платёж не прошёл" },
  "paymentResult.failedDesc": { uz: "Mablag' yechilmadi. Boshqa usulni tanlang yoki bankingizga murojaat qiling.", ru: "Средства не списаны. Выберите другой способ или обратитесь в банк." },
  "paymentResult.expiredTitle": { uz: "To'lov vaqti tugadi", ru: "Время оплаты истекло" },
  "paymentResult.expiredDesc": { uz: "Checkout sessiyasi yakunlandi. Shartnomadan yangi to'lov boshlang.", ru: "Сессия checkout завершена. Начните новый платёж из контракта." },
  "paymentResult.refundedTitle": { uz: "Mablag' qaytarildi", ru: "Средства возвращены" },
  "paymentResult.refundedDesc": { uz: "Qaytarish providerga yuborildi; kartada ko'rinishi bank muddatiga bog'liq.", ru: "Возврат отправлен провайдеру; срок зачисления зависит от банка." },
  "paymentResult.contracts": { uz: "Shartnomalarga qaytish", ru: "Вернуться к контрактам" },
  "security.title": { uz: "Parol va xavfsizlik", ru: "Пароль и безопасность" },
  "security.hint": { uz: "Hisobingiz uchun kuchli va noyob parol ishlating", ru: "Используйте надёжный и уникальный пароль" },
  "security.current": { uz: "Joriy parol", ru: "Текущий пароль" },
  "security.new": { uz: "Yangi parol", ru: "Новый пароль" },
  "security.confirm": { uz: "Yangi parolni takrorlang", ru: "Повторите новый пароль" },
  "security.passwordRules": { uz: "Parol kamida 8 belgi, harf va raqamdan iborat bo'lsin", ru: "Пароль должен содержать минимум 8 символов, букву и цифру" },
  "security.passwordMismatch": { uz: "Yangi parollar bir xil emas", ru: "Новые пароли не совпадают" },
  "security.currentInvalid": { uz: "Joriy parol noto'g'ri", ru: "Неверный текущий пароль" },
  "security.change": { uz: "Parolni o'zgartirish", ru: "Изменить пароль" },
  "security.passwordChanged": { uz: "Parol yangilandi", ru: "Пароль обновлён" },

  /* Autentifikatsiya */
  "auth.title": { uz: "Bobo&Doda'ga xush kelibsiz", ru: "Добро пожаловать в Bobo&Doda" },
  "auth.subtitle": {
    uz: "Mutaxassislar bozori — bosqichli to'lov kafolati bilan. Pul har bir bosqich qabul qilingandan keyingina o'tkaziladi.",
    ru: "Биржа специалистов с поэтапной гарантией оплаты. Деньги переводятся только после приёмки каждого этапа.",
  },
  "auth.registerTitle": { uz: "Ro'yxatdan o'tish", ru: "Регистрация" },
  "auth.regName": { uz: "To'liq ism", ru: "Полное имя" },
  "auth.regNamePh": { uz: "Masalan: Aziz Karimov", ru: "Например: Азиз Каримов" },
  "auth.regPhone": { uz: "Telefon raqami", ru: "Номер телефона" },
  "auth.regPhonePh": { uz: "+998 90 123 45 67", ru: "+998 90 123 45 67" },
  "auth.registerBtn": { uz: "Akkount ochish", ru: "Создать аккаунт" },
  "auth.errName": { uz: "Ismingizni kiriting", ru: "Введите имя" },
  "auth.errPhone": { uz: "To'g'ri telefon raqamini kiriting", ru: "Введите корректный номер телефона" },
  "auth.tabLogin": { uz: "Kirish", ru: "Вход" },
  "auth.tabRegister": { uz: "Ro'yxatdan o'tish", ru: "Регистрация" },
  "auth.loginTitle": { uz: "Tizimga kirish", ru: "Вход в систему" },
  "auth.loginSubtitle": {
    uz: "Telefon raqamingiz va parolingiz bilan kiring",
    ru: "Войдите по номеру телефона и паролю",
  },
  "auth.loginBtn": { uz: "Kirish", ru: "Войти" },
  "auth.password": { uz: "Parol", ru: "Пароль" },
  "auth.passwordPh": { uz: "Kamida 6 belgi", ru: "Не менее 6 символов" },
  "auth.errPassword": {
    uz: "Parol kamida 6 belgidan iborat bo'lishi kerak",
    ru: "Пароль должен содержать не менее 6 символов",
  },
  "auth.errCredentials": {
    uz: "Telefon raqami yoki parol noto'g'ri",
    ru: "Неверный номер телефона или пароль",
  },
  "auth.errPhoneExists": {
    uz: "Bu raqam allaqachon ro'yxatdan o'tgan — tizimga kiring",
    ru: "Этот номер уже зарегистрирован — войдите в систему",
  },
  "auth.forgotPassword": { uz: "Parolni unutdingizmi?", ru: "Забыли пароль?" },
  "auth.resetTitle": { uz: "Parolni tiklash", ru: "Восстановление пароля" },
  "auth.resetSubtitle": {
    uz: "Telefon raqamingizni kiriting — tasdiqlash kodi yuboramiz",
    ru: "Введите номер телефона — мы отправим код подтверждения",
  },
  "auth.resetSendCode": { uz: "Kod yuborish", ru: "Отправить код" },
  "auth.resetNewPassword": { uz: "Yangi parol", ru: "Новый пароль" },
  "auth.resetConfirmPassword": {
    uz: "Yangi parolni takrorlang",
    ru: "Повторите новый пароль",
  },
  "auth.resetSubmit": { uz: "Parolni saqlash", ru: "Сохранить пароль" },
  "auth.resetSuccess": {
    uz: "Parol yangilandi — endi kiring",
    ru: "Пароль обновлён — теперь войдите",
  },
  "auth.errUserNotFound": {
    uz: "Bu raqam bilan hisob topilmadi",
    ru: "Аккаунт с этим номером не найден",
  },
  "auth.errPasswordMatch": {
    uz: "Parollar mos kelmadi",
    ru: "Пароли не совпадают",
  },
  "auth.backToLogin": { uz: "Kirishga qaytish", ru: "Вернуться ко входу" },
  "auth.noAccount": { uz: "Akkountingiz yo'qmi?", ru: "Нет аккаунта?" },
  "auth.haveAccount": { uz: "Akkountingiz bormi?", ru: "Уже есть аккаунт?" },
  "auth.regVerifyNote": {
    uz: "Akkountingizni oxirida Telegram orqali tasdiqlaysiz",
    ru: "Аккаунт вы подтвердите через Telegram в самом конце",
  },
  "auth.finalStep": { uz: "Yakuniy bosqich", ru: "Последний шаг" },
  "auth.confirmTitle": { uz: "Akkountni tasdiqlang", ru: "Подтвердите аккаунт" },
  "auth.confirmIntro": {
    uz: "Akkountingizni faollashtirish uchun Telegram bot orqali tasdiqlang. Bu — himoyalangan hisob va bosqichli to'lov kafolatining kaliti.",
    ru: "Активируйте аккаунт, подтвердив его через Telegram-бот. Это ключ к защищённому аккаунту и поэтапной гарантии оплаты.",
  },
  "auth.telegramBtn": { uz: "Telegram orqali tasdiqlash", ru: "Подтвердить через Telegram" },
  "auth.redirecting": { uz: "Botga yo'naltirilyapsiz...", ru: "Перенаправляем в бот..." },
  "auth.verifyTitle": { uz: "Kodni kiriting", ru: "Введите код" },
  "auth.verifyHint": {
    uz: "Telegram botga yuborilgan 6 xonali kodni kiriting",
    ru: "Введите 6-значный код, отправленный в Telegram-бот",
  },
  "auth.verifyBtn": { uz: "Tasdiqlash", ru: "Подтвердить" },
  "auth.codeError": { uz: "Kod 6 xonali raqam bo'lishi kerak", ru: "Код должен состоять из 6 цифр" },
  "auth.mockNote": {
    uz: "Sinov rejimi: istalgan 6 xonali raqam qabul qilinadi",
    ru: "Тестовый режим: принимается любое 6-значное число",
  },
  "auth.roleTitle": { uz: "Kim sifatida davom etasiz?", ru: "Как вы хотите продолжить?" },
  "auth.roleSubtitle": {
    uz: "Bitta hisob faqat bitta rolga tegishli bo'ladi",
    ru: "Один аккаунт может иметь только одну роль",
  },
  "auth.roleSeller": { uz: "Men mutaxassisman", ru: "Я специалист" },
  "auth.roleSellerDesc": {
    uz: "Xizmat sotaman, ish e'lonlariga taklif yuboraman",
    ru: "Продаю услуги и откликаюсь на объявления",
  },
  "auth.roleBuyer": { uz: "Men xaridorman", ru: "Я заказчик" },
  "auth.roleBuyerDesc": {
    uz: "Mutaxassis xizmatlarini xavfsiz sotib olaman",
    ru: "Безопасно покупаю услуги специалистов",
  },
  "auth.buyerSoonTitle": { uz: "Tez orada", ru: "Скоро" },
  "auth.buyerSoon": {
    uz: "Xaridor kabineti hozirda tayyorlanmoqda. Mutaxassis sifatida davom etishingiz mumkin.",
    ru: "Кабинет заказчика в разработке. Вы можете продолжить как специалист.",
  },

  /* Ro'yxatdan o'tish */
  "onboard.title": { uz: "Profilingizni to'ldiring", ru: "Заполните профиль" },
  "onboard.subtitle": {
    uz: "Bu ma'lumotlar buyurtmachilarga sizni tanlashda yordam beradi",
    ru: "Эта информация поможет заказчикам выбрать вас",
  },
  "onboard.fullName": { uz: "To'liq ism", ru: "Полное имя" },
  "onboard.fullNamePh": { uz: "Masalan: Aziz Karimov", ru: "Например: Азиз Каримов" },
  "onboard.bio": { uz: "O'zingiz haqingizda", ru: "О себе" },
  "onboard.bioPh": {
    uz: "Tajribangiz, ixtisosligingiz va ish uslubingiz haqida qisqacha yozing",
    ru: "Кратко опишите опыт, специализацию и стиль работы",
  },
  "onboard.skills": { uz: "Ko'nikmalar", ru: "Навыки" },
  "onboard.skillsPh": { uz: "Masalan: Figma", ru: "Например: Figma" },
  "onboard.categories": { uz: "Kategoriyalar", ru: "Категории" },
  "onboard.location": { uz: "Joylashuv", ru: "Местоположение" },
  "onboard.locationPh": { uz: "Masalan: Toshkent", ru: "Например: Ташкент" },
  "onboard.submit": { uz: "Saqlash va boshlash", ru: "Сохранить и начать" },
  "onboard.errName": { uz: "Ismingizni kiriting", ru: "Введите имя" },
  "onboard.errBio": { uz: "Bio kamida 20 ta belgidan iborat bo'lishi kerak", ru: "Био должно содержать минимум 20 символов" },
  "onboard.errBioLong": {
    uz: "\"O'zingiz haqingizda\" matni 1 000 belgidan oshmasligi kerak",
    ru: "Текст «О себе» не должен превышать 1 000 символов",
  },
  "onboard.errSkills": { uz: "Kamida bitta ko'nikma qo'shing", ru: "Добавьте хотя бы один навык" },
  "onboard.errCategories": { uz: "Kamida bitta kategoriya tanlang", ru: "Выберите хотя бы одну категорию" },
  "onboard.errLocation": { uz: "Joylashuvni kiriting", ru: "Укажите местоположение" },

  /* Dashboard */
  "dash.title": { uz: "Boshqaruv", ru: "Обзор" },
  "dash.greeting": { uz: "Xush kelibsiz", ru: "Добро пожаловать" },
  "dash.activeContracts": { uz: "Faol shartnomalar", ru: "Активные контракты" },
  "dash.pendingProposals": { uz: "Kutilayotgan takliflar", ru: "Ожидающие предложения" },
  "dash.monthlyEarnings": { uz: "Oylik daromad", ru: "Доход за месяц" },
  "dash.recentMessages": { uz: "Oxirgi xabarlar", ru: "Последние сообщения" },
  "dash.viewAll": { uz: "Barchasini ko'rish", ru: "Смотреть все" },
  "dash.noMessages": { uz: "Hozircha xabar yo'q", ru: "Пока нет сообщений" },
  "dash.ratingCard": { uz: "Reyting va nishon", ru: "Рейтинг и значок" },
  "dash.completedContracts": { uz: "yakunlangan shartnoma", ru: "завершённых контрактов" },
  "dash.escrowNote": {
    uz: "To'lovlar bosqichma-bosqich: har bir bosqich qabul qilingach, mablag' hisobingizga o'tadi",
    ru: "Оплата поэтапная: после приёмки каждого этапа средства поступают на ваш счёт",
  },

  /* Xizmatlar (A yo'l) */
  "services.title": { uz: "Xizmatlarim", ru: "Мои услуги" },
  "services.add": { uz: "Yangi xizmat", ru: "Новая услуга" },
  "services.filterAll": { uz: "Barchasi", ru: "Все" },
  "services.empty": {
    uz: "Hali xizmat qo'shmagansiz — birinchisini yarating",
    ru: "У вас пока нет услуг — создайте первую",
  },
  "services.emptyFiltered": { uz: "Bu holatda xizmat yo'q", ru: "Нет услуг с этим статусом" },
  "services.emptyCta": { uz: "Xizmat yaratish", ru: "Создать услугу" },
  "services.pause": { uz: "Pauza qilish", ru: "Поставить на паузу" },
  "services.activate": { uz: "Faollashtirish", ru: "Активировать" },
  "services.paused": { uz: "Pauza qilindi", ru: "Поставлено на паузу" },
  "services.activated": { uz: "Faollashtirildi", ru: "Активировано" },
  "services.deleted": { uz: "Xizmat o'chirildi", ru: "Услуга удалена" },
  "services.deleteTitle": { uz: "Xizmat o'chirilsinmi?", ru: "Удалить услугу?" },
  "services.deleteDesc": {
    uz: "Bu amalni ortga qaytarib bo'lmaydi. Xizmat butunlay o'chiriladi.",
    ru: "Это действие нельзя отменить. Услуга будет удалена навсегда.",
  },
  "svcStatus.active": { uz: "Faol", ru: "Активна" },
  "svcStatus.paused": { uz: "Pauzada", ru: "На паузе" },
  "svcStatus.draft": { uz: "Qoralama", ru: "Черновик" },

  /* Wizard */
  "wizard.newTitle": { uz: "Yangi xizmat", ru: "Новая услуга" },
  "wizard.editTitle": { uz: "Xizmatni tahrirlash", ru: "Редактировать услугу" },
  "wizard.step1": { uz: "Kategoriya", ru: "Категория" },
  "wizard.step2": { uz: "Sarlavha va tavsif", ru: "Название и описание" },
  "wizard.step3": { uz: "Tafsilotlar", ru: "Детали" },
  "wizard.step4": { uz: "Narx va muddat", ru: "Цена и срок" },
  "wizard.step5": { uz: "Ko'rib chiqish", ru: "Проверка" },
  "wizard.categoryHint": {
    uz: "Xizmatingiz qaysi yo'nalishga tegishli?",
    ru: "К какому направлению относится ваша услуга?",
  },
  "wizard.titleLabel": { uz: "Sarlavha", ru: "Название" },
  "wizard.titlePh": {
    uz: "Masalan: Professional logotip dizayni — 3 variant bilan",
    ru: "Например: Профессиональный дизайн логотипа — 3 варианта",
  },
  "wizard.descLabel": { uz: "Tavsif", ru: "Описание" },
  "wizard.descPh": {
    uz: "Nima qilasiz, qanday topshirasiz va nima kiradi — aniq yozing",
    ru: "Что вы делаете, как сдаёте и что входит — опишите конкретно",
  },
  "wizard.priceLabel": { uz: "Narx", ru: "Цена" },
  "wizard.daysLabel": { uz: "Bajarish muddati (kun)", ru: "Срок выполнения (дней)" },
  "wizard.escrowHint": {
    uz: "Xizmat orqali kelgan buyurtma — bitta bosqichli shartnoma: to'lov escrow'da saqlanadi, ish qabul qilingach sizga o'tadi",
    ru: "Заказ через услугу — контракт с одним этапом: оплата хранится в эскроу и переводится после приёмки",
  },
  "wizard.reviewHint": {
    uz: "Ma'lumotlarni tekshiring. Nashr qilingach, xizmat buyurtmachilarga ko'rinadi.",
    ru: "Проверьте данные. После публикации услуга станет видна заказчикам.",
  },
  "wizard.publish": { uz: "Nashr qilish", ru: "Опубликовать" },
  "wizard.published": { uz: "Nashr qilindi", ru: "Опубликовано" },
  "wizard.saveDraft": { uz: "Qoralama sifatida saqlash", ru: "Сохранить как черновик" },
  "wizard.draftSaved": { uz: "Qoralama saqlandi", ru: "Черновик сохранён" },
  "wizard.saveChanges": { uz: "O'zgarishlarni saqlash", ru: "Сохранить изменения" },
  "wizard.changesSaved": { uz: "O'zgarishlar saqlandi", ru: "Изменения сохранены" },
  "wizard.errCategory": { uz: "Kategoriyani tanlang", ru: "Выберите категорию" },
  "wizard.errTitle": {
    uz: "Sarlavha kamida 10 ta belgidan iborat bo'lishi kerak",
    ru: "Название должно содержать минимум 10 символов",
  },
  "wizard.errDesc": {
    uz: "Tavsif kamida 30 ta belgidan iborat bo'lishi kerak",
    ru: "Описание должно содержать минимум 30 символов",
  },
  "wizard.errPrice": { uz: "Narx 0 dan katta bo'lishi kerak", ru: "Цена должна быть больше 0" },
  "wizard.errDays": { uz: "Muddat kamida 1 kun bo'lishi kerak", ru: "Срок должен быть не менее 1 дня" },

  /* Ish e'lonlari (B yo'l) */
  "jobs.title": { uz: "Ish e'lonlari", ru: "Объявления о работе" },
  "jobs.subtitle": {
    uz: "Buyurtmachilar e'lon qilgan loyihalarga taklif yuboring",
    ru: "Отправляйте предложения на проекты заказчиков",
  },
  "jobs.filtersTitle": { uz: "Filtrlar", ru: "Фильтры" },
  "jobs.category": { uz: "Kategoriya", ru: "Категория" },
  "jobs.allCategories": { uz: "Barcha kategoriyalar", ru: "Все категории" },
  "jobs.budget": { uz: "Byudjet", ru: "Бюджет" },
  "jobs.budgetAll": { uz: "Istalgan byudjet", ru: "Любой бюджет" },
  "jobs.budgetLow": { uz: "1 mln gacha", ru: "До 1 млн" },
  "jobs.budgetMid": { uz: "1–5 mln", ru: "1–5 млн" },
  "jobs.budgetHigh": { uz: "5 mln dan yuqori", ru: "Свыше 5 млн" },
  "jobs.sort": { uz: "Saralash", ru: "Сортировка" },
  "jobs.sortNew": { uz: "Eng yangi", ru: "Сначала новые" },
  "jobs.sortBudget": { uz: "Eng yuqori byudjet", ru: "Максимальный бюджет" },
  "jobs.proposalsCount": { uz: "ta taklif", ru: "предложений" },
  "jobs.empty": {
    uz: "Filtrga mos e'lon topilmadi — shartlarni kengaytirib ko'ring",
    ru: "По фильтру ничего не найдено — попробуйте расширить условия",
  },
  "jobs.open": { uz: "Ochiq", ru: "Открыто" },
  "jobs.closed": { uz: "Yopilgan", ru: "Закрыто" },
  "jobs.postedAt": { uz: "E'lon qilingan", ru: "Опубликовано" },

  /* E'lon tafsiloti */
  "job.budget": { uz: "Byudjet", ru: "Бюджет" },
  "job.skills": { uz: "Kerakli ko'nikmalar", ru: "Требуемые навыки" },
  "job.screening": { uz: "Skrining savollari", ru: "Отборочные вопросы" },
  "job.aboutBuyer": { uz: "Buyurtmachi haqida", ru: "О заказчике" },
  "job.memberSince": { uz: "A'zo bo'lgan", ru: "На платформе с" },
  "job.sendProposal": { uz: "Taklif yuborish", ru: "Отправить предложение" },
  "job.alreadySent": {
    uz: "Bu e'longa taklif yuborgansiz",
    ru: "Вы уже отправили предложение на это объявление",
  },
  "job.closedNote": {
    uz: "Bu e'lon yopilgan — yangi takliflar qabul qilinmaydi",
    ru: "Объявление закрыто — новые предложения не принимаются",
  },
  "job.notFound": { uz: "E'lon topilmadi", ru: "Объявление не найдено" },

  /* Taklif formasi */
  "prop.formTitle": { uz: "Taklif yuborish", ru: "Отправить предложение" },
  "prop.bid": { uz: "Narx taklifi", ru: "Ваша цена" },
  "prop.bidHint": { uz: "Buyurtmachi byudjeti", ru: "Бюджет заказчика" },
  "prop.cover": { uz: "Qoplama xat", ru: "Сопроводительное письмо" },
  "prop.coverHint": {
    uz: "Nega aynan siz mos ekaningizni tushuntiring: tajribangizdan aniq misol keltiring, loyiha bo'yicha savol bering",
    ru: "Объясните, почему подходите именно вы: приведите конкретный пример из опыта, задайте вопрос по проекту",
  },
  "prop.answers": { uz: "Skrining savollariga javoblar", ru: "Ответы на отборочные вопросы" },
  "prop.portfolio": { uz: "Portfolio ilova qilish", ru: "Прикрепить портфолио" },
  "prop.portfolioHint": {
    uz: "Xizmatlaringiz rasmlaridan tanlang yoki yangi rasm yuklang",
    ru: "Выберите из изображений ваших услуг или загрузите новые",
  },
  "prop.fromServices": { uz: "Xizmatlarim rasmlaridan", ru: "Из моих услуг" },
  "prop.noServiceImages": {
    uz: "Xizmatlaringizda hali rasm yo'q",
    ru: "В ваших услугах пока нет изображений",
  },
  "prop.submit": { uz: "Taklif yuborish", ru: "Отправить предложение" },
  "prop.sent": { uz: "Taklif yuborildi", ru: "Предложение отправлено" },
  "prop.errBid": { uz: "Narx 0 dan katta bo'lishi kerak", ru: "Цена должна быть больше 0" },
  "prop.errCover": {
    uz: "Qoplama xat kamida 50 ta belgidan iborat bo'lishi kerak",
    ru: "Письмо должно содержать минимум 50 символов",
  },
  "prop.errAnswer": { uz: "Javob yozing", ru: "Напишите ответ" },

  /* Takliflarim */
  "props.title": { uz: "Takliflarim", ru: "Мои предложения" },
  "props.filterAll": { uz: "Barchasi", ru: "Все" },
  "props.bid": { uz: "Taklif narxi", ru: "Ваша цена" },
  "props.empty": {
    uz: "Hali taklif yubormagansiz — ish e'lonlarini ko'rib chiqing",
    ru: "Вы ещё не отправляли предложений — посмотрите объявления",
  },
  "props.emptyFiltered": { uz: "Bu holatda taklif yo'q", ru: "Нет предложений с этим статусом" },
  "props.emptyCta": { uz: "E'lonlarni ko'rish", ru: "Смотреть объявления" },
  "props.openContract": { uz: "Shartnomaga o'tish", ru: "Перейти к контракту" },
  "pstatus.yuborilgan": { uz: "Yuborilgan", ru: "Отправлено" },
  "pstatus.korib_chiqilmoqda": { uz: "Ko'rib chiqilmoqda", ru: "На рассмотрении" },
  "pstatus.suhbat": { uz: "Suhbat", ru: "Собеседование" },
  "pstatus.yollandi": { uz: "Yollandi", ru: "Наняты" },
  "pstatus.rad_etildi": { uz: "Rad etildi", ru: "Отклонено" },

  /* Shartnomalar */
  "contracts.title": { uz: "Shartnomalar", ru: "Контракты" },
  "contracts.tabAll": { uz: "Barchasi", ru: "Все" },
  "contracts.empty": {
    uz: "Bu holatda shartnoma yo'q",
    ru: "Нет контрактов с этим статусом",
  },
  "contracts.emptyAll": {
    uz: "Hozircha shartnoma yo'q — xizmat joylang yoki e'lonlarga taklif yuboring",
    ru: "Контрактов пока нет — разместите услугу или откликнитесь на объявления",
  },
  "contracts.colBuyer": { uz: "Buyurtmachi", ru: "Заказчик" },
  "contracts.colTitle": { uz: "Shartnoma", ru: "Контракт" },
  "contracts.colAmount": { uz: "Summa", ru: "Сумма" },
  "contracts.colProgress": { uz: "Bosqichlar", ru: "Этапы" },
  "contracts.colStatus": { uz: "Holat", ru: "Статус" },
  "cstatus.imzolangan": { uz: "To'lov kutilmoqda", ru: "Ожидает оплаты" },
  "cstatus.faol": { uz: "Faol", ru: "Активный" },
  "cstatus.yakunlangan": { uz: "Yakunlangan", ru: "Завершён" },
  "cstatus.bekor_qilingan": { uz: "Bekor qilingan", ru: "Отменён" },
  "cstatus.nizo": { uz: "Nizo", ru: "Спор" },

  /* Shartnoma ish maydoni */
  "contract.total": { uz: "Umumiy summa", ru: "Общая сумма" },
  "contract.source_xizmat": { uz: "Xizmat orqali", ru: "Через услугу" },
  "contract.source_taklif": { uz: "Taklif orqali", ru: "Через предложение" },
  "contract.source_taklifnoma": {
    uz: "To'g'ridan-to'g'ri taklif",
    ru: "Прямое предложение",
  },
  "contract.milestones": { uz: "Bosqichlar", ru: "Этапы" },
  "contract.notFound": { uz: "Shartnoma topilmadi", ru: "Контракт не найден" },
  "contract.reviewTitle": { uz: "Buyurtmachi sharhi", ru: "Отзыв заказчика" },
  "contract.disputeNote": {
    uz: "Bu shartnoma bo'yicha nizo ochilgan. Platforma ma'muriyati ko'rib chiqmoqda.",
    ru: "По этому контракту открыт спор. Администрация платформы рассматривает его.",
  },
  "contract.cancelledNote": {
    uz: "Bu shartnoma bekor qilingan. Escrow'dagi mablag' xaridorning Bobo&Doda hisobiga qaytarildi (Xarajatlar bo'limida kartaga yechish mumkin).",
    ru: "Контракт отменён. Средства из эскроу возвращены на счёт Bobo&Doda заказчика (можно вывести на карту в разделе «Расходы»).",
  },
  "contract.cancel": { uz: "Shartnomani bekor qilish", ru: "Отменить контракт" },
  "contract.hireAgainTitle": {
    uz: "Yana bu mutaxassis bilan ishlaysizmi?",
    ru: "Хотите снова поработать с этим специалистом?",
  },
  "contract.hireAgainDesc": {
    uz: "{name}ga yangi ishingiz uchun to'lovsiz taklif yuboring",
    ru: "Отправьте {name} новое бесплатное предложение по вашей задаче",
  },
  "contract.hireAgain": { uz: "Qayta yollash", ru: "Нанять снова" },
  "contract.cancelTitle": {
    uz: "Shartnoma bekor qilinsinmi?",
    ru: "Отменить контракт?",
  },
  "contract.cancelDesc": {
    uz: "Qabul qilingan bosqichlar to'langanicha qoladi, escrow'dagi mablag' buyurtmachiga qaytadi. Bu amalni ortga qaytarib bo'lmaydi.",
    ru: "Принятые этапы остаются оплаченными, средства из эскроу возвращаются заказчику. Это действие нельзя отменить.",
  },
  "contract.cancelled": { uz: "Shartnoma bekor qilindi", ru: "Контракт отменён" },

  /* Bosqichlar */
  "ms.kutilmoqda": { uz: "Kutilmoqda", ru: "Ожидание" },
  "ms.mablaglangan": { uz: "Mablag'langan", ru: "Профинансирован" },
  "ms.topshirildi": { uz: "Topshirildi", ru: "Сдан" },
  "ms.qabul_qilindi": { uz: "Qabul qilindi", ru: "Принят" },
  "ms.ozgartirish_soraldi": { uz: "O'zgartirish so'raldi", ru: "Запрошены правки" },
  "ms.progressDone": { uz: "bosqich yakunlandi", ru: "этапов завершено" },
  "ms.due": { uz: "Muddat", ru: "Срок" },
  "ms.paid": { uz: "To'landi", ru: "Выплачено" },
  "ms.submitAction": { uz: "Ishni topshirish", ru: "Сдать работу" },
  "ms.resubmitAction": { uz: "Qayta topshirish", ru: "Сдать повторно" },
  "ms.waitingReview": {
    uz: "Kutilmoqda: buyurtmachi tekshiryapti",
    ru: "Ожидание: заказчик проверяет",
  },
  "ms.notFundedNote": {
    uz: "Bu bosqich hali mablag'lanmagan — buyurtmachi to'lagach ish boshlanadi",
    ru: "Этап ещё не профинансирован — работа начнётся после оплаты заказчиком",
  },
  "ms.fundedNote": {
    uz: "Mablag' escrow'da saqlanmoqda — ishni bemalol boshlashingiz mumkin",
    ru: "Средства в эскроу — можете спокойно начинать работу",
  },
  "ms.revisionNote": { uz: "Buyurtmachi izohi", ru: "Комментарий заказчика" },

  /* Hisoblagich */
  "cd.review": {
    uz: "Ko'rib chiqish uchun {n} kun qoldi",
    ru: "На проверку осталось {n} дн.",
  },
  "cd.reviewHours": {
    uz: "Ko'rib chiqish uchun {n} soat qoldi",
    ru: "На проверку осталось {n} ч.",
  },
  "cd.expired": { uz: "Ko'rib chiqish muddati o'tdi", ru: "Срок проверки истёк" },

  /* Ishni topshirish modali */
  "sm.title": { uz: "Ishni topshirish", ru: "Сдать работу" },
  "sm.desc": {
    uz: "Tayyor ish havolasini qo'shing — buyurtmachiga 3 kunlik ko'rib chiqish muddati beriladi",
    ru: "Добавьте ссылку на готовую работу — у заказчика будет 3 дня на проверку",
  },
  "sm.link": { uz: "Fayl yoki ish havolasi", ru: "Ссылка на файл или работу" },
  "sm.linkPh": { uz: "https://... (Drive, Figma, GitHub)", ru: "https://... (Drive, Figma, GitHub)" },
  "sm.note": { uz: "Qisqa xabar", ru: "Короткое сообщение" },
  "sm.notePh": {
    uz: "Nima qilindi, nimaga e'tibor berish kerak",
    ru: "Что сделано, на что обратить внимание",
  },
  "sm.done": { uz: "Ish topshirildi", ru: "Работа сдана" },
  "sm.errLink": { uz: "Havola kiriting", ru: "Укажите ссылку" },

  /* Chat */
  "chat.title": { uz: "Muloqot", ru: "Переписка" },
  "chat.placeholder": { uz: "Xabar yozing...", ru: "Напишите сообщение..." },
  "chat.send": { uz: "Yuborish", ru: "Отправить" },
  "chat.empty": {
    uz: "Hozircha xabar yo'q — birinchi bo'lib yozing",
    ru: "Пока нет сообщений — напишите первым",
  },
  "chat.you": { uz: "Siz", ru: "Вы" },
  "chat.attach": { uz: "Rasm biriktirish", ru: "Прикрепить изображение" },

  /* Xabarlar sahifasi */
  "messages.title": { uz: "Xabarlar", ru: "Сообщения" },
  "messages.empty": {
    uz: "Hozircha suhbat yo'q — shartnoma boshlanashi bilan buyurtmachi bilan shu yerda yozishasiz",
    ru: "Пока нет переписок — когда начнётся контракт, вы будете общаться с заказчиком здесь",
  },

  /* Daromad */
  "earn.title": { uz: "Daromad", ru: "Доход" },
  "earn.monthlyBreakdown": {
    uz: "Oxirgi 6 oy",
    ru: "Последние 6 месяцев",
  },
  "earn.paid": { uz: "Jami to'langan", ru: "Всего выплачено" },
  "earn.pending": { uz: "Kutilayotgan", ru: "Ожидается" },
  "earn.pendingHint": {
    uz: "Escrow'dagi va tekshiruvdagi bosqichlar",
    ru: "Этапы в эскроу и на проверке",
  },
  "earn.withdrawable": { uz: "Yechish mumkin", ru: "Доступно к выводу" },
  "earn.withdrawableHint": {
    uz: "Hisobingizdagi, kartaga yechsa bo'ladigan mablag'",
    ru: "Средства на счёте, доступные для вывода на карту",
  },
  "earn.recent": { uz: "So'nggi to'lovlar", ru: "Последние выплаты" },
  "earn.withdraw": { uz: "Pul yechish", ru: "Вывести средства" },
  "earn.methodTitle": { uz: "Pul yechish usuli", ru: "Способ вывода" },
  "earn.methodDesc": {
    uz: "Mablag' 1 ish kuni ichida tanlangan usulga o'tkaziladi",
    ru: "Средства будут переведены выбранным способом в течение 1 рабочего дня",
  },
  "earn.card": { uz: "Bank kartasi", ru: "Банковская карта" },
  "earn.withdrawn": {
    uz: "So'rov qabul qilindi — mablag' 1 ish kunida o'tkaziladi",
    ru: "Заявка принята — средства поступят в течение 1 рабочего дня",
  },
  "earn.empty": {
    uz: "Hali to'lov yo'q — birinchi bosqich qabul qilinganda shu yerda ko'rinadi",
    ru: "Выплат пока нет — они появятся после приёмки первого этапа",
  },
  "earn.colDate": { uz: "Sana", ru: "Дата" },
  "earn.colContract": { uz: "Shartnoma", ru: "Контракт" },
  "earn.colMilestone": { uz: "Bosqich", ru: "Этап" },
  "earn.colAmount": { uz: "Summa", ru: "Сумма" },

  /* Nishonlar */
  "badge.yangi": { uz: "Yangi", ru: "Новичок" },
  "badge.ishonchli": { uz: "Ishonchli", ru: "Надёжный" },
  "badge.top_mutaxassis": { uz: "Top mutaxassis", ru: "Топ-специалист" },
  "badge.yangiHint": {
    uz: "Yangi mutaxassis — obro' to'plamoqda",
    ru: "Новый специалист — нарабатывает репутацию",
  },
  "badge.ishonchliHint": {
    uz: "Ishonchli — 5+ yakunlangan ish, 4.5+ reyting",
    ru: "Надёжный — 5+ завершённых работ, рейтинг 4.5+",
  },
  "badge.top_mutaxassisHint": {
    uz: "Top mutaxassis — 25+ ish, 4.8+ reyting",
    ru: "Топ-специалист — 25+ работ, рейтинг 4.8+",
  },

  /* Profil */
  "profile.title": { uz: "Profil", ru: "Профиль" },
  "profile.publicNote": {
    uz: "Profilingiz buyurtmachilarga shunday ko'rinadi",
    ru: "Так ваш профиль видят заказчики",
  },
  "profile.memberSince": { uz: "A'zo bo'lgan", ru: "На платформе с" },
  "profile.completedContracts": { uz: "yakunlangan shartnoma", ru: "завершённых контрактов" },
  "profile.skills": { uz: "Ko'nikmalar", ru: "Навыки" },
  "profile.services": { uz: "Xizmatlar", ru: "Услуги" },
  "profile.reviews": { uz: "Sharhlar", ru: "Отзывы" },
  "profile.noReviews": { uz: "Hozircha sharh yo'q", ru: "Пока нет отзывов" },
  "profile.noServices": { uz: "Faol xizmat yo'q", ru: "Нет активных услуг" },
  "profile.noPortfolio": {
    uz: "Hozircha ish namunasi yo'q",
    ru: "Пока нет примеров работ",
  },
  "profile.edit": { uz: "Profilni tahrirlash", ru: "Редактировать профиль" },
  "profile.about": { uz: "Men haqimda", ru: "Обо мне" },
  "profile.languages": { uz: "Tillar", ru: "Языки" },
  "profile.noLanguages": { uz: "Til ko'rsatilmagan", ru: "Языки не указаны" },
  "profile.statCompleted": { uz: "Yakunlangan ishlar", ru: "Завершённых работ" },
  "profile.statRating": { uz: "O'rtacha reyting", ru: "Средний рейтинг" },
  "profile.statResponse": { uz: "O'rtacha javob", ru: "Среднее время ответа" },
  "profile.statMember": { uz: "Platformada", ru: "На платформе" },
  "profile.reviewsAvg": { uz: "o'rtacha baho", ru: "средняя оценка" },
  "lang.native": { uz: "Ona tili", ru: "Родной" },
  "lang.fluent": { uz: "Erkin", ru: "Свободно" },
  "lang.intermediate": { uz: "O'rta", ru: "Средний" },
  "lang.basic": { uz: "Boshlang'ich", ru: "Базовый" },

  /* Sozlamalar */
  "settings.title": { uz: "Sozlamalar", ru: "Настройки" },
  "settings.profileSection": { uz: "Profil ma'lumotlari", ru: "Данные профиля" },
  "settings.quickLinks": { uz: "Tezkor havolalar", ru: "Быстрые ссылки" },
  "settings.bioHint": {
    uz: "Kuchli profil uchun kamida 50 belgi",
    ru: "Для сильного профиля минимум 50 символов",
  },
  "settings.headlineLabel": { uz: "Kasbiy sarlavha", ru: "Профессиональный заголовок" },
  "settings.headlinePh": {
    uz: "Masalan: Grafik dizayner va Frontend dasturchi",
    ru: "Например: Графический дизайнер и Frontend-разработчик",
  },
  "settings.langNamePh": { uz: "Til nomi", ru: "Название языка" },
  "settings.addLang": { uz: "Qo'shish", ru: "Добавить" },
  "settings.portfolioHint": {
    uz: "Bajarilgan ishlaringiz — xaridor ishonchini oshiradi",
    ru: "Ваши выполненные работы — повышают доверие заказчика",
  },
  "settings.addWork": { uz: "Ish qo'shish", ru: "Добавить работу" },
  "settings.pfTitle": { uz: "Ish nomi", ru: "Название работы" },
  "settings.pfTitlePh": {
    uz: "Masalan: Onlayn do'kon uchun logotip",
    ru: "Например: Логотип для интернет-магазина",
  },
  "settings.pfDesc": { uz: "Qisqacha tavsif", ru: "Краткое описание" },
  "settings.pfDescPh": {
    uz: "Nima qildingiz va qanday natija bo'ldi",
    ru: "Что вы сделали и какой был результат",
  },
  "settings.pfCategory": { uz: "Kategoriya", ru: "Категория" },
  "settings.pfImage": { uz: "Muqova rasmi", ru: "Обложка" },
  "settings.pfError": {
    uz: "Ish nomi va rasm shart",
    ru: "Название и изображение обязательны",
  },
  "settings.langSection": { uz: "Til", ru: "Язык" },
  "settings.langHint": { uz: "Interfeys tili", ru: "Язык интерфейса" },
  "settings.paySection": { uz: "To'lov usuli", ru: "Способ выплат" },
  "settings.payHint": {
    uz: "Daromadni yechish uchun asosiy usul",
    ru: "Основной способ вывода дохода",
  },
  "settings.saved": { uz: "Saqlandi", ru: "Сохранено" },
  "settings.accountSection": { uz: "Hisob", ru: "Аккаунт" },
  "settings.logoutTitle": { uz: "Hisobdan chiqasizmi?", ru: "Выйти из аккаунта?" },
  "settings.logoutDesc": {
    uz: "Qayta kirish uchun Telegram orqali tasdiqlashingiz kerak bo'ladi.",
    ru: "Для повторного входа потребуется подтверждение через Telegram.",
  },

  /* Kategoriyalar */
  "cat.dizayn": { uz: "Dizayn", ru: "Дизайн" },
  "cat.dasturlash": { uz: "Dasturlash", ru: "Программирование" },
  "cat.tarjima": { uz: "Tarjima", ru: "Перевод" },
  "cat.kontent": { uz: "Kontent", ru: "Контент" },
  "cat.marketing": { uz: "Marketing & SMM", ru: "Маркетинг и SMM" },
  "cat.video": { uz: "Video montaj", ru: "Видеомонтаж" },
  "cat.audio": { uz: "Audio & Ovoz", ru: "Аудио и озвучка" },
  "cat.biznes": { uz: "Biznes yordam", ru: "Бизнес-помощь" },

  /* Kategoriya maydonlari */
  "field.portfolio": { uz: "Portfolio rasmlari (5 tagacha)", ru: "Работы из портфолио (до 5)" },
  "field.dizayn_turi": { uz: "Dizayn turi", ru: "Тип дизайна" },
  "field.texnologiyalar": { uz: "Texnologiyalar", ru: "Технологии" },
  "field.texnologiyalarPh": { uz: "Masalan: React", ru: "Например: React" },
  "field.loyiha_turi": { uz: "Loyiha turi", ru: "Тип проекта" },
  "field.tildan": { uz: "Tildan", ru: "С языка" },
  "field.tilga": { uz: "Tilga", ru: "На язык" },
  "field.soha": { uz: "Soha", ru: "Сфера" },
  "field.kontent_turi": { uz: "Kontent turi", ru: "Тип контента" },
  "field.til": { uz: "Til", ru: "Язык" },
  "field.platforma": { uz: "Platforma", ru: "Платформа" },
  "field.xizmat_turi": { uz: "Xizmat turi", ru: "Тип услуги" },
  "field.format": { uz: "Format", ru: "Формат" },
  "field.davomiylik": { uz: "Davomiylik (daqiqa)", ru: "Длительность (мин.)" },
  "field.select": { uz: "Tanlang", ru: "Выберите" },

  /* Maydon variantlari */
  "opt.logo": { uz: "Logo", ru: "Лого" },
  "opt.brending": { uz: "Brending", ru: "Брендинг" },
  "opt.uiux": { uz: "UI-UX", ru: "UI-UX" },
  "opt.boshqa": { uz: "Boshqa", ru: "Другое" },
  "opt.vebsayt": { uz: "Veb-sayt", ru: "Веб-сайт" },
  "opt.bot": { uz: "Bot", ru: "Бот" },
  "opt.mobil": { uz: "Mobil ilova", ru: "Мобильное приложение" },
  "opt.yuridik": { uz: "Yuridik", ru: "Юридическая" },
  "opt.texnik": { uz: "Texnik", ru: "Техническая" },
  "opt.umumiy": { uz: "Umumiy", ru: "Общая" },
  "opt.maqola": { uz: "Maqola", ru: "Статья" },
  "opt.seo": { uz: "SEO matn", ru: "SEO-текст" },
  "opt.post": { uz: "Post", ru: "Пост" },
  "opt.strategiya": { uz: "Strategiya", ru: "Стратегия" },
  "opt.targeting": { uz: "Targeting", ru: "Таргетинг" },
  "opt.boshqarish": { uz: "Boshqarish", ru: "Ведение" },
  "opt.reels": { uz: "Reels", ru: "Reels" },
  "opt.youtube": { uz: "YouTube", ru: "YouTube" },
  "opt.reklama": { uz: "Reklama roligi", ru: "Рекламный ролик" },
  "opt.ovozlashtirish": { uz: "Ovozlashtirish", ru: "Озвучка" },
  "opt.musiqa": { uz: "Musiqa", ru: "Музыка" },
  "opt.podkast": { uz: "Podkast", ru: "Подкаст" },
  "opt.hisobot": { uz: "Hisobot", ru: "Отчёт" },
  "opt.prezentatsiya": { uz: "Prezentatsiya", ru: "Презентация" },
  "opt.tahlil": { uz: "Tahlil", ru: "Анализ" },
  "opt.pdf": { uz: "PDF", ru: "PDF" },
  "opt.pptx": { uz: "PPTX", ru: "PPTX" },
  "opt.excel": { uz: "Excel", ru: "Excel" },
  "opt.uz": { uz: "O'zbek", ru: "Узбекский" },
  "opt.ru": { uz: "Rus", ru: "Русский" },
  "opt.en": { uz: "Ingliz", ru: "Английский" },
  "opt.instagram": { uz: "Instagram", ru: "Instagram" },
  "opt.telegram": { uz: "Telegram", ru: "Telegram" },
  "opt.facebook": { uz: "Facebook", ru: "Facebook" },

  /* Bildirishnomalar */
  "ntf.title": { uz: "Bildirishnomalar", ru: "Уведомления" },
  "ntf.markAll": { uz: "Barchasini o'qilgan qilish", ru: "Отметить все прочитанными" },
  "ntf.empty": { uz: "Hozircha bildirishnoma yo'q", ru: "Пока нет уведомлений" },
  "ntf.open": { uz: "Bildirishnomalarni ochish", ru: "Открыть уведомления" },
  "ntf.newMatchingJob": {
    uz: "Sizga mos yangi e'lon: {title}",
    ru: "Новое подходящее объявление: {title}",
  },
  "ntf.proposalInterview": {
    uz: "Taklifingiz bo'yicha suhbatga taklif qilindingiz: {title}",
    ru: "Вас пригласили на собеседование по предложению: {title}",
  },
  "ntf.proposalRejected": {
    uz: "Taklifingiz rad etildi: {title}",
    ru: "Ваше предложение отклонено: {title}",
  },
  "ntf.milestoneFunded": {
    uz: "Bosqich mablag'landi — ishni boshlashingiz mumkin: {title}",
    ru: "Этап профинансирован — можно начинать работу: {title}",
  },
  "ntf.milestoneAutoAccepted": {
    uz: "Ko'rib chiqish muddati o'tdi — bosqich avtomatik qabul qilindi: {title}",
    ru: "Срок проверки истёк — этап принят автоматически: {title}",
  },
  "ntf.newMessage": {
    uz: "{name} sizga yangi xabar yubordi",
    ru: "{name} отправил(а) вам новое сообщение",
  },

  /* Ish e'lonlari — qidiruv va saqlash */
  "jobs.searchPh": {
    uz: "Kalit so'z bo'yicha qidirish...",
    ru: "Поиск по ключевым словам...",
  },
  "jobs.tabAll": { uz: "Barchasi", ru: "Все" },
  "jobs.tabMatching": { uz: "Sizga mos", ru: "Для вас" },
  "jobs.tabSaved": { uz: "Saqlanganlar", ru: "Сохранённые" },
  "jobs.save": { uz: "Saqlash", ru: "Сохранить" },
  "jobs.unsave": { uz: "Saqlanganlardan olib tashlash", ru: "Убрать из сохранённых" },
  "jobs.emptySaved": {
    uz: "Saqlangan e'lon yo'q — yoqqan e'lonni xatcho'p bilan belgilang",
    ru: "Нет сохранённых объявлений — отмечайте понравившиеся закладкой",
  },
  "jobs.emptyMatching": {
    uz: "Hozircha mos e'lon yo'q — profildagi ko'nikma va kategoriyalarni to'ldiring",
    ru: "Пока нет подходящих объявлений — заполните навыки и категории в профиле",
  },
  "jobs.buyerJobs": { uz: "ta e'lon joylagan", ru: "объявлений размещено" },

  /* Taklif tafsiloti va qaytarib olish */
  "prop.detailTitle": { uz: "Taklif tafsiloti", ru: "Детали предложения" },
  "prop.viewJob": { uz: "E'lonni ko'rish", ru: "Посмотреть объявление" },
  "prop.attachedTitle": { uz: "Ilova qilingan portfolio", ru: "Прикреплённое портфолио" },
  "prop.withdraw": { uz: "Taklifni qaytarib olish", ru: "Отозвать предложение" },
  "prop.withdrawTitle": { uz: "Taklif qaytarib olinsinmi?", ru: "Отозвать предложение?" },
  "prop.withdrawDesc": {
    uz: "Buyurtmachi taklifingizni boshqa ko'rmaydi. Bu amalni ortga qaytarib bo'lmaydi.",
    ru: "Заказчик больше не увидит ваше предложение. Это действие нельзя отменить.",
  },
  "prop.withdrawn": { uz: "Taklif qaytarib olindi", ru: "Предложение отозвано" },
  "pstatus.qaytarib_olingan": { uz: "Qaytarib olingan", ru: "Отозвано" },

  /* Dashboard — profil to'liqligi va mos e'lonlar */
  "dash.completeness": { uz: "Profil to'liqligi", ru: "Заполненность профиля" },
  "dash.completenessHint": {
    uz: "To'liq profil buyurtmachilar ishonchini oshiradi",
    ru: "Полный профиль повышает доверие заказчиков",
  },
  "dash.ckBio": { uz: "Bio yozilgan (50+ belgi)", ru: "Заполнено био (50+ символов)" },
  "dash.ckSkills": { uz: "Kamida 3 ta ko'nikma", ru: "Минимум 3 навыка" },
  "dash.ckService": { uz: "Kamida 1 ta faol xizmat", ru: "Минимум 1 активная услуга" },
  "dash.ckPortfolio": { uz: "Portfolio rasmi qo'shilgan", ru: "Добавлено изображение в портфолио" },
  "dash.completeProfile": { uz: "Profilni to'ldirish", ru: "Заполнить профиль" },
  "dash.matchingJobs": { uz: "Sizga mos e'lonlar", ru: "Подходящие объявления" },
  "dash.noMatchingJobs": {
    uz: "Hozircha mos e'lon yo'q",
    ru: "Пока нет подходящих объявлений",
  },
  "dash.netIncome": { uz: "Sof daromad", ru: "Чистый доход" },
  "dash.directOffers": { uz: "To'g'ridan-to'g'ri takliflar", ru: "Прямые предложения" },
  "dash.reviewOfferBtn": { uz: "Taklifni ko'rish", ru: "Просмотреть предложение" },
  "dash.browseJobBoard": { uz: "Ish e'lonlarini ko'rish", ru: "Смотреть доску объявлений" },
  "dash.proposalsSuffix": { uz: "ta taklif", ru: "предложений" },
  "dash.viewApply": { uz: "Ko'rish va ariza →", ru: "Смотреть и откликнуться →" },
  "dash.availableForWork": { uz: "Ish uchun ochiq", ru: "Готов к работе" },
  "dash.busy": { uz: "Band", ru: "Занят" },
  "dash.you": { uz: "Siz", ru: "Вы" },
  "dash.client": { uz: "Mijoz", ru: "Клиент" },

  /* Holat (available) */
  "avail.on": { uz: "Ishga tayyor", ru: "Открыт к работе" },
  "avail.off": { uz: "Band", ru: "Занят" },
  "settings.availSection": { uz: "Ish holati", ru: "Статус занятости" },
  "settings.availHint": {
    uz: "Buyurtmachilarga yangi ishlarga tayyorligingizni ko'rsatadi",
    ru: "Показывает заказчикам вашу готовность к новым заказам",
  },
  "settings.availLabel": {
    uz: "Yangi buyurtmalarga tayyorman",
    ru: "Готов(а) к новым заказам",
  },
  "settings.availUntilLabel": {
    uz: "Qachongacha band (ixtiyoriy)",
    ru: "До какого числа заняты (необязательно)",
  },
  "settings.availUntilHint": {
    uz: "Bu sanadan keyin \"tayyor\" holatiga avtomatik qaytasiz",
    ru: "После этой даты статус автоматически вернётся в «готов к работе»",
  },
  "avail.until": {
    uz: "{date} gacha band",
    ru: "Занят до {date}",
  },
  "profile.identityVerified": {
    uz: "Shaxsi tasdiqlangan",
    ru: "Личность подтверждена",
  },

  /* Avto-qabul eslatmasi */
  "ms.autoAcceptNote": {
    uz: "Buyurtmachi 3 kun ichida javob bermasa, bosqich avtomatik qabul qilinadi va to'lov hisobingizga o'tadi",
    ru: "Если заказчик не ответит за 3 дня, этап будет принят автоматически и оплата поступит вам",
  },

  /* Profil — portfolio */
  "profile.portfolio": { uz: "Portfolio", ru: "Портфолио" },

  /* Fayl yuklash */
  "upload.cta": { uz: "Rasm yuklash", ru: "Загрузить изображение" },
  "upload.hint": { uz: "PNG yoki JPG, 2 MB gacha", ru: "PNG или JPG, до 2 МБ" },
  "upload.remove": { uz: "O'chirish", ru: "Удалить" },
  "upload.limit": { uz: "Rasmlar soni chegaraga yetdi", ru: "Достигнут лимит изображений" },
  "upload.rejected": {
    uz: "Ba'zi fayllar rad etildi: faqat PNG/JPG/WebP, 2 MB gacha",
    ru: "Некоторые файлы отклонены: только PNG/JPG/WebP, до 2 МБ",
  },

  /* ============ XARIDOR (yollovchi) tomoni ============ */

  /* Navigatsiya (xaridor) */
  "nav.market": { uz: "Bozor", ru: "Маркет" },
  "nav.myJobs": { uz: "E'lonlarim", ru: "Мои объявления" },
  "nav.myOffers": { uz: "Takliflarim", ru: "Мои предложения" },
  "nav.spending": { uz: "Xarajatlar", ru: "Расходы" },

  /* Xaridor dashboard */
  "bdash.openJobs": { uz: "Ochiq e'lonlar", ru: "Открытые объявления" },
  "bdash.newProposals": { uz: "Yangi takliflar", ru: "Новые предложения" },
  "bdash.toReview": { uz: "Tekshirish kutmoqda", ru: "Ждут проверки" },
  "bdash.actionRequired": { uz: "Harakat talab qilinadi", ru: "Требуют действия" },
  "bdash.reviewSubmitted": {
    uz: "Ish topshirildi — ko'rib chiqing",
    ru: "Работа сдана — проверьте",
  },
  "bdash.proposalsWaiting": {
    uz: "Yangi takliflar keldi",
    ru: "Пришли новые предложения",
  },
  "bdash.noActions": {
    uz: "Hozircha harakat talab qilinadigan ish yo'q",
    ru: "Пока нет задач, требующих действия",
  },
  "bdash.fundNeeded": {
    uz: "To'lov qilib shartnomani faollashtiring",
    ru: "Оплатите, чтобы активировать контракт",
  },
  "bdash.findSpecialist": { uz: "Mutaxassis topish", ru: "Найти специалиста" },
  "bdash.postJob": { uz: "Ish e'lon qilish", ru: "Разместить объявление" },
  "bdash.totalSpent": { uz: "Umumiy sarflangan", ru: "Общие расходы" },
  "bdash.activeProjects": { uz: "Faol loyihalar", ru: "Активные проекты" },
  "bdash.actionCenter": { uz: "Harakatlar markazi", ru: "Центр действий" },
  "bdash.allCaughtUp": { uz: "Hammasi bajarilgan!", ru: "Все выполнено!" },
  "bdash.contractWith": { uz: "Shartnoma sherigi", ru: "Контракт с" },
  "bdash.fundBtn": { uz: "Mablag'lash", ru: "Финансировать" },
  "bdash.reviewProfilesBtn": { uz: "Nomzodlarni ko'rish", ru: "Смотреть кандидатов" },
  "bdash.newSpecialistsApplied": {
    uz: "yangi mutaxassis ariza berdi",
    ru: "новых специалистов откликнулись",
  },
  "bdash.recentContracts": { uz: "Oxirgi shartnomalar", ru: "Последние контракты" },
  "bdash.helpTeaserTitle": { uz: "Yordam kerakmi?", ru: "Нужна помощь?" },
  "bdash.helpTeaserBody": {
    uz: "Loyihangiz uchun eng yaxshi mutaxassisni yollash bo'yicha qo'llanmani o'qing.",
    ru: "Прочитайте руководство о том, как нанять лучших специалистов для вашего проекта.",
  },
  "bdash.helpTeaserBtn": { uz: "Qo'llanmani o'qish", ru: "Читать руководство" },
  "bdash.escrowNote": {
    uz: "To'lovlaringiz escrow'da himoyalangan: mablag' faqat siz ishni qabul qilganingizdan keyin mutaxassisga o'tadi",
    ru: "Ваши платежи защищены эскроу: средства уходят специалисту только после того, как вы примете работу",
  },

  /* Bozor (katalog) */
  "market.title": { uz: "Bozor", ru: "Маркет" },
  "market.subtitle": {
    uz: "Tayyor xizmatni buyurtma qiling yoki mutaxassis tanlab, taklifini o'rganing",
    ru: "Закажите готовую услугу или выберите специалиста",
  },
  "market.filtersTitle": { uz: "Filtrlar", ru: "Фильтры" },
  "market.tabServices": { uz: "Xizmatlar", ru: "Услуги" },
  "market.tabSpecialists": { uz: "Mutaxassislar", ru: "Специалисты" },
  "market.searchPh": {
    uz: "Xizmat yoki mutaxassis qidirish...",
    ru: "Поиск услуги или специалиста...",
  },
  "market.recentSearches": { uz: "Oxirgi qidiruvlar:", ru: "Недавние запросы:" },
  "market.empty": {
    uz: "Hech narsa topilmadi — filtrlarni o'zgartirib ko'ring",
    ru: "Ничего не найдено — попробуйте изменить фильтры",
  },
  "market.sortCheap": { uz: "Arzon narxdan", ru: "Сначала дешёвые" },
  "market.sortExpensive": { uz: "Qimmat narxdan", ru: "Сначала дорогие" },
  "market.sortRating": { uz: "Yuqori reyting", ru: "Высокий рейтинг" },
  "market.viewProfile": { uz: "Profilni ko'rish", ru: "Смотреть профиль" },
  "market.savedOnly": { uz: "Faqat saqlanganlar", ru: "Только сохранённые" },
  "market.save": { uz: "Saqlash", ru: "Сохранить" },
  "market.unsave": { uz: "Saqlanganlardan olish", ru: "Убрать из сохранённых" },
  "market.emptySaved": {
    uz: "Hali hech narsa saqlanmagan — yoqqan xizmat yoki mutaxassisni saqlang",
    ru: "Пока ничего не сохранено — добавьте понравившуюся услугу или специалиста",
  },

  /* Xizmat tafsiloti */
  "svc.about": { uz: "Xizmat haqida", ru: "Об услуге" },
  "svc.details": { uz: "Tafsilotlar", ru: "Детали" },
  "svc.price": { uz: "Narx", ru: "Цена" },
  "svc.delivery": { uz: "Bajarish muddati", ru: "Срок выполнения" },
  "svc.aboutSeller": { uz: "Mutaxassis haqida", ru: "О специалисте" },
  "svc.notFound": { uz: "Xizmat topilmadi", ru: "Услуга не найдена" },
  "order.payMethod": { uz: "To'lov usuli", ru: "Способ оплаты" },

  /* To'g'ridan-to'g'ri taklif (to'lovsiz) */
  "offer.send": { uz: "Taklif yuborish", ru: "Отправить предложение" },
  "offer.modalTitle": {
    uz: "Mutaxassisga taklif yuborish",
    ru: "Предложение специалисту",
  },
  "offer.subject": { uz: "Mavzu", ru: "Тема" },
  "offer.subjectPh": {
    uz: "Masalan: Instagram uchun banner to'plami",
    ru: "Например: Набор баннеров для Instagram",
  },
  "offer.message": { uz: "Xabar va talablar", ru: "Сообщение и требования" },
  "offer.messagePh": {
    uz: "Loyihangiz haqida yozing: nima kerak, muddat, kutilayotgan natija...",
    ru: "Опишите проект: что нужно, сроки, ожидаемый результат...",
  },
  "offer.budget": {
    uz: "Taklif qilinadigan byudjet",
    ru: "Предлагаемый бюджет",
  },
  "offer.budgetHint": {
    uz: "Hozir to'lov olinmaydi — mutaxassis taklifni qabul qilgach, shartnomada bosqichni o'zingiz mablag'laysiz",
    ru: "Оплата сейчас не взимается — после принятия предложения вы профинансируете этап в контракте",
  },
  "offer.sent": {
    uz: "Taklif yuborildi — mutaxassis javobini kuting",
    ru: "Предложение отправлено — ожидайте ответа специалиста",
  },
  "offer.errMessage": { uz: "Xabar yozing", ru: "Напишите сообщение" },
  "offer.errSubject": { uz: "Mavzuni kiriting", ru: "Укажите тему" },
  "offer.duplicate": {
    uz: "Bu mutaxassisga yuborilgan, javob kutilayotgan taklifingiz bor",
    ru: "У вас уже есть ожидающее ответа предложение этому специалисту",
  },
  "offers.title": { uz: "Takliflarim", ru: "Мои предложения" },
  "offers.subtitle": {
    uz: "Mutaxassislarga yuborgan takliflaringiz — qabul qilinsa shartnoma ochiladi",
    ru: "Ваши предложения специалистам — при принятии откроется контракт",
  },
  "offers.empty": {
    uz: "Hali taklif yubormagansiz — bozordan mutaxassis tanlang",
    ru: "Вы ещё не отправляли предложений — выберите специалиста на маркете",
  },
  "offers.emptyCta": { uz: "Bozorga o'tish", ru: "Перейти на маркет" },
  "offer.notFound": { uz: "Taklif topilmadi", ru: "Предложение не найдено" },
  "offer.waiting": {
    uz: "Mutaxassis javobini kutmoqda",
    ru: "Ожидает ответа специалиста",
  },
  "offer.acceptedNote": {
    uz: "Taklif qabul qilindi — shartnoma ochildi. Ish boshlanishi uchun bosqichni mablag'lang.",
    ru: "Предложение принято — контракт открыт. Профинансируйте этап, чтобы началась работа.",
  },
  "offer.declinedNote": {
    uz: "Mutaxassis bu taklifni rad etdi. Bozordan boshqa mutaxassis tanlashingiz mumkin.",
    ru: "Специалист отклонил это предложение. Вы можете выбрать другого специалиста на маркете.",
  },
  "ostatus.yuborilgan": { uz: "Yuborilgan", ru: "Отправлено" },
  "ostatus.qabul_qilindi": { uz: "Qabul qilindi", ru: "Принято" },
  "ostatus.rad_etildi": { uz: "Rad etildi", ru: "Отклонено" },
  "ostatus.bekor_qilingan": { uz: "Bekor qilingan", ru: "Отменено" },
  "offer.withdraw": { uz: "Taklifni bekor qilish", ru: "Отменить предложение" },
  "offer.withdrawTitle": {
    uz: "Taklif bekor qilinsinmi?",
    ru: "Отменить предложение?",
  },
  "offer.withdrawDesc": {
    uz: "Mutaxassis bu taklifni endi qabul qila olmaydi. Keyin xohlasangiz yangi taklif yuborishingiz mumkin.",
    ru: "Специалист больше не сможет принять это предложение. Позже вы сможете отправить новое.",
  },
  "offer.withdrawn": { uz: "Taklif bekor qilindi", ru: "Предложение отменено" },
  "offer.withdrawnNote": {
    uz: "Siz bu taklifni bekor qilgansiz. Xohlasangiz yangi taklif yuborishingiz mumkin.",
    ru: "Вы отменили это предложение. При желании можете отправить новое.",
  },

  /* Mutaxassisga kelgan takliflar */
  "soffers.title": { uz: "Kelgan takliflar", ru: "Входящие предложения" },
  "soffers.hint": {
    uz: "Buyurtmachilar sizga to'g'ridan-to'g'ri yuborgan takliflar",
    ru: "Прямые предложения от заказчиков",
  },
  "soffer.accept": { uz: "Taklifni qabul qilish", ru: "Принять предложение" },
  "soffer.acceptTitle": {
    uz: "Taklif qabul qilinsinmi?",
    ru: "Принять предложение?",
  },
  "soffer.acceptDesc": {
    uz: "Shartnoma ochiladi. Buyurtmachi birinchi bosqichni mablag'lagach ishni boshlaysiz — mablag' escrow'da himoyalanadi.",
    ru: "Откроется контракт. Начните работу после того, как заказчик профинансирует этап — средства защищены эскроу.",
  },
  "soffer.accepted": {
    uz: "Shartnoma ochildi",
    ru: "Контракт открыт",
  },
  "soffer.declineTitle": {
    uz: "Taklif rad etilsinmi?",
    ru: "Отклонить предложение?",
  },
  "soffer.declineDesc": {
    uz: "Buyurtmachiga rad etilgani haqida bildirishnoma boradi. Bu amalni ortga qaytarib bo'lmaydi.",
    ru: "Заказчик получит уведомление об отказе. Это действие нельзя отменить.",
  },
  "soffer.budget": { uz: "Taklif byudjeti", ru: "Бюджет предложения" },
  "soffer.aboutBuyer": { uz: "Buyurtmachi", ru: "Заказчик" },
  "soffer.fromService": { uz: "Xizmat asosida", ru: "На основе услуги" },

  /* Mutaxassis ochiq profili */
  "spec.notFound": { uz: "Mutaxassis topilmadi", ru: "Специалист не найден" },

  /* E'lonlarim */
  "bjobs.title": { uz: "E'lonlarim", ru: "Мои объявления" },
  "bjobs.post": { uz: "Yangi e'lon", ru: "Новое объявление" },
  "bjobs.empty": {
    uz: "Hali e'lon joylamagansiz — birinchi e'loningizni yarating",
    ru: "У вас пока нет объявлений — создайте первое",
  },
  "bjobs.emptyCta": { uz: "E'lon joylash", ru: "Разместить объявление" },
  "bjobs.emptyFiltered": {
    uz: "Bu holatda e'lon yo'q",
    ru: "Нет объявлений с этим статусом",
  },
  "bjobs.close": { uz: "E'lonni yopish", ru: "Закрыть объявление" },
  "bjobs.closeTitle": { uz: "E'lon yopilsinmi?", ru: "Закрыть объявление?" },
  "bjobs.closeDesc": {
    uz: "Yangi takliflar qabul qilinmaydi. Bu amalni ortga qaytarib bo'lmaydi.",
    ru: "Новые предложения приниматься не будут. Это действие нельзя отменить.",
  },
  "bjobs.closed": { uz: "E'lon yopildi", ru: "Объявление закрыто" },
  "jobs.newBuyer": { uz: "Yangi xaridor", ru: "Новый заказчик" },

  /* Ish e'loni wizard'i */
  "jwiz.title": { uz: "Yangi ish e'loni", ru: "Новое объявление" },
  "jwiz.step3": { uz: "Ko'nikmalar va savollar", ru: "Навыки и вопросы" },
  "jwiz.step4": { uz: "Byudjet", ru: "Бюджет" },
  "jwiz.categoryHint": {
    uz: "Loyihangiz qaysi yo'nalishga tegishli?",
    ru: "К какому направлению относится ваш проект?",
  },
  "jwiz.titlePh": {
    uz: "Masalan: Onlayn do'kon uchun logotip va brend kitobi",
    ru: "Например: Логотип и брендбук для интернет-магазина",
  },
  "jwiz.descPh": {
    uz: "Loyihani batafsil yozing: nima kerak, qanday natija kutasiz, nimalar allaqachon tayyor...",
    ru: "Опишите проект подробно: что нужно, какой результат ожидаете, что уже готово...",
  },
  "jwiz.skillsHint": {
    uz: "Kerakli ko'nikmalar mos mutaxassislarga e'loningizni tavsiya qilishda ishlatiladi",
    ru: "Навыки помогают рекомендовать ваше объявление подходящим специалистам",
  },
  "jwiz.screening": {
    uz: "Skrining savollari (ixtiyoriy, 3 tagacha)",
    ru: "Отборочные вопросы (необязательно, до 3)",
  },
  "jwiz.screeningHint": {
    uz: "Mutaxassislar taklif yuborishda shu savollarga javob berishadi",
    ru: "Специалисты ответят на эти вопросы при отправке предложения",
  },
  "jwiz.addQuestion": { uz: "Savol qo'shish", ru: "Добавить вопрос" },
  "jwiz.questionPh": {
    uz: "Masalan: Shunga o'xshash ishlaringizdan namuna bormi?",
    ru: "Например: Есть ли примеры похожих работ?",
  },
  "jwiz.budgetMin": { uz: "Byudjet — dan", ru: "Бюджет — от" },
  "jwiz.budgetMax": { uz: "Byudjet — gacha", ru: "Бюджет — до" },
  "jwiz.budgetHint": {
    uz: "Real oraliq ko'rsatish mos takliflar kelishiga yordam beradi",
    ru: "Реалистичный диапазон помогает получить подходящие предложения",
  },
  "jwiz.escrowHint": {
    uz: "E'lon joylash bepul. To'lov faqat mutaxassis yollanib, bosqich mablag'langanida escrow orqali amalga oshadi",
    ru: "Размещение бесплатно. Оплата происходит через эскроу только при найме и финансировании этапа",
  },
  "jwiz.publish": { uz: "E'lon qilish", ru: "Опубликовать" },
  "jwiz.published": {
    uz: "E'lon joylandi — takliflar kela boshlaydi",
    ru: "Объявление размещено — скоро придут предложения",
  },
  "jwiz.errBudget": {
    uz: "To'g'ri byudjet oralig'ini kiriting",
    ru: "Укажите корректный диапазон бюджета",
  },

  /* E'lon tafsiloti — kelgan takliflar */
  "bjob.proposalsTitle": { uz: "Kelgan takliflar", ru: "Полученные предложения" },
  "bjob.noProposals": {
    uz: "Hozircha taklif kelmagan — mos mutaxassislar tez orada javob berishadi",
    ru: "Предложений пока нет — подходящие специалисты скоро откликнутся",
  },
  "bprop.interview": { uz: "Suhbatga taklif qilish", ru: "Пригласить на собеседование" },
  "bprop.reject": { uz: "Rad etish", ru: "Отклонить" },
  "bprop.hire": { uz: "Yollash", ru: "Нанять" },
  "bprop.rejectTitle": { uz: "Taklif rad etilsinmi?", ru: "Отклонить предложение?" },
  "bprop.rejectDesc": {
    uz: "Mutaxassisga rad etilgani haqida bildirishnoma boradi. Bu amalni ortga qaytarib bo'lmaydi.",
    ru: "Специалист получит уведомление об отказе. Это действие нельзя отменить.",
  },
  "bprop.rejected": { uz: "Taklif rad etildi", ru: "Предложение отклонено" },
  "bprop.interviewSet": { uz: "Suhbatga taklif qilindi", ru: "Приглашение отправлено" },

  /* Yollash wizard'i */
  "hire.title": { uz: "Mutaxassisni yollash", ru: "Нанять специалиста" },
  "hire.subtitle": {
    uz: "Loyihani bosqichlarga bo'ling — har bir bosqich alohida mablag'lanadi va siz qabul qilgandagina to'lanadi",
    ru: "Разбейте проект на этапы — каждый финансируется отдельно и оплачивается только после вашей приёмки",
  },
  "hire.milestones": { uz: "Shartnoma bosqichlari", ru: "Этапы контракта" },
  "hire.msTitle": { uz: "Bosqich nomi", ru: "Название этапа" },
  "hire.msAmount": { uz: "Summa", ru: "Сумма" },
  "hire.msDue": { uz: "Muddat", ru: "Срок" },
  "hire.addMilestone": { uz: "Bosqich qo'shish", ru: "Добавить этап" },
  "hire.total": { uz: "Jami", ru: "Итого" },
  "hire.bidRef": { uz: "Mutaxassis taklifi", ru: "Ставка специалиста" },
  "hire.fundNote": {
    uz: "Hozir to'lov olinmaydi. Shartnoma ochilgach, bosqichlarni workroom'da o'zingiz mablag'laysiz — mablag' escrow'da saqlanadi va ish qabul qilingandagina o'tkaziladi.",
    ru: "Оплата сейчас не взимается. После открытия контракта вы финансируете этапы в воркруме — средства хранятся в эскроу и переводятся только после приёмки.",
  },
  "hire.confirm": { uz: "Yollash", ru: "Нанять" },
  "hire.done": {
    uz: "Mutaxassis yollandi — shartnoma boshlandi",
    ru: "Специалист нанят — контракт начался",
  },
  "hire.errTitle": { uz: "Bosqich nomini kiriting", ru: "Введите название этапа" },
  "hire.errDue": { uz: "Muddatni tanlang", ru: "Выберите срок" },
  "hire.defaultMilestone": { uz: "To'liq ish", ru: "Вся работа" },

  /* Xaridor shartnomalari */
  "contracts.colSeller": { uz: "Mutaxassis", ru: "Специалист" },

  /* Shartnomani faollashtirish (to'liq oldindan to'lov) */
  "cfund.title": { uz: "Shartnomani faollashtirish", ru: "Активация контракта" },
  "cfund.awaitingTitle": {
    uz: "To'lov kutilmoqda — shartnoma hali boshlanmagan",
    ru: "Ожидается оплата — контракт ещё не начат",
  },
  "cfund.awaitingDesc": {
    uz: "Shartnoma tuzildi. Ishni boshlash uchun butun summani Bobo&Doda escrow hisobiga to'lang — pul xavfsiz saqlanadi va faqat siz ishni qabul qilgandagina mutaxassisga o'tadi.",
    ru: "Контракт создан. Чтобы работа началась, оплатите всю сумму на эскроу-счёт Bobo&Doda — деньги защищены и уходят специалисту только после вашей приёмки.",
  },
  "cfund.pay": { uz: "To'lash va faollashtirish", ru: "Оплатить и активировать" },
  "cfund.modalDesc": {
    uz: "Butun summa Bobo&Doda escrow hisobiga o'tkaziladi. Mutaxassisga emas — pul har bosqich qabul qilinganda bosqichma-bosqich beriladi. Qabul qilmasangiz, pul hisobingizga qaytadi.",
    ru: "Вся сумма переводится на эскроу-счёт Bobo&Doda. Не специалисту — деньги передаются поэтапно после приёмки каждого этапа. При отказе средства возвращаются вам.",
  },
  "cfund.done": {
    uz: "Shartnoma faollashdi — mutaxassis ishni boshlaydi",
    ru: "Контракт активирован — специалист приступает к работе",
  },
  "cfund.total": { uz: "Escrow'ga to'lov", ru: "Оплата в эскроу" },
  "cfund.awaitingSeller": {
    uz: "Buyurtmachi to'lovni amalga oshirishi kutilmoqda — to'lov tushgach ishni boshlaysiz",
    ru: "Ожидается оплата от заказчика — начнёте работу после поступления средств",
  },

  /* Xaridor workroom — bosqich amallari */
  "bms.escrowHeld": {
    uz: "Escrow'da saqlanmoqda",
    ru: "Хранится в эскроу",
  },
  "bms.fundedNote": {
    uz: "Mablag' escrow'da — mutaxassis ishlamoqda",
    ru: "Средства в эскроу — специалист работает",
  },
  "bms.accept": { uz: "Qabul qilish", ru: "Принять работу" },
  "bms.acceptTitle": { uz: "Ish qabul qilinsinmi?", ru: "Принять работу?" },
  "bms.acceptDesc": {
    uz: "Mablag' escrow'dan mutaxassisga o'tkaziladi. Bu amalni ortga qaytarib bo'lmaydi.",
    ru: "Средства из эскроу будут переведены специалисту. Это действие нельзя отменить.",
  },
  "bms.accepted": {
    uz: "Ish qabul qilindi — to'lov mutaxassisga o'tdi",
    ru: "Работа принята — оплата переведена специалисту",
  },
  "bms.requestRevision": { uz: "O'zgartirish so'rash", ru: "Запросить правки" },
  "bms.revisionDesc": {
    uz: "Nimani o'zgartirish kerakligini aniq yozing — mutaxassis shunga qarab qayta topshiradi",
    ru: "Опишите конкретно, что исправить — специалист сдаст работу повторно",
  },
  "bms.revisionPh": {
    uz: "Masalan: highlight muqovalaridagi rang brendbook'ka mos emas...",
    ru: "Например: цвет обложек не соответствует брендбуку...",
  },
  "bms.revisionSent": { uz: "So'rov yuborildi", ru: "Запрос отправлен" },
  "bms.errComment": { uz: "Izoh yozing", ru: "Напишите комментарий" },
  "bms.notFundedNote": {
    uz: "Bu bosqich hali mablag'lanmagan — mutaxassis ishni boshlashi uchun mablag'lang",
    ru: "Этап ещё не профинансирован — профинансируйте, чтобы специалист начал работу",
  },
  "bms.waitingWork": {
    uz: "Mutaxassis ishlamoqda — ish topshirilganda xabar olasiz",
    ru: "Специалист работает — вы получите уведомление о сдаче",
  },
  "bms.autoAcceptNote": {
    uz: "Muddat ichida javob bermasangiz, bosqich avtomatik qabul qilinadi va to'lov o'tkaziladi",
    ru: "Если не ответить в срок, этап будет принят автоматически и оплата переведена",
  },
  "bms.revisionWaiting": {
    uz: "O'zgartirish so'raldi — mutaxassis qayta topshirishini kuting",
    ru: "Правки запрошены — ожидайте повторной сдачи",
  },

  /* Sharh qoldirish */
  "brev.title": { uz: "Mutaxassisga baho bering", ru: "Оцените специалиста" },
  "brev.prompt": {
    uz: "Shartnoma yakunlandi! Tajribangiz haqida sharh qoldiring — bu boshqa xaridorlarga yordam beradi",
    ru: "Контракт завершён! Оставьте отзыв — это поможет другим заказчикам",
  },
  "brev.commentPh": {
    uz: "Hamkorlik qanday o'tdi? Sifat, muddat va muloqot haqida yozing",
    ru: "Как прошло сотрудничество? Напишите о качестве, сроках и общении",
  },
  "brev.submit": { uz: "Sharh qoldirish", ru: "Оставить отзыв" },
  "brev.done": { uz: "Sharhingiz uchun rahmat!", ru: "Спасибо за отзыв!" },
  "brev.errComment": { uz: "Sharh yozing", ru: "Напишите отзыв" },
  "contract.yourReview": { uz: "Sizning sharhingiz", ru: "Ваш отзыв" },

  /* Xarajatlar */
  "spend.title": { uz: "Xarajatlar", ru: "Расходы" },
  "spend.total": { uz: "Jami to'langan", ru: "Всего оплачено" },
  "spend.inEscrow": { uz: "Escrow'da", ru: "В эскроу" },
  "spend.escrowHint": {
    uz: "Mablag'langan va tekshiruvdagi bosqichlar",
    ru: "Профинансированные и проверяемые этапы",
  },
  "spend.balance": { uz: "Bobo&Doda hisobim", ru: "Мой счёт Bobo&Doda" },
  "spend.balanceHint": {
    uz: "Bekor qilingan shartnomalardan qaytgan mablag' — kartaga yechishingiz mumkin",
    ru: "Средства, возвращённые с отменённых контрактов — можно вывести на карту",
  },
  "spend.withdraw": { uz: "Kartaga yechish", ru: "Вывести на карту" },
  "spend.withdrawTitle": { uz: "Mablag'ni yechish", ru: "Вывод средств" },
  "spend.withdrawDesc": {
    uz: "Hisobingizdagi mablag' tanlangan kartaga 1 ish kunida o'tkaziladi",
    ru: "Средства со счёта будут переведены на выбранную карту в течение 1 рабочего дня",
  },
  "spend.withdrawn": {
    uz: "So'rov qabul qilindi — mablag' 1 ish kunida kartangizga o'tadi",
    ru: "Заявка принята — средства поступят на карту в течение 1 рабочего дня",
  },
  "spend.recent": { uz: "So'nggi to'lovlar", ru: "Последние платежи" },
  "spend.empty": {
    uz: "Hali to'lov yo'q — birinchi bosqich qabul qilinganda shu yerda ko'rinadi",
    ru: "Платежей пока нет — они появятся после приёмки первого этапа",
  },

  /* Xaridor sozlamalari */
  "bset.subtitle": {
    uz: "Profil, to'lov va xavfsizlik sozlamalarini boshqaring.",
    ru: "Управляйте профилем, оплатой и настройками безопасности.",
  },
  "bset.accountSection": { uz: "Hisob ma'lumotlari", ru: "Данные аккаунта" },
  "bset.accountHint": {
    uz: "Bu ma'lumotlar ish e'loni yoki taklif yuborganingizda mutaxassislarga ko'rinadi.",
    ru: "Эта информация видна специалистам, когда вы публикуете заказ или отправляете предложение.",
  },
  "bset.prefsSection": { uz: "Til va xavfsizlik", ru: "Язык и безопасность" },
  "bset.prefsHint": {
    uz: "Interfeys tili, parol va hisob boshqaruvi.",
    ru: "Язык интерфейса, пароль и управление аккаунтом.",
  },
  "bset.dangerZoneHint": {
    uz: "Ushbu qurilmada hisobingizdan chiqing.",
    ru: "Выйти из аккаунта на этом устройстве.",
  },
  "bset.verificationHint": {
    uz: "Shaxsni tasdiqlab, ishonch belgisini oling.",
    ru: "Подтвердите личность и получите значок доверия.",
  },
  "bset.verificationOpen": { uz: "Ochish", ru: "Открыть" },

  /* Yangi bildirishnomalar */
  "ntf.newProposal": {
    uz: "E'loningizga yangi taklif keldi: {title}",
    ru: "Новое предложение на ваше объявление: {title}",
  },
  "ntf.milestoneSubmitted": {
    uz: "Ish tekshirishga topshirildi: {title}",
    ru: "Работа сдана на проверку: {title}",
  },
  "ntf.hired": {
    uz: "Tabriklaymiz! Siz yollandingiz: {title}",
    ru: "Поздравляем! Вас наняли: {title}",
  },
  "ntf.milestoneAccepted": {
    uz: "Bosqich qabul qilindi — to'lov hisobingizga o'tdi: {title}",
    ru: "Этап принят — оплата зачислена: {title}",
  },
  "ntf.revisionRequested": {
    uz: "Buyurtmachi o'zgartirish so'radi: {title}",
    ru: "Заказчик запросил правки: {title}",
  },
  "ntf.newOffer": {
    uz: "Sizga yangi hamkorlik taklifi: {title}",
    ru: "Новое предложение о сотрудничестве: {title}",
  },
  "ntf.offerAccepted": {
    uz: "Taklifingiz qabul qilindi — shartnoma ochildi: {title}",
    ru: "Ваше предложение принято — контракт открыт: {title}",
  },
  "ntf.offerDeclined": {
    uz: "Taklifingiz rad etildi: {title}",
    ru: "Ваше предложение отклонено: {title}",
  },
  "ntf.offerWithdrawn": {
    uz: "Buyurtmachi taklifini bekor qildi: {title}",
    ru: "Заказчик отменил своё предложение: {title}",
  },
  "hire.errDuePast": {
    uz: "Muddat o'tgan sana bo'lishi mumkin emas",
    ru: "Срок не может быть в прошлом",
  },
  "ntf.contractCancelled": {
    uz: "Shartnoma bekor qilindi: {title}",
    ru: "Контракт отменён: {title}",
  },
  "ntf.contractFunded": {
    uz: "To'lov escrow'ga tushdi — ishni boshlashingiz mumkin: {title}",
    ru: "Оплата поступила в эскроу — можно начинать работу: {title}",
  },
  /* Landing Page */
  "nav_how": { uz: "Qanday ishlaydi", ru: "Как это работает" },
  "nav_cats": { uz: "Kategoriyalar", ru: "Категории" },
  "nav_login": { uz: "Kirish", ru: "Войти" },
  "nav_start": { uz: "Boshlash", ru: "Начать" },
  "hero_tag": { uz: "Erta kirish — Markaziy Osiyo uchun", ru: "Ранний доступ — для Центральной Азии" },
  "hero_h1": { uz: "Eng kuchli mutaxassislar.<br><span class=\"text-gradient\">Nol xavf.</span>", ru: "Нанимайте лучших специалистов.<br><span class=\"text-gradient\">Без рисков.</span>" },
  "hero_sub": { uz: "Bobo&Doda sizni Markaziy Osiyodagi tekshirilgan mutaxassislar bilan bog'laydi. Siz ishni qabul qilmaguningizcha, to'lovingiz kafolatda saqlanadi.", ru: "Bobo&Doda связывает вас с проверенными профессионалами по всей Центральной Азии. Ваша оплата надежно защищена, пока вы не примете работу." },
  "hero_cta1": { uz: "Ish e'lon qilish — Bepul", ru: "Разместить заказ — Бесплатно" },
  "hero_cta2": { uz: "Mutaxassis bo'lib ishlash", ru: "Стать специалистом" },
  "t_secure": { uz: "Ishonchli Eskrou", ru: "Безопасная сделка" },
  "t_secure_p": { uz: "To'lov kafolati", ru: "Оплата защищена" },
  "t_vetted": { uz: "Tekshirilganlar", ru: "Проверенные кадры" },
  "t_vetted_p": { uz: "Shaxs va ko'nikma tekshiruvi", ru: "Проверка личности и навыков" },
  "fc_1": { uz: "Bosqich qabul qilindi", ru: "Этап принят" },
  "fc_1_sub": { uz: "Eskrou orqali chiqarildi", ru: "Выплачено через гарант" },
  "fc_2": { uz: "Yangi xabar", ru: "Новое сообщение" },
  "fc_2_sub": { uz: "Mutaxassislar bilan tezkor suhbat", ru: "Быстрый чат со специалистами" },
  "sc_role": { uz: "Senior Full-Stack Dasturchi", ru: "Senior Full-Stack Разработчик" },
  "sc_escrow": { uz: "Kafolatlangan", ru: "Под гарантией" },
  "sc_rate": { uz: "Narxi", ru: "Ставка" },
  "sc_hire": { uz: "Azizani yollash", ru: "Нанять Азизу" },
  "escrow_tag": { uz: "100% Xavfsiz", ru: "100% Безопасно" },
  "escrow_h2": { uz: "Bobo&Doda Kafolati Qanday Ishlaydi?", ru: "Как работает защита Bobo&Doda" },
  "escrow_sub": { uz: "Frilanserlik xavflarini yo'q qilamiz. Pulingiz siz 100% rozi bo'lguningizcha tizimimizda himoya qilinadi.", ru: "Мы устраняем риски фриланса. Ваши деньги защищены нашей системой до полного удовлетворения результатом." },
  "es1_h": { uz: "Bosqichni moliyalashtirish", ru: "Пополнение этапа" },
  "es1_p": { uz: "Shartlarga kelishib, pulni kiriting. Pul Bobo&Doda tomonidan ishonchli saqlanadi.", ru: "Договоритесь об условиях и внесите средства. Они надежно хранятся в Bobo&Doda." },
  "es2_h": { uz: "Ishni tekshirish", ru: "Проверка работы" },
  "es2_p": { uz: "Mutaxassis ishni topshiradi. Siz uni tekshirib, kerak bo'lsa o'zgartirish so'raysiz.", ru: "Специалист сдает работу. У вас есть время проверить и запросить правки." },
  "es3_h": { uz: "Qabul qilish & To'lash", ru: "Утверждение и оплата" },
  "es3_p": { uz: "Ish tasdiqlanganda pul darhol o'tkaziladi. Muammo bo'lsa, nizo bo'limimiz yordam beradi.", ru: "После утверждения средства моментально переводятся. При проблемах помогает наша команда по спорам." },
  "ev_title": { uz: "Bobo&Doda Himoyasi", ru: "Защищено Bobo&Doda" },
  "ev_desc": { uz: "Bank darajasidagi xavfsizlik va jamoamiz tomonidan ko'rib chiqiladigan adolatli nizo jarayoni.", ru: "Банковский уровень безопасности и честный процесс разрешения споров с участием нашей команды." },
  "ev_s1": { uz: "Xavf", ru: "Риск" },
  "ev_s2": { uz: "Kafolat", ru: "Гарантия" },
  "cat_tag": { uz: "Katalog", ru: "Каталог услуг" },
  "cat_h2_main": { uz: "O'z yo'nalishingizni toping", ru: "Найдите идеального исполнителя" },
  "cat_sub_main": { uz: "Loyihangizni joylashtiring va Markaziy Osiyodagi tasdiqlangan mutaxassislar bilan bog'laning.", ru: "Разместите проект и свяжитесь с проверенными специалистами Центральной Азии." },
  "c_dev": { uz: "Dasturlash va IT", ru: "Разработка и IT" },
  "c_dev_p": { uz: "Web, Mobil, QA, DevOps", ru: "Web, Мобайл, QA, DevOps" },
  "c_des": { uz: "Dizayn va Kreativ", ru: "Дизайн и Креатив" },
  "c_des_p": { uz: "UI/UX, Brending, Animatsiya", ru: "UI/UX, Брендинг, Анимация" },
  "c_wri": { uz: "Matn va Tarjima", ru: "Тексты и Перевод" },
  "c_wri_p": { uz: "Kopirayting, SEO, Texnik", ru: "Копирайтинг, SEO, Технический" },
  "c_mar": { uz: "Sotuv va Marketing", ru: "Продажи и Маркетинг" },
  "c_mar_p": { uz: "SMM, Strategiya, Targeting", ru: "SMM, Стратегия, Таргет" },
  "c_vid": { uz: "Video va Animatsiya", ru: "Видео и Анимация" },
  "c_vid_p": { uz: "Montaj, Motion, VFX", ru: "Монтаж, Моушн, VFX" },
  "c_biz": { uz: "Biznes Konsalting", ru: "Бизнес Консалтинг" },
  "c_biz_p": { uz: "Moliya, Huquq, HR", ru: "Финансы, Право, HR" },
  "m_1": { uz: "Xavfsiz kafolat — birinchi kundan", ru: "Безопасная сделка — с первого дня" },
  "m_2": { uz: "Shaxsi tasdiqlangan mutaxassislar", ru: "Специалисты с подтверждённой личностью" },
  "m_3": { uz: "Markaziy Osiyo uchun yaratilgan", ru: "Создано для Центральной Азии" },
  "m_4": { uz: "Ilk a'zolar uchun imtiyozlar", ru: "Преимущества для первых участников" },
  "test_tag": { uz: "Erta kirish", ru: "Ранний доступ" },
  "test_h2": { uz: "Bobo&Doda'da birinchilardan bo'ling", ru: "Будьте среди первых на Bobo&Doda" },
  "test_sub": { uz: "Biz endi ishga tushmoqdamiz. Soxta raqamlar yoki soxta sharhlar yo'q — faqat Markaziy Osiyoda yollash va ishlashning xavfsiz usuli.", ru: "Мы только начинаем. Никаких фейковых цифр и отзывов — только безопасный способ нанимать и работать в Центральной Азии." },
  "ea_1_h": { uz: "Ilk mutaxassislardan bo'ling", ru: "Станьте одним из первых специалистов" },
  "ea_1_p": { uz: "Hoziroq qo'shiling va Bobo&Doda'da o'z obro'yingizni birinchilardan bo'lib shakllantiring.", ru: "Присоединяйтесь сейчас и одним из первых формируйте свою репутацию на Bobo&Doda." },
  "ea_2_h": { uz: "To'lovingiz birinchi kundan himoyalangan", ru: "Ваша оплата защищена с первого дня" },
  "ea_2_p": { uz: "Har bir shartnoma bosqichma-bosqich to'lov kafolati bilan ta'minlanadi — birinchi loyihangizdan boshlab.", ru: "Каждый контракт защищён поэтапной гарантией оплаты — начиная с самого первого проекта." },
  "ea_3_h": { uz: "To'g'ridan-to'g'ri e'tibor", ru: "Прямое внимание команды" },
  "ea_3_p": { uz: "Kichik jamoamiz har bir ilk foydalanuvchiga shaxsan e'tibor beradi — katta platformalardagidek yo'qolib qolmaysiz.", ru: "Наша небольшая команда лично уделяет внимание каждому раннему пользователю — вы не потеряетесь, как на крупных платформах." },
  "cta_ready": { uz: "Loyihangizni tezlashtirishga tayyormisiz?", ru: "Готовы ускорить свой проект?" },
  "cta_desc": { uz: "Markaziy Osiyoda ish kelajagini birinchi bo'lib shakllantirayotgan kompaniya va mutaxassislardan biri bo'ling.", ru: "Станьте одной из первых компаний и специалистов, формирующих будущее работы в Центральной Азии." },
  "cta_btn1": { uz: "Mutaxassis topish", ru: "Найти специалиста" },
  "cta_btn2": { uz: "Mutaxassis bo'lish", ru: "Стать специалистом" },
  "foot_desc": { uz: "Markaziy Osiyo uchun yangi talant bozori — xavfsiz kafolat va tasdiqlangan mutaxassislarga asoslangan.", ru: "Новая платформа талантов для Центральной Азии — на основе безопасной сделки и проверенных специалистов." },
  "f_platform": { uz: "Platforma", ru: "Платформа" },
  "f_hire": { uz: "Mutaxassis yollash", ru: "Нанять специалистов" },
  "f_work": { uz: "Ish topish", ru: "Найти работу" },
  "f_how": { uz: "Kafolat qanday ishlaydi", ru: "Как работает защита" },
  "f_legal": { uz: "Huquqiy va Xavfsizlik", ru: "Право и Безопасность" },
  "f_terms": { uz: "Foydalanish shartlari", ru: "Условия использования" },
  "f_privacy": { uz: "Maxfiylik siyosati", ru: "Политика конфиденциальности" },
  "f_aml": { uz: "AML va KYC", ru: "AML и KYC" },
  "f_contact": { uz: "Aloqa", ru: "Контакты" },
};
