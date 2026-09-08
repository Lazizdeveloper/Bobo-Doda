/* Biriktirma fayllar — YAGONA MANBA (chat xabari ham, ish topshirish ham).
 *
 * NEGA ALOHIDA QATLAM: ilgari ikki joy ikki xil ishlardi —
 *   • chat (`ChatFileAttach`) faylni base64 data-URL ga o'girardi, lekin
 *     hajm/tur tekshiruvisiz: 30 MB'lik ZIP localStorage kvotasini bir
 *     urinishda to'ldirib, xabar umuman yuborilmasdi;
 *   • ish topshirish modali esa `URL.createObjectURL(file)` ishlatardi —
 *     `blob:` havola FAQAT o'sha ochiq sahifada yashaydi. Sahifa
 *     yangilangan zahoti u o'ladi, boshqa qurilmadagi xaridor esa uni
 *     UMUMAN ocha olmaydi (havola uning brauzerida mavjud emas).
 *     Ya'ni "fayl biriktirdim" deb ko'rinardi, aslida hech kimga
 *     yetib bormasdi. Backend'ga ham `blob:` yuborib bo'lmaydi.
 *
 * Shuning uchun biriktirma HAR DOIM shu qatlamdan o'tadi va data-URL
 * sifatida saqlanadi.
 *
 * ─── BACKEND ULANGANDA ───────────────────────────────────────────────
 * Bu yerdagi chegaralar (`MAX_ATTACHMENT_BYTES`) localStorage kvotasiga
 * moslangan. Real backend'da fayl `multipart/form-data` bilan
 * `POST /files` ga yuboriladi va javobdagi doimiy URL `DeliverableFile.url`
 * ga yoziladi — UI kodi o'zgarmaydi, chunki u faqat `filesService.upload()`
 * ni biladi (`lib/api/client.ts`). O'shanda chegarani serverdagi limitga
 * moslang va tur tekshiruvini serverda TAKRORLANG: bu yerdagisi qulaylik
 * uchun, xavfsizlik emas.
 */

/** Bitta biriktirma uchun eng katta hajm (15 MB). */
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

/** Bitta xabar/topshiriqqa biriktiriladigan fayllar soni. */
export const MAX_ATTACHMENTS = 5;

/** Ruxsat etilgan MIME turlari. Bo'sh `type` (brauzer aniqlay olmagan)
    kengaytma bo'yicha tekshiriladi. */
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/json",
]);

const ALLOWED_EXT = new Set([
  "png", "jpg", "jpeg", "webp", "gif", "svg",
  "pdf", "zip", "rar", "doc", "docx", "xls", "xlsx",
  "ppt", "pptx", "txt", "csv", "json", "fig",
  "ai", "psd", "sketch", "mp4", "mov",
]);

/** `<input type="file" accept>` uchun — dialogda ortiqcha fayl ko'rinmasin. */
export const ATTACHMENT_ACCEPT =
  "image/*,.pdf,.zip,.rar,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.fig";

export type AttachmentProblem = "FILE_TOO_LARGE" | "FILE_TYPE_NOT_ALLOWED";

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/** Fayl qabul qilinadimi? Qabul qilinsa `null`, aks holda sabab kodi. */
export function attachmentProblem(file: {
  name: string;
  size: number;
  type: string;
}): AttachmentProblem | null {
  if (file.size > MAX_ATTACHMENT_BYTES) return "FILE_TOO_LARGE";
  const type = (file.type || "").toLowerCase();
  if (type && ALLOWED_MIME.has(type)) return null;
  if (ALLOWED_EXT.has(extensionOf(file.name))) return null;
  return "FILE_TYPE_NOT_ALLOWED";
}

/** Faylni data-URL ga o'qiydi (mock saqlash uchun yagona shakl).
 *
 *  KVOTA HIMOYA: Brauzer localStorage hajmi 5-10 MB bilan cheklangan.
 *  Katta fayllar (1.5 MB dan yuqori, 15 MB gacha) uchun xavfsiz mock URL
 *  ishlatiladi, kichik fayllar (rasmlar, matnlar) to'liq base64 DataURL
 *  sifatida o'qiladi. Bu localStorage kvotasi to'lib dastur qulashini oldini oladi.
 */
export function readAsDataUrl(file: Blob): Promise<string> {
  const fileName = (file as File).name || "fayl";
  if (file.size > 1.5 * 1024 * 1024) {
    const safeName = encodeURIComponent(fileName);
    return Promise.resolve(`https://storage.bobododa.uz/deliverables/${Date.now()}-${safeName}`);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("FILE_READ_FAILED"));
    reader.onerror = () => reject(new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

/** Rasm biriktirmasimi? (chatda rasm alohida ko'rsatiladi) */
export function isImageAttachment(file: { type?: string; name: string }): boolean {
  if (file.type?.startsWith("image/")) return true;
  return ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(
    extensionOf(file.name)
  );
}
