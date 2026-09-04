"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { authService, supportRequestService, usersService } from "@/lib/api";
import type { SupportRequestCategory, User } from "@/lib/types";
import { useT } from "@/lib/i18n";

const CATEGORY_KEYS: SupportRequestCategory[] = [
  "tolov_escrow",
  "loyiha",
  "mutaxassis",
  "profil",
  "tasdiqlash",
  "texnik",
  "hisob",
  "boshqa",
];

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

type Phase = "form" | "submitting" | "success" | "error";

export interface SupportModalProps {
  open: boolean;
  onClose: () => void;
  source: string;
  route?: string;
}

export function SupportModal({ open, onClose, source, route }: SupportModalProps) {
  const { t } = useT();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("form");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);

  const [category, setCategory] = useState<SupportRequestCategory | "">("");
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");

  const [categoryError, setCategoryError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [guestNameError, setGuestNameError] = useState("");
  const [guestContactError, setGuestContactError] = useState("");

  /* Har ochilishda: sessiyani tekshir, login bo'lsa profil ma'lumotini
     avtomatik oldindan yukla — foydalanuvchidan qayta so'ralmasin. */
  useEffect(() => {
    if (!open) return;
    setPhase("form");
    setCategory("");
    setMessage("");
    setGuestName("");
    setGuestContact("");
    setCategoryError("");
    setMessageError("");
    setGuestNameError("");
    setGuestContactError("");
    setCheckedSession(false);

    const session = authService.getSession();
    if (!session) {
      setCurrentUser(null);
      setCheckedSession(true);
      return;
    }
    let cancelled = false;
    usersService
      .getCurrent()
      .then((user) => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null);
      })
      .finally(() => {
        if (!cancelled) setCheckedSession(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function validate(): boolean {
    let ok = true;
    if (!category) {
      setCategoryError(t("support.err_category"));
      ok = false;
    }
    const trimmed = message.trim();
    if (trimmed.length < MESSAGE_MIN) {
      setMessageError(t("support.err_message_min"));
      ok = false;
    } else if (trimmed.length > MESSAGE_MAX) {
      setMessageError(t("support.err_message_max"));
      ok = false;
    }
    if (!currentUser) {
      if (!guestName.trim()) {
        setGuestNameError(t("support.err_name"));
        ok = false;
      }
      if (!guestContact.trim()) {
        setGuestContactError(t("support.err_contact"));
        ok = false;
      }
    }
    return ok;
  }

  async function submit() {
    setCategoryError("");
    setMessageError("");
    setGuestNameError("");
    setGuestContactError("");
    if (!validate() || !category) return;

    setPhase("submitting");
    try {
      await supportRequestService.submit({
        category,
        message: message.trim(),
        contactName: currentUser?.fullName || guestName.trim(),
        contactInfo: currentUser?.phone || guestContact.trim(),
        userId: currentUser?.id,
        source,
        route: route ?? pathname ?? "-",
      });
      setPhase("success");
    } catch {
      setPhase("error");
    }
  }

  function handleClose() {
    onClose();
  }

  const categoryOptions = CATEGORY_KEYS.map((key) => ({
    value: key,
    label: t(`support.cat_${key}`),
  }));

  const footer =
    phase === "form" || phase === "submitting" ? (
      <Button loading={phase === "submitting"} onClick={submit}>
        {t("support.submit")} <span aria-hidden="true">→</span>
      </Button>
    ) : phase === "success" ? (
      <Button onClick={handleClose}>{t("support.close")}</Button>
    ) : (
      <>
        <Button variant="secondary" onClick={handleClose}>
          {t("support.close")}
        </Button>
        <Button onClick={() => setPhase("form")}>{t("support.retry")}</Button>
      </>
    );

  return (
    <Modal open={open} onClose={handleClose} title={t("support.title")} footer={footer}>
      {phase === "success" && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="font-heading text-base font-bold text-ink">{t("support.success_title")}</p>
          <p className="text-sm text-muted">{t("support.success_body")}</p>
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </span>
          <p className="font-heading text-base font-bold text-ink">{t("support.error_title")}</p>
          <p className="text-sm text-muted">{t("support.error_body")}</p>
          {/* Zaxira yo'l: server sozlanmagan bo'lsa (TELEGRAM_* env yo'q)
              har bir so'rov yiqiladi — foydalanuvchi boshi berk ko'chada
              qolmasligi uchun muqobil aloqa aytiladi. */}
          <p className="text-2xs text-faint">{t("support.error_fallback")}</p>
        </div>
      )}

      {(phase === "form" || phase === "submitting") && (
        <div className="flex flex-col gap-4">
          {currentUser ? (
            <div className="rounded-input border border-line bg-surface px-3 py-2 text-xs text-muted">
              {t("support.sending_as")}{" "}
              <span className="font-medium text-ink">{currentUser.fullName}</span>
            </div>
          ) : checkedSession ? (
            <>
              <Input
                label={t("support.name_label")}
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  setGuestNameError("");
                }}
                error={guestNameError}
                maxLength={100}
                disabled={phase === "submitting"}
              />
              <Input
                label={t("support.contact_label")}
                placeholder={t("support.contact_placeholder")}
                value={guestContact}
                onChange={(e) => {
                  setGuestContact(e.target.value);
                  setGuestContactError("");
                }}
                error={guestContactError}
                maxLength={100}
                disabled={phase === "submitting"}
              />
            </>
          ) : null}

          <Select
            label={t("support.category_label")}
            placeholder={t("support.category_placeholder")}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as SupportRequestCategory);
              setCategoryError("");
            }}
            options={categoryOptions}
            error={categoryError}
            disabled={phase === "submitting"}
          />

          <Textarea
            label={t("support.message_label")}
            placeholder={t("support.message_placeholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            error={messageError}
            hint={!messageError ? `${message.trim().length}/${MESSAGE_MAX}` : undefined}
            rows={5}
            maxLength={MESSAGE_MAX}
            disabled={phase === "submitting"}
          />
        </div>
      )}
    </Modal>
  );
}
