# `lib/api/wire-enums.ts` — QORALAMA (frontend fayli HALI yozilmaydi)

> **ADR-02.** Backend API inglizcha `UPPER_SNAKE` enum qiymatlarini qaytaradi.
> Frontend `lib/types.ts` o'zbekcha literallardan foydalanadi. Bu fayl —
> adapter (`lib/api/client.ts`) ishlatadigan **ikki tomonlama, exhaustive**
> xarita.
>
> **Bu qoralama.** Haqiqiy `lib/api/wire-enums.ts` **Bosqich 2 da** yoziladi
> — real endpointlar paydo bo'lib, `backend/packages/contracts` (OpenAPI'dan
> generatsiya) tayyor bo'lganда. Shunda `tsc` map to'liqligini majburlaydi
> (backend yangi qiymat qo'shsa — kompilyatsiya xatosi).

## Tayyor (Bosqich 1 — `backend/prisma/schema.prisma` da mavjud)

```ts
// Role ↔ UserRole  (User.roles[] ; sessiyada bitta activeRole)
export const ROLE_TO_FE = {
  SELLER: 'mutaxassis',
  BUYER: 'xaridor',
} as const satisfies Record<BackendRole, Model.UserRole>;

export const ROLE_TO_BE = invert(ROLE_TO_FE); // { mutaxassis: 'SELLER', xaridor: 'BUYER' }
```

`GET /me` javobi:
```
{ role: BackendRole, availableRoles: BackendRole[], ... }
→ adapter: { role: ROLE_TO_FE[role], availableRoles: availableRoles.map(r => ROLE_TO_FE[r]) }
```

Boshqa Bosqich-1 enum'lar (`StaffRole`, `StaffPermission`, `AuditActorType`,
`OutboxStatus`) — faqat admin/ichki; frontend `lib/types.ts` da ekvivalenti
yo'q, shuning uchun map kerak emas (admin panel `AdminRole`/`AdminPermission`
bilan Bosqich 7 da moslashtiriladi).

## Rejalashtirilgan mapping'lar (bosqichlar bo'yicha)

> Manba: `docs/01-data-model.md` §0. Har biri o'z bosqichida `wire-enums.ts`
> ga qo'shiladi va exhaustive `satisfies` bilan bog'lanadi.

