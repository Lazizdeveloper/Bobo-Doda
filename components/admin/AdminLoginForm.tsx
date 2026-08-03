"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { adminLogin } from "@/lib/api/admin";
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminLogin(email, password, role);
      router.replace("/admin");
    } catch {
      setError("Kirish ma’lumotlari noto‘g‘ri yoki bu portal uchun vakolat mavjud emas.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo href={homeHref} />
        </div>
        <Card padding="lg" stitch>
          <span className="rounded-full bg-danger/10 px-2.5 py-1 text-2xs font-bold uppercase tracking-wide text-danger">
            Restricted access
          </span>
          <h1 className="mt-3 font-heading text-2xl font-extrabold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-muted">{description}</p>
          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
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
            {error && <p role="alert" className="text-xs text-danger">{error}</p>}
            <Button type="submit" loading={busy}>Xavfsiz kirish</Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
