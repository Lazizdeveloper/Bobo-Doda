/**
 * O'zbek va boshqa tillardagi matnni qidiruv uchun normallashtirish:
 * Apostrofning barcha turlarini (' ’ ‘ ʻ ʼ ` ´ \u02BB \u02BC \u2018 \u2019 \u0027)
 * olib tashlaydi, shunda "to'lov", "toʻlov", "to‘lov" va "tolov" bir xil natija beradi.
 */
export function normalizeSearchText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/['’‘ʻʼ`´\u02BB\u02BC\u2018\u2019\u0027]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Matn ichidan qidiruv so'zini apostroflardan qat'iy nazar topish.
 */
export function searchIncludes(haystack: string, query: string): boolean {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return true;
  const normHaystack = normalizeSearchText(haystack);
  return normHaystack.includes(normQuery);
}
