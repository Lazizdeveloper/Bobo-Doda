"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { staffChangePassword } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";

/**
 * Bosqich 17, bo'lim 91-J — `mustChangePassword` qattiq darvoza.
 * Backend `StaffPermissionGuard` bu holatda FAQAT oq ro'yxatdagi
 * endpoint'larni (shu jumladan shu sahifaning o'zi) ochiq qoldiradi —
 * boshqa HAR QANDAY amal `PASSWORD_CHANGE_REQUIRED` bilan rad etiladi.
 */
export default function StaffChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 12) {
      setError("Yangi parol kamida 12 belgidan iborat bo'lishi kerak.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Parollar mos kelmadi.");
      return;
    }
    setBusy(true);
    try {
      await staffChangePassword(currentPassword, newPassword);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof ApiError && err.code === "UNAUTHENTICATED" ? "Joriy parol noto'g'ri." : "Xatolik yuz berdi.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <Card padding="lg" stitch>
          <h1 className="font-heading text-xl font-extrabold text-ink">Parolni almashtirish talab qilinadi</h1>
          <p className="mt-2 text-sm text-muted">
            Hisobingiz vaqtinchalik parol bilan yaratilgan. Davom etishdan oldin yangi parol o'rnating.
          </p>
          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <Input
              label="Joriy parol"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="Yangi parol"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={12}
              required
            />
            <Input
              label="Yangi parolni tasdiqlang"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={12}
              required
            />
            {error && (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            )}
            <Button type="submit" loading={busy}>
              Parolni saqlash
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
