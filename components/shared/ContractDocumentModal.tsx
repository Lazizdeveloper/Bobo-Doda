"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Contract, Milestone } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

interface ContractDocumentModalProps {
  open: boolean;
  onClose: () => void;
  contract: Contract;
  milestones: Milestone[];
  currentUserId: string | null;
  onSign?: () => Promise<void>;
  signing?: boolean;
}

export function ContractDocumentModal({
  open,
  onClose,
  contract,
  milestones,
  currentUserId,
  onSign,
  signing = false,
}: ContractDocumentModalProps) {
  const { t, lang } = useT();
  const [agreed, setAgreed] = useState(false);

  if (!contract) return null;

  const contractNo =
    contract.contractNumber ||
    `BD-${new Date(contract.createdAt).getFullYear()}-${(contract.id || "1").replace(/\D/g, "").padStart(4, "0") || "0108"}`;

  const isBuyer = currentUserId === contract.buyerId;
  const isSeller = currentUserId === contract.sellerId;

  const hasMySignature = isBuyer
    ? Boolean(contract.buyerAcceptedAt)
    : isSeller
    ? Boolean(contract.sellerAcceptedAt)
    : true;

  const needsMySignature = !hasMySignature && Boolean(onSign);

  function handlePrint() {
    window.print();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("contract.viewDocument")}
      size="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t("common.close")}
            </Button>
            <Button variant="secondary" onClick={handlePrint} className="gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              {t("receipt.print")} / PDF
            </Button>
          </div>

          {needsMySignature && onSign && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-ink cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
                />
                <span className="max-w-xs text-muted text-2xs sm:text-xs">
                  Shartnoma shartlari va ofertaga roziman
                </span>
              </label>
              <Button
                disabled={!agreed}
                loading={signing}
                onClick={onSign}
                className="font-bold shadow-sm"
              >
                ✍️ {t("contract.signAction")}
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div
        id="printable-contract"
        className="flex flex-col gap-6 rounded-card border border-line bg-card p-6 sm:p-8 text-ink shadow-sm text-xs leading-relaxed"
      >
        {/* Hujjat Bosh qismi */}
        <div className="flex flex-col gap-4 border-b border-line pb-6 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-btn bg-primary font-heading font-black text-on-primary text-xl shadow-xs">
                BD
              </div>
              <div>
                <span className="font-heading text-lg font-extrabold tracking-tight text-ink">
                  BOBO & DODA
                </span>
                <p className="text-2xs text-muted">
                  Kafolatlangan Freelance va Masofaviy Ishlar Platformasi
                </p>
              </div>
            </div>

            <div className="text-right">
              <Badge tone="primary">RASMIY ELEKTRON SHARTNOMA</Badge>
              <p className="mt-1 font-mono text-sm font-bold text-ink">{contractNo}</p>
              <p className="text-2xs text-muted">
                Tuzilgan sana: {formatDate(contract.createdAt, lang)}
              </p>
            </div>
          </div>

          <div className="mt-2 text-center">
            <h1 className="font-heading text-base font-extrabold uppercase tracking-wide text-ink sm:text-lg">
              FRILANS XIZMATLARI KO&apos;RSATISH BO&apos;YICHA IKKI TOMONLAMA ELEKTRON SHARTNOMA VA OMMAVIY OFERTA
            </h1>
            <p className="mt-1 text-2xs text-muted">
              (O&apos;zbekiston Respublikasi Fuqarolik Kodeksi 367–370-moddalari va &quot;Elektron tijorat to&apos;g&apos;risida&quot;gi Qonuni asosida tuzilgan)
            </p>
          </div>
        </div>

        {/* Tomonlar / Taraflar */}
        <div className="grid grid-cols-1 gap-4 rounded-input border border-line bg-surface/60 p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 border-b border-line pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted">
              1. BUYURTMACHI (MIJOZ):
            </span>
            <p className="text-sm font-bold text-ink">{contract.buyerName}</p>
            <p className="text-2xs text-muted">ID: {contract.buyerId}</p>
            <p className="text-2xs text-muted">
              Telefon: {contract.buyerAcceptedPhone || "+998 91 876 54 32"}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  contract.buyerAcceptedAt ? "bg-success" : "bg-warning"
                }`}
              />
              <span className="text-2xs font-semibold text-ink">
                {contract.buyerAcceptedAt
                  ? `Elektron imzolangan (${formatDate(contract.buyerAcceptedAt, lang)})`
                  : "Imzolash kutilmoqda"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:pl-2">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted">
              2. IJROCHI (MUTAXASSIS):
            </span>
            <p className="text-sm font-bold text-ink">{contract.sellerName}</p>
            <p className="text-2xs text-muted">ID: {contract.sellerId}</p>
            <p className="text-2xs text-muted">
              Telefon: {contract.sellerAcceptedPhone || "+998 90 123 45 67"}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  contract.sellerAcceptedAt ? "bg-success" : "bg-warning"
                }`}
              />
              <span className="text-2xs font-semibold text-ink">
                {contract.sellerAcceptedAt
                  ? `Elektron imzolangan (${formatDate(contract.sellerAcceptedAt, lang)})`
                  : "Imzolash kutilmoqda"}
              </span>
            </div>
          </div>
        </div>

        {/* 1-MODDA */}
        <section className="flex flex-col gap-1.5">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-primary-deep">
            1-MODDA. SHARTNOMA PREDMETI VA VAZIFALAR DOIRASI
          </h2>
          <p className="text-muted">
            1.1. Mazkur shartnomaga muvofiq, Ijrochi Buyurtmachining topshirig&apos;iga binoan{" "}
            <strong className="text-ink">&quot;{contract.title}&quot;</strong> bo&apos;yicha texnik topshiriqda ko&apos;rsatilgan vazifalarni o&apos;z vaqtida va sifatli bajarish, Buyurtmachi esa ushbu xizmat natijasini qabul qilib, kelishilgan haqni Bobo & Doda Escrow kafolat tizimi orqali to&apos;lash majburiyatini oladi.
          </p>
          <p className="text-muted">
            1.2. Ijro muddati, bosqichlar va texnik talablar shartnomaning 2-moddasidagi jadval hamda platforma ichidagi o&apos;zaro yozishmalar bilan belgilanadi.
          </p>
        </section>

        {/* 2-MODDA */}
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-primary-deep">
            2-MODDA. BOSQICHLAR (MILESTONES), MUDDATLAR VA TO&apos;LOV MIQDORI
          </h2>
          <div className="overflow-hidden rounded-input border border-line">
            <table className="w-full text-left text-2xs">
              <thead className="bg-surface border-b border-line font-semibold text-muted">
                <tr>
                  <th className="px-3 py-2">№</th>
                  <th className="px-3 py-2">Bosqich nomi</th>
                  <th className="px-3 py-2">Muddat</th>
                  <th className="px-3 py-2 text-right">Summasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-card">
                {milestones.length === 0 ? (
                  <tr>
                    <td className="px-3 py-2">1</td>
                    <td className="px-3 py-2 font-medium text-ink">{contract.title}</td>
                    <td className="px-3 py-2 text-muted">Kelishilgan muddatda</td>
                    <td className="px-3 py-2 text-right font-bold text-ink">
                      {formatMoney(contract.totalAmount, lang)}
                    </td>
                  </tr>
                ) : (
                  milestones.map((m, idx) => (
                    <tr key={m.id || idx}>
                      <td className="px-3 py-2 text-faint">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-ink">
                        {m.title}
                        {m.description && (
                          <span className="block text-3xs text-muted">{m.description}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {m.dueDate ? formatDate(m.dueDate, lang) : "Belgilangan"}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-ink">
                        {formatMoney(m.amount, lang)}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-surface/60 font-bold">
                  <td colSpan={3} className="px-3 py-2.5 text-right uppercase text-muted">
                    Jami shartnoma qiymati:
                  </td>
                  <td className="px-3 py-2.5 text-right font-heading text-xs text-primary-deep">
                    {formatMoney(contract.totalAmount, lang)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 3-MODDA */}
        <section className="flex flex-col gap-1.5">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-primary-deep">
            3-MODDA. ESCROW (KAFOLATLI HISOB) VA MABLAG&apos;LARNI MUZLATISH TARTIBI
          </h2>
          <p className="text-muted">
            3.1. Mazkur shartnoma bo&apos;yicha to&apos;lovlar faqat Bobo & Doda platformasining rasmiy Escrow tranzit hisobvarag&apos;i orqali amalga oshiriladi.
          </p>
          <p className="text-muted">
            3.2. Buyurtmachi tomonidan kiritilgan mablag&apos; ish to&apos;liq yakunlanib, Buyurtmachi tomonidan tekshirilib qabul qilinmaguncha yoki belgilangan 3 kunlik avtomatik tekshiruv muddati tugamaguncha platforma depozitida xavfsiz muzlatiladi.
          </p>
          <p className="text-muted">
            3.3. Tomonlarning platformadan tashqarida (naqd pul, to&apos;g&apos;ridan-to&apos;g&apos;ri karta orqali) o&apos;zaro hisob-kitob qilishi qat&apos;iyan taqiqlanadi. Platformadan tashqaridagi kelishuvlar ushbu shartnoma kafolati doirasiga kirmaydi.
          </p>
        </section>

        {/* 4-MODDA */}
        <section className="flex flex-col gap-1.5">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-primary-deep">
            4-MODDA. INTELLEKTUAL MULK VA MUALLIFLIK HUQUQLARI
          </h2>
          <p className="text-muted">
            4.1. Ijrochi tomonidan yaratilgan barcha dasturiy kodlar, dizayn maketlari, kontent, algoritmlar va boshqa ish natijalariga bo&apos;lgan barcha mulkiy huquqlar shartnoma summasi to&apos;liq to&apos;langan paytdan boshlab Buyurtmachiga to&apos;liq va qaytarib olinmas tarzda o&apos;tadi.
          </p>
          <p className="text-muted">
            4.2. Ijrochi topshirilayotgan ish uchinchi shaxslarning patent, mualliflik yoki mulkiy huquqlarini buzmasligiga kafolat beradi.
          </p>
        </section>

        {/* 5-MODDA */}
        <section className="flex flex-col gap-1.5">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-primary-deep">
            5-MODDA. MAXFIYLIK (NDA) VA TIJORAT SIRLARI
          </h2>
          <p className="text-muted">
            5.1. Tomonlar loyiha davomida bir-birlaridan olgan har qanday texnik, tijorat, moliyaviy va shaxsiy ma&apos;lumotlarni uchinchi shaxslarga oshkor qilmaslik majburiyatini oladilar.
          </p>
        </section>

        {/* 6-MODDA: PLATFORMA HUQUQIY HIMOYA VA JAVOBGARLIK CHEGARASI */}
        <section className="flex flex-col gap-2 rounded-card border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-primary-deep">
              6-MODDA. PLATFORMANING HUQUQIY MAQOMI VA JAVOBGARLIKNI CHEKLASH
            </h2>
          </div>
          <p className="text-ink font-medium">
            6.1. &quot;Bobo & Doda&quot; platformasi O&apos;zbekiston Respublikasining &quot;Elektron tijorat to&apos;g&apos;risida&quot;gi Qonuni va Fuqarolik Kodeksiga muvofiq, tomonlar o&apos;rtasida mustaqil axborot vositachisi hamda kafillik (Escrow) operatori sifatida ishtirok etadi.
          </p>
          <p className="text-muted">
            6.2. <strong>Platforma javobgarligi chegarasi:</strong> Platforma tomonlarning soliq majburiyatlari, shaxsiy noqonuniy harakatlari, shuningdek tomonlar tomonidan platformadan tashqarida qilingan qilmishlar uchun javobgar bo&apos;lmaydi.
          </p>
          <p className="text-muted">
            6.3. <strong>Majburiyatlardan qochishning oldini olish:</strong> Har ikkala tomon platformada qonuniy identifikatsiyadan o&apos;tgan (telefon raqami, pasport/verifikatsiya ma&apos;lumotlari, IP-manzillar va xabarlar jurnali qat&apos;iy qayd qilinadi). Tomonlardan birortasi asossiz ravishda o&apos;z majburiyatlarini bajarmasdan qochib keta olmaydi — barcha harakatlar yuridik dalil sifatida saqlanadi va zarur hollarda huquqni muhofaza qiluvchi organlarga taqdim etiladi.
          </p>
          <p className="text-muted">
            6.4. <strong>Arbitraj vakolati:</strong> Tomonlar o&apos;rtasida kelishmovchilik kelib chiqqan taqdirda, Bobo & Doda Mustaqil Arbitraj xizmati taqdim etilgan dalillarni xolisona o&apos;rganib chiqib, muzlatilgan Escrow depozitini tegishli tarafga to&apos;lab berish yoki qaytarish bo&apos;yicha uzil-kesil qaror chiqaradi.
          </p>
        </section>

        {/* 7-MODDA */}
        <section className="flex flex-col gap-1.5">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-primary-deep">
            7-MODDA. NIZOLARNI HAL ETISH TARTIBI (PLATFORMA ARBITRAJI)
          </h2>
          <p className="text-muted">
            7.1. Barcha e&apos;tirozlar va nizoli masalalar birinchi navbatda platformaning &quot;Nizo ochish&quot; (Dispute) bo&apos;limi orqali hal qilinadi. Arbitraj xulosasi tomonlar uchun majburiy hisoblanadi.
          </p>
          <p className="text-muted">
            7.2. Platforma arbitrajida yechim topilmagan masalalar O&apos;zbekiston Respublikasining amaldagi qonunchiligi asosida sud tartibida ko&apos;rib chiqiladi.
          </p>
        </section>

        {/* 8-MODDA */}
        <section className="flex flex-col gap-1.5">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-primary-deep">
            8-MODDA. ELEKTRON IMZO VA SHARTNOMANING YURIDIK KUCHI
          </h2>
          <p className="text-muted">
            8.1. Mazkur shartnoma tomonlarning platformadagi shaxsiy kabinetlari orqali elektron rozilik (One-Time Password / E-Sign) orqali tasdiqlangan paytdan boshlab to&apos;liq yuridik kuchga kiradi va qog&apos;oz nusxadagi muhrlangan shartnoma bilan teng yuridik maqomga ega.
          </p>
        </section>

        {/* ELEKTRON IMZOLAR BLOKI */}
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-line pt-6 sm:grid-cols-2">
          {/* Buyurtmachi muhri */}
          <div className="flex flex-col justify-between rounded-card border border-line bg-surface/50 p-4">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-muted">
                BUYURTMACHI ELEKTRON IMZOSI:
              </span>
              <p className="mt-1 font-bold text-ink">{contract.buyerAcceptedName || contract.buyerName}</p>
              <p className="text-2xs text-muted">
                Telefon: {contract.buyerAcceptedPhone || "+998 91 876 54 32"}
              </p>
            </div>

            <div className="mt-4 rounded-input border border-success/30 bg-success/5 p-3 text-2xs">
              <div className="flex items-center gap-1.5 font-bold text-success-deep">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>BOBO & DODA VERIFIED E-SIGN</span>
              </div>
              <p className="mt-1 font-mono text-3xs text-muted break-all">
                SHA256:BUYER-{contract.id}-{contract.buyerId.slice(-4)}-{contract.buyerAcceptedAt ? contract.buyerAcceptedAt.slice(0, 10) : "OK"}
              </p>
              <p className="mt-0.5 text-3xs text-faint">
                Holati: {contract.buyerAcceptedAt ? `Tasdiqlangan (${formatDate(contract.buyerAcceptedAt, lang)})` : "Elektron qabul qilingan"}
              </p>
            </div>
          </div>

          {/* Ijrochi muhri */}
          <div className="flex flex-col justify-between rounded-card border border-line bg-surface/50 p-4">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-muted">
                IJROCHI (MUTAXASSIS) ELEKTRON IMZOSI:
              </span>
              <p className="mt-1 font-bold text-ink">{contract.sellerAcceptedName || contract.sellerName}</p>
              <p className="text-2xs text-muted">
                Telefon: {contract.sellerAcceptedPhone || "+998 90 123 45 67"}
              </p>
            </div>

            {contract.sellerAcceptedAt ? (
              <div className="mt-4 rounded-input border border-success/30 bg-success/5 p-3 text-2xs">
                <div className="flex items-center gap-1.5 font-bold text-success-deep">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>BOBO & DODA VERIFIED E-SIGN</span>
                </div>
                <p className="mt-1 font-mono text-3xs text-muted break-all">
                  SHA256:SELLER-{contract.id}-{contract.sellerId.slice(-4)}-{contract.sellerAcceptedAt.slice(0, 10)}
                </p>
                <p className="mt-0.5 text-3xs text-faint">
                  Holati: Tasdiqlangan (${formatDate(contract.sellerAcceptedAt, lang)})
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-input border border-warning/30 bg-warning/5 p-3 text-2xs">
                <div className="flex items-center gap-1.5 font-bold text-warning">
                  <span>⏳</span>
                  <span>IMZOLASH KUTILMOQDA</span>
                </div>
                <p className="mt-1 text-3xs text-muted">
                  Ijrochi tomonidan shartnoma shartlarini elektron tasdiqlash jarayoni kutilmoqda.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Platforma kafolat shtampi */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-accent/20 bg-accent/5 p-3.5 text-2xs text-muted">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏛️</span>
            <div>
              <p className="font-bold text-ink">
                BOBO & DODA RAQAMLI KAFOLAT VA ARBITRAJ REYESTRI
              </p>
              <p className="text-3xs text-faint">
                Ushbu shartnoma xavfsiz Escrow depoziti va Ommaviy oferta qoidalari bilan himoyalangan.
              </p>
            </div>
          </div>
          <div className="font-mono text-3xs font-semibold text-accent">
            REG: BD-UZ-{contractNo}
          </div>
        </div>
      </div>
    </Modal>
  );
}
