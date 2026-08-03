"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chooseRole, getSession } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function RolTanlashPage() {
  const { t } = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  /* Roli tasdiqlangan foydalanuvchi bu yerga adashib kelsa — o'z kabinetiga.
     Aks holda boshqa kabinetga kirmoqchi bo'lib rolini almashtirib yuborishi mumkin. */
  useEffect(() => {
    const session = getSession();
    if (!session || !session.verified) return;
    if (session.role === "xaridor") router.replace("/xaridor");
    if (session.role === "mutaxassis" && session.profileDone)
      router.replace("/mutaxassis");
  }, [router]);

  async function handleSeller() {
    if (loading) return;
    setLoading(true);
    await chooseRole("mutaxassis");
    const session = getSession();
    router.push(session?.profileDone ? "/mutaxassis" : "/mutaxassis/royxat");
  }

  /* Xaridor uchun alohida profil bosqichi yo'q — to'g'ridan-to'g'ri tasdiqlashga */
  async function handleBuyer() {
    if (loading) return;
    setLoading(true);
    await chooseRole("xaridor");
    const session = getSession();
    router.push(session?.verified ? "/xaridor" : "/kirish/tasdiqlash");
  }

  return (
    <div>
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
          <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-primary/15 text-primary" aria-hidden="true">
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
          <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-accent/15 text-accent" aria-hidden="true">
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
