# @bobododa/contracts

Backend API shartnomasi — **GENERATSIYA QILINGAN**, qo'lda tahrir qilinmaydi.

```
npm run generate:contracts   # root'dan
```

| Fayl | Manba | Generator |
|---|---|---|
| `openapi.json` | backend Nest route metadata | `backend/scripts/emit-openapi.ts` (DB/Redis ga ulanmaydi) |
| `src/openapi-types.ts` | `openapi.json` | `openapi-typescript` |
| `src/enums.ts` | `backend/prisma/schema.prisma` enum bloklari | `scripts/generate.mjs` (regex parse) |
| `src/index.ts` | — | barre |

## Nega alohida paket

`lib/api/wire-enums.ts` (frontend, Bosqich 2) shu paketdan enum ro'yxatini
import qiladi. Backend yangi enum qiymati qo'shsa — `Record<BackendEnum,
FrontendEnum>` exhaustive `satisfies` tekshiruvi `tsc` da yiqiladi. Qo'lda
ko'chirilgan ro'yxat bo'lsa bu himoya ishlamaydi (ADR-02).

Bosqich 1 da API'da hali DTO/endpoint kam — `openapi-types.ts` minimal.
`enums.ts` to'liq (identity + infra enum'lari). Bosqich 2+ da real
endpointlar bilan boyiydi.
