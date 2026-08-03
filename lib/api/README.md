# `lib/api` — Frontend API chegarasi (backend-ready)

UI faqat shu paketdan import qiladi. Hozirgi implementatsiya brauzer ichidagi
mock adapterga (`lib/mock-api`, `localStorage`) delegatsiya qiladi. **Haqiqiy
backend `client.ts` ni almashtiradi — sahifa/komponentlar qayta yozilmaydi.**

## Qatlamlar

| Fayl | Vazifa | Backend'da |
|---|---|---|
| `contracts.ts` | Typed service interfeyslari + DTO'lar (`AuthService`, `JobsService`, `PaymentDTO`, `ApiPage<T>`, `ApiListQuery`) | **O'zgarmaydi** — shartnoma shu |
| `errors.ts` | `ApiError` + `ApiErrorCode` taksonomiyasi (HTTP statusga bog'langan, `retryable`, `fieldErrors`) | **O'zgarmaydi** |
| `state-machines.ts` | Holat o'tishlari (shartnoma/bosqich/…) — UI va server bir manbadan | Ulashiladi |
| `client.ts` | Adapter: interfeyslarni **amalga oshiradi** | **Shu fayl almashadi** |
| `index.ts` | Yagona ommaviy chegara (`export *`) | O'zgarmaydi |

UI qoidasi: har doim `@/lib/api` dan import qiling, hech qachon `@/lib/mock-api`
dan to'g'ridan-to'g'ri emas. Domen service obyektlarini afzal ko'ring
(`jobsService.list()`), `client.ts` dagi kabi.

## Backend'ga o'tish retsepti

`client.ts` dagi har bir metodni `fetch` bilan almashtiring — **interfeys bir xil
qoladi**, shuning uchun UI umuman o'zgarmaydi:

```ts
// Hozir (mock):
export const jobsService: JobsService = {
  list: () => call(mock.getJobs),
  get: (id) => call(() => mock.getJob(id)),
  // ...
};

// Backend (misol):
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) throw await toApiError(res); // status → ApiErrorCode
  return res.status === 204 ? (undefined as T) : res.json();
}

export const jobsService: JobsService = {
  list: () => call(() => http<Job[]>("/jobs")),
  get: (id) => call(() => http<Job | null>(`/jobs/${id}`)),
  // ...
};
```

`call(...)` (= `withNormalizedErrors`) o'z joyida qoladi — u har qanday
tashlanган xatoni `ApiError` ga normalizatsiya qiladi.

### Xato shartnomasi (server → UI)

Server javobidagi HTTP statusni `ApiErrorCode` ga bog'lang (`toApiError`):

| HTTP | `ApiErrorCode` | UI xatti-harakati |
|---|---|---|
| 401 | `UNAUTHENTICATED` | login'ga yo'naltirish |
| 403 | `FORBIDDEN` | "ruxsat yo'q" |
| 404 | `NOT_FOUND` | topilmadi holati |
| 409 | `CONFLICT` / `INVALID_TRANSITION` | qayta yuklash / holat eskirgan |
| 422 | `VALIDATION` | `fieldErrors` ni forma maydonlariga bering |
| 429 | `RATE_LIMITED` | keyinroq urinish |
| 503 | `PAYMENTS_PAUSED` | `retryable` — qayta urinish tugmasi |
| 0 (offline) | `NETWORK` | `retryable` |

`fieldErrors?: Record<string,string>` — server maydon-darajali validatsiyani
qaytarganda, uni to'g'ridan-to'g'ri `Input error` proplariga ulash mumkin.

## Pagination (backend'da yoqiladi)

`ApiListQuery` (`cursor`/`limit`/`search`/`sort`) va `ApiPage<T>`
(`items`/`nextCursor`/`total`) allaqachon aniqlangan — kursorli. Hozir ro'yxatlar
to'liq qaytariladi va client-side sahifalanadi (`Pagination` komponenti,
`useDebouncedValue`). Backend'da: service metodini `ApiListQuery` qabul qilib
`ApiPage<T>` qaytaradigan qilib kengaytiring; UI'dagi `page/PER_PAGE` mantiqi
`cursor/nextCursor` ga o'tadi (faqat ro'yxat sahifalarida, komponentlar emas).

## To'lov (PaymentDTO)

`PaymentDTO.idempotencyKey` — to'lovni **takroran yuborishdan** himoya (tarmoq
qayta urinishi ikki marta yechmasligi uchun). Backend gateway (Payme/Click/karta)
`providerReference` ni to'ldiradi; `status` webhook orqali yangilanadi.

## Migratsiya tikuvi (seam)

`index.ts` da vaqtincha `export * from "@/lib/mock-api"` bor — eski ekranlar
adapterga to'liq ko'chguncha barqaror qolishi uchun. **Barcha ekran domen
service'lariga o'tgach bu qatorni olib tashlang** — shunda mock butunlay
`client.ts` orqasida qoladi va bitta faylni almashtirish kifoya.
