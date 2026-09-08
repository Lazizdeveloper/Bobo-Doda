export interface CountryInfo {
  code: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  flag: string;
  currency: string;
  phonePrefix: string;
  cities: { uz: string; ru: string; en: string }[];
  documentTypes: { value: string; labelUz: string; labelRu: string; labelEn: string; hintUz: string; hintRu: string }[];
}

export const COUNTRIES: CountryInfo[] = [
  {
    code: "UZ",
    nameUz: "O'zbekiston",
    nameRu: "Узбекистан",
    nameEn: "Uzbekistan",
    flag: "🇺🇿",
    currency: "UZS",
    phonePrefix: "+998",
    cities: [
      { uz: "Toshkent shahri", ru: "г. Ташкент", en: "Tashkent City" },
      { uz: "Toshkent viloyati", ru: "Ташкентская область", en: "Tashkent Region" },
      { uz: "Samarqand", ru: "Самарканд", en: "Samarkand" },
      { uz: "Buxoro", ru: "Бухара", en: "Bukhara" },
      { uz: "Andijon", ru: "Андижан", en: "Andijan" },
      { uz: "Farg'ona", ru: "Фергана", en: "Fergana" },
      { uz: "Namangan", ru: "Наманган", en: "Namangan" },
      { uz: "Xorazm (Urganch)", ru: "Хорезм (Ургенч)", en: "Khorezm (Urgench)" },
      { uz: "Qashqadaryo (Qarshi)", ru: "Кашкадарья (Карши)", en: "Kashkadarya (Karshi)" },
      { uz: "Surxondaryo (Termiz)", ru: "Сурхандарья (Термез)", en: "Surkhandarya (Termez)" },
      { uz: "Navoiy", ru: "Навои", en: "Navoi" },
      { uz: "Jizzax", ru: "Джизак", en: "Jizzakh" },
      { uz: "Sirdaryo (Guliston)", ru: "Сырдарья (Гулистан)", en: "Sirdaryo (Gulistan)" },
      { uz: "Qoraqalpog'iston (Nukus)", ru: "Каракалпакстан (Нукус)", en: "Karakalpakstan (Nukus)" },
    ],
    documentTypes: [
      {
        value: "passport",
        labelUz: "Biometrik pasport",
        labelRu: "Биометрический паспорт",
        labelEn: "Biometric Passport",
        hintUz: "Pasportning asosiy rasmli sahifasi va propiska sahifasi",
        hintRu: "Основной разворот паспорта с фото и страница прописки",
      },
      {
        value: "id_card",
        labelUz: "ID-karta",
        labelRu: "ID-карта",
        labelEn: "National ID Card",
        hintUz: "ID kartaning old va orqa tomoni (2 ta rasm)",
        hintRu: "Лицевая и обратная сторона ID-карты (2 фото)",
      },
      {
        value: "driver_license",
        labelUz: "Haydovchilik guvohnomasi",
        labelRu: "Водительское удостоверение",
        labelEn: "Driver's License",
        hintUz: "Yangi namunadagi haydovchilik guvohnomasining old va orqa tomoni",
        hintRu: "Лицевая и обратная сторона водительского удостоверения нового образца",
      },
    ],
  },
  {
    code: "RU",
    nameUz: "Rossiya",
    nameRu: "Россия",
    nameEn: "Russia",
    flag: "🇷🇺",
    currency: "RUB",
    phonePrefix: "+7",
    cities: [
      { uz: "Moskva", ru: "Москва", en: "Moscow" },
      { uz: "Sankt-Peterburg", ru: "Санкт-Петербург", en: "Saint Petersburg" },
      { uz: "Novosibirsk", ru: "Новосибирск", en: "Novosibirsk" },
      { uz: "Yekaterinburg", ru: "Екатеринбург", en: "Yekaterinburg" },
      { uz: "Qozon (Kazan)", ru: "Казань", en: "Kazan" },
      { uz: "Nijniy Novgorod", ru: "Нижний Новгород", en: "Nizhny Novgorod" },
      { uz: "Krasnodar", ru: "Краснодар", en: "Krasnodar" },
      { uz: "Samara", ru: "Самара", en: "Samara" },
      { uz: "Ufa", ru: "Уфа", en: "Ufa" },
      { uz: "Rostov-na-Donu", ru: "Ростов-на-Дону", en: "Rostov-on-Don" },
      { uz: "Krasnoyarsk", ru: "Красноярск", en: "Krasnoyarsk" },
      { uz: "Voronej", ru: "Воронеж", en: "Voronezh" },
      { uz: "Perm", ru: "Пермь", en: "Perm" },
      { uz: "Volgograd", ru: "Волгоград", en: "Volgograd" },
      { uz: "Saratov", ru: "Саратов", en: "Saratov" },
      { uz: "Tyumen", ru: "Тюмень", en: "Tyumen" },
      { uz: "Kaliningrad", ru: "Калининград", en: "Kaliningrad" },
    ],
    documentTypes: [
      {
        value: "internal_passport",
        labelUz: "Ichki pasport (RF)",
        labelRu: "Внутренний паспорт гражданина РФ",
        labelEn: "Russian Internal Passport",
        hintUz: "RF pasportining asosiy rasmli sahifasi va 4-5 sahifalari",
        hintRu: "Разворот с фото и страница с регистрацией по месту жительства",
      },
      {
        value: "passport",
        labelUz: "Xorijga chiqish pasporti (Загранпаспорт)",
        labelRu: "Заграничный паспорт",
        labelEn: "International Passport",
        hintUz: "Amaldagi xorijga chiqish pasportining asosiy sahifasi",
        hintRu: "Основной разворот действующего загранпаспорта",
      },
      {
        value: "driver_license",
        labelUz: "Haydovchilik guvohnomasi",
        labelRu: "Водительское удостоверение",
        labelEn: "Driver's License",
        hintUz: "Haydovchilik guvohnomasining old va orqa tomoni",
        hintRu: "Лицевая и обратная сторона водительского удостоверения",
      },
    ],
  },
  {
    code: "KZ",
    nameUz: "Qozog'iston",
    nameRu: "Казахстан",
    nameEn: "Kazakhstan",
    flag: "🇰🇿",
    currency: "KZT",
    phonePrefix: "+7",
    cities: [
      { uz: "Olmaota (Almaty)", ru: "Алматы", en: "Almaty" },
      { uz: "Ostona (Astana)", ru: "Астана", en: "Astana" },
      { uz: "Chimkent", ru: "Шымкент", en: "Shymkent" },
      { uz: "Qarag'anda", ru: "Караганда", en: "Karaganda" },
      { uz: "Aktobe", ru: "Актобе", en: "Aktobe" },
      { uz: "Atirau", ru: "Атырау", en: "Atyrau" },
      { uz: "Pavlodar", ru: "Павлодар", en: "Pavlodar" },
      { uz: "Taraz", ru: "Тараз", en: "Taraz" },
    ],
    documentTypes: [
      {
        value: "id_card",
        labelUz: "Shaxsiy guvohnoma (Удостоверение личности)",
        labelRu: "Удостоверение личности гражданина РК",
        labelEn: "Kazakhstan National ID",
        hintUz: "Guvohnomaning old va orqa tomoni",
        hintRu: "Лицевая и обратная сторона удостоверения личности",
      },
      {
        value: "passport",
        labelUz: "Qozog'iston Pasporti",
        labelRu: "Паспорт гражданина РК",
        labelEn: "Kazakhstan Passport",
        hintUz: "Pasportning asosiy sahifasi",
        hintRu: "Основной разворот паспорта",
      },
    ],
  },
  {
    code: "KG",
    nameUz: "Qirg'iziston",
    nameRu: "Кыргызстан",
    nameEn: "Kyrgyzstan",
    flag: "🇰🇬",
    currency: "KGS",
    phonePrefix: "+996",
    cities: [
      { uz: "Bishkek", ru: "Бишкек", en: "Bishkek" },
      { uz: "O'sh", ru: "Ош", en: "Osh" },
      { uz: "Jalolobod", ru: "Джалал-Абад", en: "Jalal-Abad" },
      { uz: "Qorako'l", ru: "Каракол", en: "Karakol" },
    ],
    documentTypes: [
      {
        value: "id_card",
        labelUz: "ID-karta",
        labelRu: "ID-карта гражданина КР",
        labelEn: "Kyrgyzstan ID Card",
        hintUz: "ID kartaning old va orqa tomoni",
        hintRu: "Лицевая и обратная сторона ID-карты",
      },
      {
        value: "passport",
        labelUz: "Umumfuqarolik pasporti",
        labelRu: "Общегражданский паспорт КР",
        labelEn: "Kyrgyzstan Passport",
        hintUz: "Pasportning asosiy sahifasi",
        hintRu: "Основной разворот паспорта",
      },
    ],
  },
  {
    code: "TJ",
    nameUz: "Tojikiston",
    nameRu: "Таджикистан",
    nameEn: "Tajikistan",
    flag: "🇹🇯",
    currency: "TJS",
    phonePrefix: "+992",
    cities: [
      { uz: "Dushanbe", ru: "Душанбе", en: "Dushanbe" },
      { uz: "Xo'jand", ru: "Худжанд", en: "Khujand" },
      { uz: "Boxtar", ru: "Бохтар", en: "Bokhtar" },
      { uz: "Ko'lob", ru: "Куляб", en: "Kulob" },
    ],
    documentTypes: [
      {
        value: "id_card",
        labelUz: "ID-karta / Pasport",
        labelRu: "ID-карта / Паспорт гражданина РТ",
        labelEn: "Tajikistan ID / Passport",
        hintUz: "Hujjatning asosiy sahifalari yoki old va orqa tomoni",
        hintRu: "Основной разворот паспорта или обе стороны ID-карты",
      },
    ],
  },
  {
    code: "TR",
    nameUz: "Turkiya",
    nameRu: "Турция",
    nameEn: "Turkey",
    flag: "🇹🇷",
    currency: "TRY",
    phonePrefix: "+90",
    cities: [
      { uz: "Istanbul", ru: "Стамбул", en: "Istanbul" },
      { uz: "Anqara", ru: "Анкара", en: "Ankara" },
      { uz: "Izmir", ru: "Измир", en: "Izmir" },
      { uz: "Antaliya", ru: "Анталья", en: "Antalya" },
      { uz: "Bursa", ru: "Бурса", en: "Bursa" },
    ],
    documentTypes: [
      {
        value: "id_card",
        labelUz: "Kimlik kartasi (T.C. Kimlik)",
        labelRu: "Удостоверение личности (Kimlik)",
        labelEn: "Turkish National ID",
        hintUz: "Kimlik kartasining old va orqa tomoni",
        hintRu: "Лицевая и обратная сторона карты Kimlik",
      },
      {
        value: "passport",
        labelUz: "Turkiya Pasporti",
        labelRu: "Паспорт гражданина Турции",
        labelEn: "Turkish Passport",
        hintUz: "Pasportning rasmli sahifasi",
        hintRu: "Страница паспорта с фотографией",
      },
    ],
  },
  {
    code: "AE",
    nameUz: "BAA (Emiratlar)",
    nameRu: "ОАЭ",
    nameEn: "United Arab Emirates",
    flag: "🇦🇪",
    currency: "AED",
    phonePrefix: "+971",
    cities: [
      { uz: "Dubay", ru: "Дубай", en: "Dubai" },
      { uz: "Abu-Dabi", ru: "Абу-Даби", en: "Abu Dhabi" },
      { uz: "Sharja", ru: "Шарджа", en: "Sharjah" },
      { uz: "Ajman", ru: "Аджман", en: "Ajman" },
    ],
    documentTypes: [
      {
        value: "id_card",
        labelUz: "Emirates ID",
        labelRu: "Emirates ID",
        labelEn: "Emirates ID",
        hintUz: "Emirates ID kartasining old va orqa tomoni",
        hintRu: "Лицевая и обратная сторона Emirates ID",
      },
      {
        value: "passport",
        labelUz: "Pasport va Resident Visa",
        labelRu: "Паспорт и виза резидента",
        labelEn: "Passport & Resident Visa",
        hintUz: "Pasport va viza sahifalari",
        hintRu: "Разворот паспорта и страница с визой",
      },
    ],
  },
  {
    code: "US",
    nameUz: "AQSH",
    nameRu: "США",
    nameEn: "United States",
    flag: "🇺🇸",
    currency: "USD",
    phonePrefix: "+1",
    cities: [
      { uz: "Nyu-York", ru: "Нью-Йорк", en: "New York" },
      { uz: "San-Fransisko (Silikon Vodiysi)", ru: "Сан-Франциско", en: "San Francisco" },
      { uz: "Los-Anjeles", ru: "Лос-Анджелес", en: "Los Angeles" },
      { uz: "Chikago", ru: "Чикаго", en: "Chicago" },
      { uz: "Ostin (Texas)", ru: "Остин", en: "Austin" },
      { uz: "Sietl", ru: "Сиэтл", en: "Seattle" },
      { uz: "Mayami", ru: "Майами", en: "Miami" },
    ],
    documentTypes: [
      {
        value: "driver_license",
        labelUz: "Driver's License (State ID)",
        labelRu: "Водительское удостоверение (State ID)",
        labelEn: "Driver's License / State ID",
        hintUz: "Davlat haydovchilik guvohnomasining old va orqa tomoni",
        hintRu: "Лицевая и обратная сторона водительского удостоверения",
      },
      {
        value: "passport",
        labelUz: "US Passport",
        labelRu: "Паспорт гражданина США",
        labelEn: "US Passport",
        hintUz: "AQSH pasportining asosiy sahifasi",
        hintRu: "Основной разворот паспорта США",
      },
    ],
  },
  {
    code: "GLOBAL",
    nameUz: "Boshqa davlat (Xalqaro)",
    nameRu: "Другая страна (Международная)",
    nameEn: "Other Country (International)",
    flag: "🌍",
    currency: "USD",
    phonePrefix: "+",
    cities: [],
    documentTypes: [
      {
        value: "passport",
        labelUz: "Xalqaro pasport",
        labelRu: "Заграничный паспорт",
        labelEn: "International Passport",
        hintUz: "Davlat tomonidan berilgan rasmiy xalqaro pasport",
        hintRu: "Официальный заграничный паспорт",
      },
      {
        value: "id_card",
        labelUz: "Milliy ID-karta",
        labelRu: "Национальное удостоверение личности",
        labelEn: "National Identity Card",
        hintUz: "Shaxsni tasdiqlovchi rasmiy milliy ID kartaning ikki tomoni",
        hintRu: "Обе стороны официального удостоверения личности",
      },
    ],
  },
];

