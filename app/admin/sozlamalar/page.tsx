"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getAdminData, updatePlatformSetting } from "@/lib/api/admin";
import type { PlatformSettingItem } from "@/lib/admin-types";

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettingItem[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  function load() {
    const data = getAdminData();
    setSettings(data.settings);
  }

  useEffect(() => {
    load();
  }, []);

  function handleSave(key: string, value: string | number | boolean) {
    setSavingKey(key);
    try {
      updatePlatformSetting(key, value);
      load();
      setSuccessMsg(`"${key}" sozlamasi muvaffaqiyatli saqlandi.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Platforma Operatsion Sozlamalari & Qoidalari"
        description="Bozor komissiya stavkalari, to‘lovlar reglamenti, escrow vaqt chegaralari va arbitraj qoidalari."
      />

      {successMsg && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success font-semibold animate-in fade-in duration-150">
          ✓ {successMsg}
        </div>
      )}

      {/* Settings Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((setting) => (
          <Card key={setting.key} padding="lg" className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-ink">{setting.label}</h3>
                <p className="text-2xs text-muted font-mono">{setting.key}</p>
              </div>
              <span className="rounded-md bg-surface px-2 py-0.5 text-3xs font-bold uppercase tracking-wider text-muted border border-line">
                {setting.type}
              </span>
            </div>

            <p className="text-xs text-ink/80 leading-relaxed">{setting.description}</p>

            <div className="pt-2 border-t border-line/60 flex items-center gap-3">
              {setting.type === "boolean" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave(setting.key, !setting.value)}
                    disabled={savingKey === setting.key}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
                  <Input
                    type={setting.type === "number" ? "number" : "text"}
                    defaultValue={String(setting.value)}
                    onBlur={(e) => {
                      const val = setting.type === "number" ? Number(e.target.value) : e.target.value;
                      if (val !== setting.value) {
                        handleSave(setting.key, val);
                      }
                    }}
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    loading={savingKey === setting.key}
                    onClick={() => {}}
                    className="text-xs shrink-0"
                  >
                    Saqlangan
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
