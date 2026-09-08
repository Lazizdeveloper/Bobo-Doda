/**
 * Bobo & Doda platformasining rasmiy bank rekvizitlari (MVP Manual Bank Transfer)
 *
 * Xaridorlar buyurtmalar uchun to'lovni istalgan qulay usulda (bank ilovasi,
 * bank o'tkazmasi, Click, Payme, mobil banking yoki bank kassasi orqali)
 * ushbu hisob raqamga to'laydi.
 */

export interface CompanyBankDetails {
  companyName: string;
  bankName: string;
  accountNumber: string;
  mfo: string;
  inn: string;
  swift: string;
  bankAddress: string;
  paymentPurposeTemplate: string;
  supportPhone: string;
}

export const COMPANY_BANK_DETAILS: CompanyBankDetails = {
  companyName: "Bobo & Doda MChJ",
  bankName: "ATIB 'Kapitalbank' Toshkent shahar filiali",
  accountNumber: "20208000405678901001",
  mfo: "00974",
  inn: "309876543",
  swift: "KAPBUZ22",
  bankAddress: "Toshkent shahri, Sayilgoh ko'chasi 7-uy",
  paymentPurposeTemplate: "Bobo&Doda platformasi orqali #{reference} buyurtmasi uchun xizmat haqi",
  supportPhone: "+998 71 200 45 45",
};

/** Shartnoma uchun unikal Payment Reference / Order ID shakllantirish */
export function generatePaymentReference(contractId: string): string {
  const cleanId = contractId.replace(/^cnt-/, "").toUpperCase();
  return `BD-PAY-2026-${cleanId}`;
}

/** To'lov maqsadi matnini generatsiya qilish */
export function getPaymentPurpose(reference: string): string {
  return `Bobo&Doda: ${reference} shartnomasi bo'yicha to'lov`;
}
