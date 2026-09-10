// ─────────────────────────────────────────────────────────────────────────
// GENERATSIYA QILINGAN — QO'LDA TAHRIR QILINMANG.
// Manba: backend/prisma/schema.prisma  ·  npm run generate:contracts
// ─────────────────────────────────────────────────────────────────────────

export const Role = {
  SELLER: 'SELLER',
  BUYER: 'BUYER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const RoleValues = ['SELLER', 'BUYER'] as const;

export const StaffRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OPERATIONS: 'OPERATIONS',
  FINANCE: 'FINANCE',
  SUPPORT: 'SUPPORT',
  TRUST_SAFETY: 'TRUST_SAFETY',
  KYC_REVIEWER: 'KYC_REVIEWER',
  ADMIN: 'ADMIN',
} as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];
export const StaffRoleValues = ['SUPER_ADMIN', 'OPERATIONS', 'FINANCE', 'SUPPORT', 'TRUST_SAFETY', 'KYC_REVIEWER', 'ADMIN'] as const;

export const StaffPermission = {
  DASHBOARD: 'DASHBOARD',
  USERS: 'USERS',
  SERVICES: 'SERVICES',
  JOBS: 'JOBS',
  ORDERS: 'ORDERS',
  KYC: 'KYC',
  DISPUTES: 'DISPUTES',
  PAYMENTS: 'PAYMENTS',
  REPORTS: 'REPORTS',
  APPEALS: 'APPEALS',
  REVIEWS: 'REVIEWS',
  SUPPORT: 'SUPPORT',
  CATEGORIES: 'CATEGORIES',
  SETTINGS: 'SETTINGS',
  AUDIT: 'AUDIT',
  STAFF: 'STAFF',
} as const;
export type StaffPermission = (typeof StaffPermission)[keyof typeof StaffPermission];
export const StaffPermissionValues = ['DASHBOARD', 'USERS', 'SERVICES', 'JOBS', 'ORDERS', 'KYC', 'DISPUTES', 'PAYMENTS', 'REPORTS', 'APPEALS', 'REVIEWS', 'SUPPORT', 'CATEGORIES', 'SETTINGS', 'AUDIT', 'STAFF'] as const;

export const AuditActorType = {
  USER: 'USER',
  STAFF: 'STAFF',
  SYSTEM: 'SYSTEM',
} as const;
export type AuditActorType = (typeof AuditActorType)[keyof typeof AuditActorType];
export const AuditActorTypeValues = ['USER', 'STAFF', 'SYSTEM'] as const;

export const OutboxStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;
export type OutboxStatus = (typeof OutboxStatus)[keyof typeof OutboxStatus];
export const OutboxStatusValues = ['PENDING', 'PROCESSING', 'SENT', 'FAILED'] as const;