/** Klaviatura spami va bema'ni so'zlarni aniqlash (qwerty, asdfgh, shcvbscbs va h.k.) */
const SPAM_PATTERNS = [
  /^[a-z]{1,4}$/i, // juda qisqa ma'nosiz
  /qwerty/i,
  /asdf/i,
  /zxcv/i,
  /qwer/i,
  /12345/,
  /(.)\1{3,}/, // bir xil harf 4 marta takrorlangan (aaaa, ssss)
  /[^a-zA-Zа-яА-ЯёЁoʻgʻshchOʻGʻShCh\s\-\.,]/, // begona belgilar
];

/**
 * Lokatsiya matnini tekshirish va tozalash.
 * Agar foydalanuvchi "qwerty" yoki axlat kiritsa, xatolik qaytaradi.
 */
export function validateCustomCity(cityName: string): { valid: boolean; error?: string } {
  const trimmed = cityName.trim();
  if (!trimmed) {
    return { valid: false, error: "Shahar nomi kiritilishi shart" };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: "Shahar nomi kamida 2 ta belgidan iborat bo'lishi kerak" };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: "Shahar nomi 50 ta belgidan oshmasligi kerak" };
  }
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: "Iltimos, haqiqiy shahar nomini kiriting (bema'ni belgilar taqiqlanadi)" };
    }
  }
  return { valid: true };
}