| Backend enum | Frontend tipi (`lib/types.ts`) | Bosqich | Xarita eskizi |
|---|---|---|---|
| `Role` | `UserRole` | ✅ 1 | `SELLER↔mutaxassis`, `BUYER↔xaridor` |
| `ServiceStatus` | `ServiceStatus` | 3 | `ACTIVE↔active`, `PAUSED↔paused`, `DRAFT↔draft` (bir xil — identity map) |
| `JobStatus` | `JobStatus` | 3 | `OPEN↔ochiq`, `CLOSED↔yopilgan` |
| `ProposalStatus` | `ProposalStatus` | 3 | `SENT↔yuborilgan`, `VIEWED↔korib_chiqilmoqda`, `SHORTLISTED↔suhbat`, `HIRED↔yollandi`, `REJECTED↔rad_etildi`, `WITHDRAWN↔qaytarib_olingan` |
| `OfferStatus` | `OfferStatus` | 3 | `SENT↔yuborilgan`, `ACCEPTED↔qabul_qilindi`, `DECLINED↔rad_etildi`, `WITHDRAWN↔bekor_qilingan` |
| `ContractStatus` | `ContractStatus` | 4 | `SIGNED↔imzolangan`, `ACTIVE↔faol`, `COMPLETED↔yakunlangan`, `CANCELLED↔bekor_qilingan`, `DISPUTED↔nizo` |
| `ContractSourceType` | `Contract["sourceType"]` | 4 | `SERVICE↔xizmat`, `JOB↔taklif`, `DIRECT_OFFER↔taklifnoma` |
| `ContractPaymentStatus` | `ContractPaymentStatus` | 4/5 | `AWAITING_PAYMENT↔awaiting_payment`, `PENDING_VERIFICATION↔pending_verification`, `CONFIRMED↔payment_confirmed`, `REJECTED↔payment_rejected`, `REFUND_PENDING↔refund_pending`, `REFUNDED↔refunded`, `RECEIPT_UPLOADED↔receipt_uploaded` |
| `MilestoneStatus` | `MilestoneStatus` | 4 | `PENDING↔kutilmoqda`, `FUNDED↔mablaglangan`, `SUBMITTED↔topshirildi`, `ACCEPTED↔qabul_qilindi`, `REVISION_REQUESTED↔ozgartirish_soraldi` |
| `PaymentMethod` | `PaymentMethod` | 5 | `PAYME↔payme`, `CLICK↔click`, `WALLET↔balans` (v1); qolganlari — `FEATURE_DISABLED` |
| `PaymentStatus` | `PaymentStatus` (`state-machines.ts`) | 5 | `INITIATED↔created`, `PENDING↔pending`, `AUTHORIZED↔authorized`, `PAID↔captured`, `FAILED↔failed`, `REFUNDED↔refunded`, `PARTIALLY_REFUNDED↔(yangi)` |
| `CardType` | `CardType` | 5 | `VISA↔visa`, `MASTERCARD↔mastercard`, `UZCARD↔uzcard`, `HUMO↔humo`, `MIR↔mir` (lowercase identity) |
| `WithdrawalStatus` | `WithdrawalStatus` | 5 | `PENDING↔kutilmoqda`, `UNDER_REVIEW↔korib_chiqilmoqda`, `APPROVED↔tasdiqlangan`, `REJECTED↔rad_etilgan` |
| `PayoutStatus` | `PayoutStatus` | 5 | `PENDING↔payout_pending`, `PROCESSING↔payout_processing`, `SENT`+`CONFIRMED↔paid`, `FAILED↔payout_failed` |
| `NotificationKind` | `NotificationKind` | 6 | `JOB↔elon`, `PROPOSAL↔taklif`, `MILESTONE↔bosqich`, `MESSAGE↔xabar`, `PAYMENT↔tolov`, `SYSTEM↔tizim` |
| `DisputeReason` | `Dispute["reason"]` | 6 | identity (lowercase): `SCOPE↔scope` … `OTHER↔other` |
| `DisputeStatus` | `Dispute["status"]` | 6 | `OPEN↔ochiq`, `UNDER_REVIEW↔korib_chiqilmoqda`, `RESOLVED↔hal_qilindi` |
| `VerificationStatus` | `VerificationStatus` | 2 | `NOT_STARTED↔boshlanmagan`, `SUBMITTED`+`UNDER_REVIEW↔korib_chiqilmoqda`, `APPROVED↔tasdiqlangan`, `REJECTED↔rad_etilgan`, `EXPIRED↔(v1.1)` |
| `SupportTopic` | `SupportTopic` | 6 | `PAYMENT↔tolov`, `CONTRACT↔shartnoma`, `DISPUTE↔nizo`, `ACCOUNT↔hisob`, `TECHNICAL↔texnik`, `OTHER↔boshqa` |
| `SupportTicketStatus` | `SupportTicket["status"]` | 6 | `OPEN↔ochiq`, `ANSWERED↔javob_berildi`, `CLOSED↔yopilgan` |

## Yordamchi (qoralama)

```ts
function invert<K extends string, V extends string>(m: Record<K, V>): Record<V, K> {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<V, K>;
}

/** So'rov yuborishda: frontend qiymat → backend qiymat (aks holda 422). */
export function toWire<M extends Record<string, string>>(map: M, feValue: M[keyof M]): keyof M {
  const be = (invert(map) as Record<string, keyof M>)[feValue];
  if (!be) throw new Error(`wire-enums: noma'lum qiymat "${feValue}"`);
  return be;
}
```

## Test (Bosqich 2 da yoziladi)

`wire-enums.spec.ts` — **manba: OpenAPI** (`backend/packages/contracts` yoki
`docs-json`). Har backend enum uchun: barcha qiymatlari `*_TO_FE` map'ida
kaliti bormi (exhaustive), va `*_TO_BE` teskari to'liqmi. Qo'lda ko'chirilgan
ro'yxatga tayanmaydi — OpenAPI'dagi `enum` massivlarini o'qiydi.
