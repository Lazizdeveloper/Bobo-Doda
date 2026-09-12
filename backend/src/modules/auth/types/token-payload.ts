import type { Role, StaffRole } from '@prisma/client';

/**
 * Marketplace access JWT — MINIMAL claim'lar, sezgir ma'lumot YO'Q.
 *
 * `roles` (User.roles, "qaysi rollarga LAYOQATLI") ATAYLAB bu yerda YO'Q —
 * ADR-04: capability tekshiruvi har doim JIZLI DB o'qish bo'lishi kerak
 * (token 15 daqiqa amal qiladi — shu oraliqda admin foydalanuvchini
 * bloklasa/rolini olib tashlasa, JWT bunga darhol "bexabar" bo'lib qoladi).
 * `activeRole` esa KONTEKST (qaysi rol sifatida ishlayapman) — buni JWT'da
 * saqlash xavfsiz, chunki u faqat "qaysi ekranni ko'rsataman"ga ta'sir
 * qiladi, LAYOQATni EMAS (`RolesGuard` ikkalasini ham tekshiradi).
 */
export interface AccessTokenPayload {
  /** User.id */
  sub: string;
  /** NULL — foydalanuvchi hali birinchi rolini tanlamagan ("pending onboarding" sessiya). */
  activeRole: Role | null;
  /** Shu access tokenni yaratgan refresh oilasi — sessiyani aniqlash uchun (masalan "joriy sessiya"ni belgilash). */
  familyId: string;
}

/**
 * Staff access JWT. `role` — StaffMember.role (bitta, marketplace'dagi
 * ko'p-rol emas). Granular ruxsatlar (`StaffPermission[]`) BU YERDA YO'Q —
 * ular ham LIVE DB o'qish orqali tekshiriladi (`StaffPermissionGuard`),
 * chunki admin huquqi o'zgarishi HAR YERDA darhol kuchga kirishi kerak.
 */
export interface StaffAccessTokenPayload {
  /** StaffMember.id */
  sub: string;
  role: StaffRole;
  /** StaffSession.id — refresh/revoke shu bilan bog'lanadi. */
  sessionId: string;
}