/**
 * Standart formatdagi lokatsiya satrini yaratish (masalan "Toshkent, O'zbekiston")
 */
export function buildLocationString(city: string, countryName: string): string {
  const c = city.trim();
  const cnt = countryName.trim();
  if (!c) return cnt;
  return `${c}, ${cnt}`;
}

/**
 * Mavjud lokatsiyadan davlat va shaharni ajratib olish
 */
export function parseLocationString(locationStr: string): { city: string; countryCode: string; countryName: string } {
  if (!locationStr || !locationStr.trim()) {
    return { city: "", countryCode: "UZ", countryName: "O'zbekiston" };
  }

  const parts = locationStr.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const city = parts[0]!;
    const countryPart = parts[1]!;
    const matched = COUNTRIES.find(
      (c) =>
        c.nameUz.toLowerCase() === countryPart.toLowerCase() ||
        c.nameRu.toLowerCase() === countryPart.toLowerCase() ||
        c.nameEn.toLowerCase() === countryPart.toLowerCase() ||
        c.code.toLowerCase() === countryPart.toLowerCase()
    );
    if (matched) {
      return { city, countryCode: matched.code, countryName: matched.nameUz };
    }
    return { city, countryCode: "GLOBAL", countryName: countryPart };
  }

  // Faqat bitta so'z berilgan bo'lsa
  const matchedCountry = COUNTRIES.find(
    (c) =>
      c.nameUz.toLowerCase() === locationStr.toLowerCase() ||
      c.nameRu.toLowerCase() === locationStr.toLowerCase() ||
      c.nameEn.toLowerCase() === locationStr.toLowerCase() ||
      c.code.toLowerCase() === locationStr.toLowerCase()
  );
  if (matchedCountry) {
    return { city: "", countryCode: matchedCountry.code, countryName: matchedCountry.nameUz };
  }

  return { city: locationStr, countryCode: "UZ", countryName: "O'zbekiston" };
}

/**
 * Mamlakat kodi bo'yicha ma'lumot topish
 */
export function getCountryByCode(code: string): CountryInfo {
  return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0]!;
}
