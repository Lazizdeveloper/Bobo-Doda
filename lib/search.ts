/** Kirill harflarini lotinga o'giradi — qidiruv so'zi va matn turli
    yozuvda bo'lsa ham (masalan "sayt" — "сайт") moslashtirish uchun.
    Lingvistik jihatdan aniq emas, faqat qidiruv moslashuvi uchun. */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts",
  ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu",
  я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h", і: "i",
};

/** Qidiruv uchun matnni normallashtiradi: kichik harf + kirillni lotinga
    o'giradi + apostrof/tire kabi belgilarni olib tashlaydi, shunda
    "veb-sayt", "veb sayt" va "веб-сайт" bir xil deb solishtiriladi. */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join("")
    .replace(/['’ʻʼ`-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** query normalizedText ichida uchraydimi — ikkalasi ham normalizatsiya
    qilinadi, shuning uchun lotin/kirill va turli tire/apostrof yozuvlari
    bir-biriga mos keladi. */
export function searchMatches(text: string, query: string): boolean {
  if (!query.trim()) return true;
  return normalizeForSearch(text).includes(normalizeForSearch(query));
}
