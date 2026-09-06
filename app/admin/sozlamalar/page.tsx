"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { getAdminData, updatePlatformSetting } from "@/lib/api/admin";
import { adminErrorText } from "@/lib/admin-error-text";
import type { PlatformSettingItem } from "@/lib/admin-types";

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettingItem[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  function load() {
    setLoadError(null);
    /* Xato bo'sh ro'yxatga aylantirilmaydi */
    getAdminData()
      .then((d) => setSettings(d.settings))
      .catch(setLoadError);
  }

  useEffect(() => {
    load();
  }, []);

  /* `catch` SHART: `updatePlatformSetting` super admin bo'lmasa `FORBIDDEN`
     tashlaydi. Ilgari faqat `finally` bor edi — oddiy admin saqlashga
     urinsa ekranda na muvaffaqiyat, na xato ko'rinardi. */
  async function handleSave(key: string, value: string | number | boolean) {
    setSavingKey(key);
    setSaveError("");
    setSuccessMsg("");
    try {
      await updatePlatformSetting(key, value);
      load();
      setSuccessMsg("Sozlama saqlandi va darhol kuchga kirdi.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setSaveError(
        /* "FORBIDDEN" bu ekranda aniqroq aytiladi: sozlamalarni faqat
           super admin o'zgartira oladi. */
        err instanceof Error && err.message === "FORBIDDEN"
          ? "Platforma sozlamalarini faqat Super Admin o'zgartira oladi."
          : adminErrorText(err)
      );
      /* Kiritilgan qiymat qabul qilinmadi — ekran haqiqiy holatga qaytadi */
      load();
    } finally {
      setSavingKey(null);
    }
  }

  if (loadError) {
    return (
      <div className="space-y-6">
      <AdminPageHeader
        title="Platforma Operatsion Sozlamalari & Qoidalari"
        description="Bozor komissiya stavkalari, to‘lovlar reglamenti, escrow vaqt chegaralari va arbitraj qoidalari."
      />
        <ErrorState error={loadError} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Platforma Operatsion Sozlamalari & Qoidalari"
        description="Bozor komissiya stavkalari, to‘lovlar reglamenti, escrow vaqt chegaralari va arbitraj qoidalari."
      />

      {saveError && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger-deep">
          {saveError}
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success-deep font-semibold animate-in fade-in duration-150">
          ✓ {successMsg}
        </div>
      )}

      {/* Settings Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((setting) => (
          <Card key={setting.key} padding="lg" className="min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-sm font-bold text-ink">{setting.label}</h3>
                <p className="text-2xs text-muted font-mono break-all">{setting.key}</p>
              </div>
              <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 text-3xs font-bold uppercase tracking-wider text-muted border border-line">
                {setting.type}
              </span>
            </div>

            <p className="text-xs text-ink/80 leading-relaxed">{setting.description}</p>

            <div className="pt-2 border-t border-line/60 flex items-center gap-3">
              {setting.readOnly ? (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="font-heading text-sm font-bold text-ink">
                    {String(setting.value)}
                    {setting.type === "percent" && "%"}
                  </span>
                  <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-3xs font-bold uppercase tracking-wider text-muted">
                    {"Faqat o'qish"}
                  </span>
                </div>
              ) : setting.type === "boolean" ? (
                <div className="flex items-center gap-2">
                  {/* Haqiqiy "switch": ilgari bu tugmaning ichida faqat
                      bezak `span` bor edi — skrinrider uni nomsiz tugma
                      sifatida o'qirdi va holati (yoqilgan/o'chirilgan)
                      umuman e'lon qilinmasdi. Bular esa kill-switch'lar
                      (ro'yxatdan o'tish, to'lovlar). */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(setting.value)}
                    aria-label={setting.label}
                    onClick={() => handleSave(setting.key, !setting.value)}
                    disabled={savingKey === setting.key}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                      setting.value ? "bg-primary" : "bg-line"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        setting.value ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-xs font-semibold text-ink">
                    {setting.value ? "Yoqilgan (Faol)" : "O‘chirilgan"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  {/* Ko'rinadigan sarlavha `<h3>` — u maydon bilan
                      bog'lanmagan, shuning uchun nom `aria-label` orqali
                      beriladi (WCAG 4.1.2). */}
                  <Input
                    type={setting.type === "number" ? "number" : "text"}
                    aria-label={setting.label}
                    defaultValue={String(setting.value)}
                    onBlur={(e) => {
                      const val = setting.type === "number" ? Number(e.target.value) : e.target.value;
                      if (val !== setting.value) {
                        handleSave(setting.key, val);
                      }
                    }}
                    className="text-xs"
                  />
                  {savingKey === setting.key && (
                    <span className="shrink-0 text-2xs text-muted">Saqlanmoqda…</span>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
