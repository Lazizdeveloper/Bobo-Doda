"use client";

import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** so'rov ketayotganda: tugmalar bloklanadi, modal yopilmaydi */
  loading?: boolean;
  /** buzg'unchi amal uchun "danger" */
  variant?: "primary" | "danger";
}

/* Modal ustidagi standart tasdiq dialogi — barcha buzg'unchi/muhim amallar
   uchun bir xil UX (loading + disabled holatlari bilan). Buni takror-takror
   qo'lda Modal+footer yozish o'rniga ishlatiladi. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
  variant = "primary",
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onCancel}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description}
    </Modal>
  );
}
