"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { useToast } from "@/components/ui/Toast";
import { authService } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function RolTanlashPage() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  /* Landing'dan "?role=..." bilan kelinganda rolni avtomatik tanlaymiz —
     foydalanuvchi allaqachon "Mutaxassis sifatida boshlash" tugmasini
     bosgan, undan yana bir marta so'rash ortiqcha qadam. */
  const autoRoleRef = useRef(false);

  /* Tasdiqlangan va rol tanlagan foydalanuvchilar o'z kabinetiga qaytariladi */
  useEffect(() => {
    const session = authService.getSession();
    /* Sessiyasiz bu sahifada turib bo'lmaydi: `chooseRole` NO_SESSION bilan
       yiqilar va sahifa qotib qolardi. Kirishga qaytaramiz. */
    if (!session) {
      if (pathname !== "/kirish") router.replace("/kirish");
      return;
    }
    if (!session.verified) return;

    let dest = null;
    if (session.role === "xaridor") dest = "/xaridor";
    else if (session.role === "mutaxassis" && session.profileDone) dest = "/mutaxassis";
    
    if (dest && pathname !== dest) {
      router.replace(dest);
    }
  }, [router, pathname]);

  /* Xato bo'lsa tugmalar qayta ochilishi SHART — aks holda foydalanuvchi
     hech qanday izohsiz, bloklangan sahifada qolib ketadi. */
  async function chooseRole(role: "mutaxassis" | "xaridor") {
    if (loading) return;
    setLoading(true);
    try {
      await authService.chooseRole(role);
      const session = authService.getSession();
      if (role === "mutaxassis") {
        router.push(session?.profileDone ? "/mutaxassis" : "/mutaxassis/royxat");
      } else {
        /* Xaridor uchun alohida profil bosqichi yo'q — to'g'ridan-to'g'ri tasdiqlashga */
        router.push(session?.verified ? "/xaridor" : "/kirish/tasdiqlash");
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "NO_SESSION" || code === "UNAUTHENTICATED") {
        router.replace("/kirish");
        return;
      }
      toast(t("common.error"), "error");
      setLoading(false);
    }
  }

  const handleSeller = () => chooseRole("mutaxassis");
  const handleBuyer = () => chooseRole("xaridor");

  /* Landing CTA'sidan kelgan rolni bir marta avtomatik qo'llaymiz.
     `useSearchParams` o'rniga `window` — bu sahifa statik prerender bo'lib
     qolsin (aks holda Suspense chegarasi talab qilinadi). */
  useEffect(() => {
    if (autoRoleRef.current) return;
    const session = authService.getSession();
    if (!session || session.role) return;
    const wanted = new URLSearchParams(window.location.search).get("role");
    if (wanted !== "mutaxassis" && wanted !== "xaridor") return;
    autoRoleRef.current = true;
    void chooseRole(wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-4">
        <BackButton href="/kirish" label={t("auth.backToLogin")} />
      </div>
      <h1 className="text-center font-heading text-xl font-bold text-ink">
        {t("auth.roleTitle")}
      </h1>
      <p className="mt-2 text-center text-sm text-muted">
        {t("auth.roleSubtitle")}
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <button
          type="button"
          onClick={handleSeller}
          disabled={loading}
          className="flex flex-col items-start gap-2 rounded-card border border-line bg-card p-6 text-left transition-colors duration-150 hover:border-primary hover:bg-card-hover disabled:opacity-60"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-primary/10 text-primary-deep" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M11.5 3.2 8 11h3l-2.5 5.8L15 9h-3l2.5-5.8h-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-heading text-lg font-bold text-ink">
            {t("auth.roleSeller")}
          </span>
          <span className="text-sm text-muted">{t("auth.roleSellerDesc")}</span>
        </button>

        <button
          type="button"
          onClick={handleBuyer}
          disabled={loading}
          className="flex flex-col items-start gap-2 rounded-card border border-line bg-card p-6 text-left transition-colors duration-150 hover:border-primary hover:bg-card-hover disabled:opacity-60"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-accent/10 text-accent-deep" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 4h2l1.6 9h8.8L17 6H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8" cy="16" r="1" fill="currentColor" />
              <circle cx="14" cy="16" r="1" fill="currentColor" />
            </svg>
          </span>
          <span className="font-heading text-lg font-bold text-ink">
            {t("auth.roleBuyer")}
          </span>
          <span className="text-sm text-muted">{t("auth.roleBuyerDesc")}</span>
        </button>
      </div>
    </div>
  );
}
