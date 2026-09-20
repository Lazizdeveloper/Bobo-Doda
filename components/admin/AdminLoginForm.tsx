"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { adminLogin, getCurrentAdmin } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";
import type { AdminRole } from "@/lib/admin-types";

export function AdminLoginForm({
  role,
  homeHref,
  title,
  description,
}: {
  role: AdminRole;
  homeHref: string;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  /* Real backend 2FA yoqilgan hisoblarda `MFA_REQUIRED` bilan javob beradi
     — shundan keyingina TOTP maydoni ko'rsatiladi (bo'lim 91-J). */
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = getCurrentAdmin();
    if (current && (role !== "super_admin" || current.role === "super_admin")) {
      router.replace("/admin");
      return;
    }
    setReady(true);
  }, [role, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const account = await adminLogin(email, password, needsTotp ? totpCode : undefined, role);
      if (account.mustChangePassword) {
        router.replace("/admin/parolni-almashtirish");
        return;
      }
      router.replace("/admin");
    } catch (err) {
      if (err instanceof ApiError && err.message === "MFA_REQUIRED") {
        setNeedsTotp(true);
        setBusy(false);
        return;
      }
      setError("Kirish ma’lumotlari noto‘g‘ri yoki bu portal uchun vakolat mavjud emas.");
      setBusy(false);
    }
  }

  if (!ready) return <main className="min-h-screen bg-surface" aria-busy="true" />;

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo href={homeHref} />
        </div>
        <Card padding="lg" stitch>
          <span className="rounded-full bg-danger/10 px-2.5 py-1 text-2xs font-bold uppercase tracking-wide text-danger-deep">
            Restricted access
          </span>
          <h1 className="mt-3 font-heading text-2xl font-extrabold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-muted">{description}</p>
          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            {!needsTotp ? (
              <>
                <Input
                  label="Korporativ email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <Input
                  label="Parol"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </>
            ) : (
              <>
                <p className="text-xs text-muted">Autentifikator ilovasidagi 6 xonali kodni kiriting.</p>
                <Input
                  label="TOTP kod"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoFocus
                  required
                />
              </>
            )}
            {error && <p role="alert" className="text-xs text-danger">{error}</p>}
            <Button type="submit" loading={busy}>
              {needsTotp ? "Tasdiqlash" : "Xavfsiz kirish"}
            </Button>
            {needsTotp && (
              <button
                type="button"
                onClick={() => {
                  setNeedsTotp(false);
                  setTotpCode("");
                  setError("");
                }}
                className="text-xs text-muted hover:text-ink"
              >
                ← Orqaga
              </button>
            )}
          </form>
        </Card>
      </div>
    </main>
  );
}
