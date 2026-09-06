import { ApiError } from "@/lib/api";

/**
 * Admin amallaridagi xatolar uchun YAGONA o'zbekcha matn manbai.
 *
 * Ilgari bu jadval har bir sahifada qaytadan yozilardi (`tolovlar`,
 * `kategoriyalar`) va boshqa sahifalarda umuman yo'q edi — xato
 * `DangerousActionModal` da xom kod satri sifatida ("FORBIDDEN") chiqardi
 * yoki `catch {}` ichida butunlay yo'qolardi.
 *
 * Kod `lib/api/errors.ts` taksonomiyasidan olinadi; `ApiError.message` asl
 * kod satrini saqlab qolgani uchun aniqroq holatlar (masalan
 * `ALREADY_PROCESSED`) ham ajratiladi.
 */
export function adminErrorText(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  const code = err instanceof ApiError ? err.code : "";

  switch (raw) {
    case "ALREADY_PROCESSED":
      return "Bu yozuv allaqachon ko'rib chiqilgan — sahifani yangilang.";
    case "INSUFFICIENT_BALANCE":
      return "Foydalanuvchi balansida yetarli mablag' yo'q.";
    case "DISPUTE_NOT_FOUND":
      return "Bu shartnoma bo'yicha ochiq nizo yo'q.";
    case "REASON_REQUIRED":
      return "Sabab kamida 5 ta belgidan iborat bo'lishi shart.";
    case "REPLY_REQUIRED":
      return "Javob matni juda qisqa.";
    case "INVALID_AMOUNT":
      return "Summa noto'g'ri — escrow'dagi mablag'dan oshmasligi kerak.";
    case "SELF_LOCK":
      return "O'z hisobingizni bloklay olmaysiz.";
    case "READ_ONLY":
      return "Bu sozlama faqat o'qish uchun — u build/backend darajasida belgilanadi.";
    case "WEAK_PASSWORD":
      return "Parol kamida 8 belgi, harf va raqamdan iborat bo'lishi shart.";
    case "DUPLICATE":
      return "Bunday yozuv allaqachon mavjud.";
  }

  switch (code) {
    case "UNAUTHENTICATED":
      return "Sessiya tugagan — qaytadan kiring.";
    case "FORBIDDEN":
      return "Bu amal uchun sizda ruxsat yo'q.";
    case "NOT_FOUND":
      return "Yozuv topilmadi — u o'chirilgan bo'lishi mumkin.";
    case "CONFLICT":
      return "Holat o'zgargan — sahifani yangilab, qayta urinib ko'ring.";
    case "INVALID_TRANSITION":
      return "Bu holatdan bunday o'tish mumkin emas.";
    case "VALIDATION":
      return "Kiritilgan ma'lumot noto'g'ri.";
    case "STORAGE_FULL":
      return "Xotira to'ldi — o'zgarish saqlanmadi.";
    case "NETWORK":
      return "Tarmoq bilan aloqa yo'q.";
  }

  return "Kutilmagan xato yuz berdi. Qayta urinib ko'ring.";
}
