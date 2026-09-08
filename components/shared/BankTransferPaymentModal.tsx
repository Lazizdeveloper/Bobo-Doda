"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n";
import { formatFileSize, formatMoney } from "@/lib/format";
import {
  COMPANY_BANK_DETAILS,
  generatePaymentReference,
  getPaymentPurpose,
} from "@/lib/company-bank-details";
import { paymentsService } from "@/lib/api";
import { readAsDataUrl } from "@/lib/attachments";
import { B2BInvoiceModal } from "@/components/shared/B2BInvoiceModal";
import type { Contract } from "@/lib/types";

interface BankTransferPaymentModalProps {
  open: boolean;
  onClose: () => void;
  contract: Contract;
  onSuccess: () => void;
}

type PaymentTab = "card" | "bank";

export function BankTransferPaymentModal({
  open,
  onClose,
  contract,
  onSuccess,
}: BankTransferPaymentModalProps) {
  const { t, lang } = useT();
  const { toast } = useToast();

  // If already submitted bank receipt, default to bank tab; otherwise default to instant card
  const [activeTab, setActiveTab] = useState<PaymentTab>(
    contract.paymentStatus === "pending_verification" ||
      contract.paymentStatus === "payment_rejected" ||
      contract.b2bPending
      ? "bank"
      : "card"
  );

  /* Card payment state */
  const [cardStep, setCardStep] = useState<"input" | "sms">("input");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardError, setCardError] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsError, setSmsError] = useState("");
  const [smsTimer, setSmsTimer] = useState(60);
  const [sendingSms, setSendingSms] = useState(false);

  /* Timer for SMS countdown */
  useEffect(() => {
    if (cardStep !== "sms" || smsTimer <= 0) return;
    const interval = setInterval(() => {
      setSmsTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cardStep, smsTimer]);

  /* Bank transfer receipt state */
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<{
    name: string;
    size: number;
    url: string;
    type: string;
  } | null>(
    contract.paymentReceiptUrl
      ? {
          name: contract.paymentReceiptName || "tolov_cheki.pdf",
          size: contract.paymentReceiptSize || 1024 * 150,
          url: contract.paymentReceiptUrl,
          type: "application/pdf",
        }
      : null
  );
  const [notes, setNotes] = useState(contract.paymentNotes || "");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileError, setFileError] = useState("");

  const paymentReference =
    contract.paymentReference || generatePaymentReference(contract.id);
  const paymentPurpose = getPaymentPurpose(paymentReference);

  // Detect card type
  const cleanCardDigits = cardNumber.replace(/\D/g, "");
  const isUzcard = cleanCardDigits.startsWith("8600");
  const isHumo = cleanCardDigits.startsWith("9860");

  const handleCardNumberChange = (val: string) => {
    setCardError("");
    const digits = val.replace(/\D/g, "").slice(0, 16);
    const formatted = digits.replace(/(\d{4})/g, "$1 ").trim();
    setCardNumber(formatted);
  };

  const handleCardExpiryChange = (val: string) => {
    setCardError("");
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) {
      setCardExpiry(digits);
    } else {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    }
  };

  const copyToClipboard = async (textToCopy: string, fieldKey: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      toast(
        lang === "ru" ? "Ошибка копирования" : "Nusxa olishda xatolik",
        "error"
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setFileError(
        lang === "ru"
          ? "Размер файла не должен превышать 15 МБ"
          : "Fayl hajmi 15 MB dan oshmasligi kerak"
      );
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      setReceiptFile({
        name: file.name,
        size: file.size,
        url: dataUrl,
        type: file.type || "application/octet-stream",
      });
    } catch {
      setFileError(
        lang === "ru" ? "Ошибка чтения файла" : "Faylni o'qishda xatolik"
      );
    } finally {
      setUploading(false);
    }
  };

  /* 1. Request SMS OTP via Provider */
  const handleRequestSms = async () => {
    if (cleanCardDigits.length !== 16) {
      setCardError(
        lang === "ru"
          ? "Введите корректный 16-значный номер карты"
          : "16 xonali to'liq karta raqamini kiriting"
      );
      return;
    }
    if (cardExpiry.length !== 5) {
      setCardError(
        lang === "ru"
          ? "Введите срок действия карты (ММ/ГГ)"
          : "Karta amal qilish muddatini kiriting (OO/YY)"
      );
      return;
    }

    setSendingSms(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setCardStep("sms");
      setSmsTimer(60);
      setSmsCode("");
      setSmsError("");
      toast(
        lang === "ru"
          ? "SMS-код подтверждения отправлен на ваш телефон"
          : "SMS tasdiqlash kodi telefoningizga yuborildi",
        "success"
      );
    } finally {
      setSendingSms(false);
    }
  };

  const handleResendSms = async () => {
    setSendingSms(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setSmsTimer(60);
      setSmsError("");
      toast(
        lang === "ru" ? "Новый SMS-код отправлен" : "Yangi SMS kod yuborildi",
        "success"
      );
    } finally {
      setSendingSms(false);
    }
  };

  /* 2. Verify SMS Code and Complete Payment */
  const handleVerifySmsAndPay = async () => {
    if (smsCode.trim().length !== 6) {
      setSmsError(
        lang === "ru"
          ? "Введите 6-значный SMS-код из сообщения"
          : "6 xonali SMS kodni to'liq kiriting"
      );
      return;
    }

    setSubmitting(true);
    try {
      await paymentsService.fundContract(contract.id, {
        method: "karta",
      });
      toast(
        lang === "ru"
          ? "Оплата успешно подтверждена! Средства заблокированы в Эскроу, shartnoma faollashdi."
          : "To'lov muvaffaqiyatli tasdiqlandi! Mablag' Escrow hisobida kafolatlandi va shartnoma faollashdi.",
        "success"
      );
      onSuccess();
      onClose();
    } catch {
      toast(
        lang === "ru" ? "Ошибка подтверждения оплаты" : "To'lovni tasdiqlashda xatolik yuz berdi",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* 2. Manual Bank Transfer Submission */
  const handleBankSubmit = async () => {
    if (!receiptFile) {
      setFileError(
        lang === "ru"
          ? "Пожалуйста, прикрепите квитанцию или чек"
          : "Iltimos, to'lov kvitansiyasi yoki chekini biriktiring"
      );
      return;
    }

    setSubmitting(true);
    try {
      await paymentsService.fundContract(contract.id, {
        method: "b2b",
        receiptUrl: receiptFile.url,
        receiptName: receiptFile.name,
        receiptSize: receiptFile.size,
        notes: notes.trim() || undefined,
      });

      toast(
        lang === "ru"
          ? "Квитанция отправлена на проверку! Администратор проверит поступление средств."
          : "To'lov kvitansiyasi tekshiruvga yuborildi! Ma'muriyat bank tushumini tekshiradi.",
        "success"
      );
      onSuccess();
      onClose();
    } catch {
      toast(
        lang === "ru" ? "Ошибка отправки" : "Yuborishda xatolik yuz berdi",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requisites = [
    {
      label:
        lang === "ru"
          ? "Получатель (Компания)"
          : "Qabul qiluvchi (Kompaniya)",
      value: COMPANY_BANK_DETAILS.companyName,
      key: "company",
    },
    {
      label: lang === "ru" ? "Банк получателя" : "Bank nomi",
      value: COMPANY_BANK_DETAILS.bankName,
      key: "bank",
    },
    {
      label:
        lang === "ru"
          ? "Расчётный счёт (20 цифр)"
          : "Hisob raqami (20 xonali)",
      value: COMPANY_BANK_DETAILS.accountNumber,
      key: "account",
      mono: true,
    },
    {
      label: lang === "ru" ? "МФО банка" : "MFO (Bank kodi)",
      value: COMPANY_BANK_DETAILS.mfo,
      key: "mfo",
      mono: true,
    },
    {
      label: lang === "ru" ? "ИНН компании" : "INN (STIR)",
      value: COMPANY_BANK_DETAILS.inn,
      key: "inn",
      mono: true,
    },
    {
      label: lang === "ru" ? "SWIFT код" : "SWIFT kodi",
      value: COMPANY_BANK_DETAILS.swift,
      key: "swift",
      mono: true,
    },
    {
      label: lang === "ru" ? "Сумма платежа" : "To'lov summasi",
      value: formatMoney(contract.totalAmount, lang),
      key: "amount",
      highlight: true,
    },
    {
      label:
        lang === "ru"
          ? "Код заказа / Назначение платежа"
          : "Order ID / To'lov maqsadi",
      value: paymentPurpose,
      key: "purpose",
      highlight: true,
    },
  ];

  return (
    <>
      <Modal
        open={open}
      onClose={onClose}
      title={
        lang === "ru"
          ? "Оплата контракта и Escrow защита"
          : "Shartnomani to'lash va Escrow himoyasi"
      }
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>

          {activeTab === "card" ? (
            cardStep === "input" ? (
              <Button
                variant="primary"
                loading={sendingSms}
                onClick={handleRequestSms}
                className="font-bold gap-2"
              >
                <span>📱</span>
                <span>
                  {lang === "ru"
                    ? "Получить SMS-код и перейти к оплате"
                    : "SMS kod olish va to'lovga o'tish"}
                </span>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setCardStep("input")}
                  disabled={submitting}
                >
                  {lang === "ru" ? "Назад (к карте)" : "Orqaga (Karta)"}
                </Button>
                <Button
                  variant="primary"
                  loading={submitting}
                  onClick={handleVerifySmsAndPay}
                  className="font-bold gap-2"
                >
                  <span>🔒</span>
                  <span>
                    {formatMoney(contract.totalAmount, lang)} —{" "}
                    {lang === "ru"
                      ? "Подтвердить и оплатить"
                      : "Tasdiqlash va to'lash"}
                  </span>
                </Button>
              </div>
            )
          ) : (
            <Button
              variant="primary"
              loading={submitting}
              disabled={
                uploading ||
                (!receiptFile &&
                  contract.paymentStatus === "pending_verification")
              }
              onClick={handleBankSubmit}
              className="font-bold"
            >
              {receiptFile
                ? lang === "ru"
                  ? "Отправить чек на проверку"
                  : "To'lov chekini tekshiruvga yuborish"
                : lang === "ru"
                  ? "Прикрепите квитанцию"
                  : "Kvitansiyani yuklang"}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-ink">
        {/* Top Channel Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface/80 p-1.5 border border-line">
          <button
            type="button"
            onClick={() => setActiveTab("card")}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-3 px-2 text-center transition-all cursor-pointer ${
              activeTab === "card"
                ? "bg-card text-primary font-bold shadow-xs border border-primary/30"
                : "text-muted hover:text-ink hover:bg-card/50"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-base">🇺🇿</span>
              <span className="text-xs sm:text-sm font-extrabold">
                {lang === "ru"
                  ? "Карты Узбекистана"
                  : "O'zbekiston kartalari"}
              </span>
            </div>
            <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {lang === "ru"
                ? "Uzcard / Humo • Мгновенно"
                : "Uzcard / Humo • Bir zumda avtomat"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bank")}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-3 px-2 text-center transition-all cursor-pointer ${
              activeTab === "bank"
                ? "bg-card text-primary font-bold shadow-xs border border-primary/30"
                : "text-muted hover:text-ink hover:bg-card/50"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-base">🌍</span>
              <span className="text-xs sm:text-sm font-extrabold">
                {lang === "ru"
                  ? "Банковский перевод / СНГ"
                  : "Bank o'tkazmasi / Xorij"}
              </span>
            </div>
            <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
              {lang === "ru"
                ? "По реквизитам • Проверка"
                : "Rekvizit bo'yicha • Tekshiruv"}
            </span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: O'ZBEKISTON MILLIY KARTALARI (TEZKOR & AVTOMATIK)   */}
        {/* ========================================================= */}
        {activeTab === "card" && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Escrow banner */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs flex items-start gap-2.5">
              <span className="text-base leading-none">🔒</span>
              <div className="flex-1 text-2xs leading-relaxed text-muted">
                <strong className="text-ink block mb-0.5 font-bold">
                  {lang === "ru"
                    ? "Безопасная Escrow защита Bobo&Doda"
                    : "Bobo&Doda xavfsiz Escrow kafolati"}
                </strong>
                {lang === "ru"
                  ? "Средства списываются с вашей карты и блокируются на защищённом эскроу-счёте. Исполнитель получит оплату только после того, как вы примете выполненную работу. Контракт активируется сразу же!"
                  : "Mablag' kartangizdan yechilib, xavfsiz Escrow hisobida muzlatiladi. Mutaxassis pulni faqat siz ishni to'liq qabul qilganingizdan so'ng oladi. Shartnoma bir zumda faollashadi!"}
              </div>
            </div>

            {/* Total summary */}
            <div className="rounded-xl border border-line bg-card p-3.5 flex items-center justify-between">
              <div>
                <span className="text-3xs font-bold uppercase tracking-wider text-muted block">
                  {lang === "ru" ? "Сумма к оплате:" : "To'lov summasi:"}
                </span>
                <span className="font-heading text-lg font-black text-ink">
                  {formatMoney(contract.totalAmount, lang)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-1 rounded-md text-3xs font-extrabold border ${
                    isUzcard
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-muted border-line"
                  }`}
                >
                  UZCARD
                </span>
                <span
                  className={`px-2 py-1 rounded-md text-3xs font-extrabold border ${
                    isHumo
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-surface text-muted border-line"
                  }`}
                >
                  HUMO
                </span>
              </div>
            </div>

            {/* Step 1: Card Inputs Form */}
            {cardStep === "input" ? (
              <div className="rounded-xl border border-line bg-card p-4 flex flex-col gap-3">
                <div>
                  <label className="block text-2xs font-bold text-ink uppercase tracking-wider mb-1">
                    {lang === "ru" ? "Номер карты (Uzcard / Humo)" : "Karta raqami (Uzcard / Humo)"}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="8600 •••• •••• •••• yoki 9860 ••••"
                      value={cardNumber}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      className="w-full h-10 rounded-xl border border-line bg-surface/50 px-3 font-mono text-sm font-bold text-ink tracking-wider outline-none focus:border-primary focus:bg-card transition"
                    />
                    {(isUzcard || isHumo) && (
                      <span className="absolute right-3 top-2.5 text-2xs font-black uppercase text-primary">
                        {isUzcard ? "✓ Uzcard" : "✓ Humo"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-ink uppercase tracking-wider mb-1">
                      {lang === "ru" ? "Срок действия" : "Amal qilish muddati"}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => handleCardExpiryChange(e.target.value)}
                      className="w-full h-10 rounded-xl border border-line bg-surface/50 px-3 font-mono text-xs font-bold text-ink outline-none focus:border-primary focus:bg-card transition"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-ink uppercase tracking-wider mb-1">
                      {lang === "ru" ? "Имя владельца" : "Karta egasi"}
                    </label>
                    <input
                      type="text"
                      placeholder="DILSHOD RAHIMOV"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      className="w-full h-10 rounded-xl border border-line bg-surface/50 px-3 font-mono text-xs font-bold text-ink uppercase outline-none focus:border-primary focus:bg-card transition"
                    />
                  </div>
                </div>

                {cardError && (
                  <p className="text-xs text-danger font-medium">{cardError}</p>
                )}
              </div>
            ) : (
              /* Step 2: SMS Verification Code */
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-4 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg shrink-0 font-bold">
                    💬
                  </div>
                  <div>
                    <h4 className="text-sm font-heading font-black text-ink">
                      {lang === "ru" ? "Подтверждение SMS-кодом" : "SMS orqali tasdiqlash"}
                    </h4>
                    <p className="text-2xs text-muted mt-0.5 leading-relaxed">
                      {lang === "ru"
                        ? `На номер телефона, привязанный к карте ${cardNumber.slice(0, 4)} •••• ${cardNumber.slice(-4)}, отправлен 6-значный код подтверждения.`
                        : `Karta raqamiga (${cardNumber.slice(0, 4)} •••• ${cardNumber.slice(-4)}) ulangan telefon raqamiga 6 xonali tasdiqlash kodi yuborildi.`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 pt-2">
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    {lang === "ru" ? "Введите 6-значный код:" : "6 xonali tasdiqlash kodini kiriting:"}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    placeholder="••••••"
                    value={smsCode}
                    onChange={(e) => {
                      setSmsError("");
                      setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    }}
                    className="w-48 h-12 text-center text-xl font-mono font-black tracking-[0.4em] rounded-xl border-2 border-primary/50 bg-card text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition"
                  />
                  {smsError && (
                    <p className="text-xs text-danger font-medium mt-1">{smsError}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-primary/10 flex items-center justify-between text-2xs flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-muted">
                    {smsTimer > 0 ? (
                      <span>
                        {lang === "ru"
                          ? `Повторная отправка через ${smsTimer} сек.`
                          : `Qayta yuborish: ${smsTimer} soniya`}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendSms}
                        disabled={sendingSms}
                        className="text-primary font-bold hover:underline cursor-pointer"
                      >
                        {sendingSms
                          ? lang === "ru"
                            ? "Отправка..."
                            : "Yuborilmoqda..."
                          : lang === "ru"
                          ? "Отправить код повторно"
                          : "Kodni qayta yuborish"}
                      </button>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: BANK O'TKAZMASI / XORIJ (KVITANSIYA BILAN TEKSHIRISH) */}
        {/* ========================================================= */}
        {activeTab === "bank" && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Status notice */}
            {contract.paymentStatus === "pending_verification" ||
            contract.b2bPending ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                <span className="text-base leading-none">⏳</span>
                <div>
                  <strong className="block font-bold">
                    {lang === "ru"
                      ? "Квитанция на проверке администратором"
                      : "Kvitansiya tekshirilmoqda"}
                  </strong>
                  <p className="mt-0.5 text-2xs leading-relaxed opacity-90">
                    {lang === "ru"
                      ? "Квитанция уже отправлена. Администратор сверяет поступление средств на банковский счёт."
                      : "Bank to'lov topshirig'ingiz qabul qilindi. Operator bank tushumini tasdiqlashi bilan shartnoma faollashadi."}
                  </p>
                </div>
              </div>
            ) : contract.paymentStatus === "payment_rejected" ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs flex items-start gap-2.5 text-rose-900 dark:text-rose-200">
                <span className="text-base leading-none">❌</span>
                <div>
                  <strong className="block font-bold">
                    {lang === "ru"
                      ? "Предыдущий платёж был отклонён"
                      : "Oldingi to'lov rad etilgan"}
                  </strong>
                  <p className="mt-0.5 text-2xs leading-relaxed">
                    {contract.paymentRejectReason ||
                      (lang === "ru"
                        ? "Средства не поступили на банковский счёт."
                        : "Bank hisobimizga mablag' kelib tushmagan.")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-surface/60 p-3 text-xs flex items-start gap-2.5 text-muted">
                <span className="text-base leading-none">ℹ️</span>
                <p className="text-2xs leading-relaxed">
                  {lang === "ru"
                    ? "Для клиентов из ближнего зарубежья и международных переводов: переведите сумму по реквизитам нашего банка и загрузите квитанцию. Оператор проверит поступление средств и активирует проект."
                    : "Xorijdan yoki qo'shni davlatlardan to'lov qilayotgan bo'lsangiz: rasmiy bank hisobimizga mablag'ni o'tkazing va chekni yuklang. Operator bank tushumini tekshirib shartnomani faollashtiradi."}
                </p>
              </div>
            )}

            {/* B2B Invoice Banner */}
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/20">
              <div className="text-2xs text-muted">
                <strong className="text-ink block text-xs font-bold">
                  {lang === "ru" ? "Счет на оплату для бухгалтерии" : "Buxgalteriya uchun to'lov hisobi"}
                </strong>
                <span>
                  {lang === "ru"
                    ? "Скачайте официальный счет (B2B Invoice) с реквизитами и печатью"
                    : "Rasmiy hisob-faktura (B2B Invoice)ni yuklab oling yoki chop eting"}
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setInvoiceModalOpen(true)}
                className="shrink-0 gap-1.5 font-bold shadow-2xs"
              >
                📄 {lang === "ru" ? "Счет / Invoice" : "Hisob-faktura"}
              </Button>
            </div>

            {/* Requisites Table with 1-Click Copy */}
            <div className="rounded-xl border border-line bg-card overflow-hidden">
              <div className="bg-surface px-4 py-2 border-b border-line flex items-center justify-between">
                <span className="font-bold text-3xs uppercase tracking-wider text-muted">
                  {lang === "ru"
                    ? "Банковские реквизиты компании"
                    : "Kompaniyaning rasmiy bank rekvizitlari"}
                </span>
                <span className="text-3xs text-muted">
                  {lang === "ru"
                    ? "Нажмите для копирования"
                    : "Nusxa olish uchun bosing"}
                </span>
              </div>

              <div className="divide-y divide-line/60">
                {requisites.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2.5 gap-2 hover:bg-surface/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-3xs font-medium text-muted uppercase tracking-wider">
                        {item.label}
                      </p>
                      <p
                        className={`mt-0.5 text-xs font-semibold text-ink break-words ${
                          item.mono ? "font-mono" : ""
                        } ${
                          item.highlight ? "text-primary text-sm font-bold" : ""
                        }`}
                      >
                        {item.value}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.value, item.key)}
                      className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        copiedField === item.key
                          ? "bg-success/15 border-success text-success"
                          : "bg-surface hover:bg-card-hover border-line text-muted hover:text-ink"
                      }`}
                      title={lang === "ru" ? "Скопировать" : "Nusxa olish"}
                    >
                      {copiedField === item.key ? (
                        <>
                          <span>✓</span>
                          <span>
                            {lang === "ru" ? "Скопировано" : "Nusxalandi"}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>📋</span>
                          <span>{lang === "ru" ? "Копировать" : "Nusxa"}</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Receipt Section */}
            <div className="rounded-xl border border-line bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <span>📎</span>
                  <span>
                    {lang === "ru"
                      ? "Загрузка квитанции / чека об оплате"
                      : "To'lov kvitansiyasi yoki chekini yuklash"}
                  </span>
                  <span className="text-danger">*</span>
                </label>
                <span className="text-3xs text-muted">PNG, JPG, PDF (max 15MB)</span>
              </div>

              {receiptFile ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl">📄</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">
                        {receiptFile.name}
                      </p>
                      <p className="text-2xs text-muted">
                        {formatFileSize(receiptFile.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiptFile(null)}
                    className="text-xs font-semibold text-danger hover:underline shrink-0 p-1 cursor-pointer"
                  >
                    {lang === "ru" ? "Удалить" : "O'chirish"}
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-line hover:border-primary rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-surface/30 hover:bg-surface/60 transition-all text-center">
                  <span className="text-2xl">📤</span>
                  <span className="text-xs font-semibold text-ink">
                    {uploading
                      ? lang === "ru"
                        ? "Загрузка файла..."
                        : "Fayl yuklanmoqda..."
                      : lang === "ru"
                        ? "Нажмите для выбора квитанции или перетащите файл"
                        : "Kvitansiyani tanlash uchun bosing yoki faylni bu yerga tashlang"}
                  </span>
                  <span className="text-3xs text-muted">
                    {lang === "ru"
                      ? "Поддерживаются скриншоты чеков, квитанции мобильных банков и платёжные поручения"
                      : "Chek skrinshotlari, mobil bank kvitansiyalari va to'lov topshiriqlari qabul qilinadi"}
                  </span>
                  <input
                    id="bank-receipt-input"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading || submitting}
                  />
                </label>
              )}

              {fileError && (
                <p className="text-xs text-danger font-medium">{fileError}</p>
              )}

              {/* Optional notes */}
              <div>
                <label className="block text-2xs font-semibold text-muted mb-1">
                  {lang === "ru"
                    ? "Номер транзакции или примечание (необязательно)"
                    : "Tranzaksiya raqami yoki qo'shimcha izoh (ixtiyoriy)"}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    lang === "ru"
                      ? "Например: Капиталбанк, перевод 14:30"
                      : "Masalan: Kapitalbank ilovasi orqali, 14:30 dagi o'tkazma"
                  }
                  className="w-full h-9 rounded-lg border border-line bg-surface/60 px-3 text-xs text-ink outline-none focus:border-primary focus:bg-card"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>

    <B2BInvoiceModal
      open={invoiceModalOpen}
      onClose={() => setInvoiceModalOpen(false)}
      contract={contract}
    />
  </>
  );
}

