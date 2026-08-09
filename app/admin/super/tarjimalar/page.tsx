"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface Translation {
  key: string;
  uz: string;
  ru: string;
  en: string;
}

const mockTranslations: Translation[] = [
  { key: "common.save", uz: "Saqlash", ru: "Сохранить", en: "Save" },
  { key: "common.cancel", uz: "Bekor qilish", ru: "Отмена", en: "Cancel" },
  { key: "nav.dashboard", uz: "Boshqaruv", ru: "Панель", en: "Dashboard" },
];

export default function TranslationsPage() {
  const [translations, setTranslations] = useState<Translation[]>(mockTranslations);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Translation>>({});

  const columns: TableColumn<Translation>[] = [
    { key: "key", header: "Kalit", render: (row) => <span className="font-mono text-xs text-primary">{row.key}</span> },
    { key: "uz", header: "UZ", render: (row) => <span className="text-xs">{row.uz}</span> },
    { key: "ru", header: "RU", render: (row) => <span className="text-xs">{row.ru}</span> },
    { key: "en", header: "EN", render: (row) => <span className="text-xs">{row.en}</span> },
    {
      key: "actions",
      header: "Amallar",
      render: (row) => (
        <Button variant="secondary" size="sm" onClick={() => { setForm(row); setOpen(true); }}>Tahrirlash</Button>
      )
    },
  ];

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (translations.find(t => t.key === form.key)) {
      setTranslations(translations.map(t => t.key === form.key ? { ...t, ...form } as Translation : t));
    } else {
      setTranslations([...translations, form as Translation]);
    }
    setOpen(false);
    setForm({});
  }

  return (
    <>
      <AdminPageHeader
        title="Tarjimalar (Lokalizatsiya)"
        description="Platforma matnlarini 3 tilda boshqarish."
        action={<Button onClick={() => { setForm({}); setOpen(true); }}>Yangi tarjima qo'shish</Button>}
      />
      <Table
        columns={columns}
        rows={translations}
        rowKey={(row) => row.key}
        renderMobileCard={(row) => (
          <Card padding="none" className="border-0">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs text-primary">{row.key}</span>
              <p className="text-sm">UZ: {row.uz}</p>
              <Button size="sm" onClick={() => { setForm(row); setOpen(true); }} className="mt-2">Tahrirlash</Button>
            </div>
          </Card>
        )}
      />

      <Modal open={open} onClose={() => { setOpen(false); setForm({}); }} title={form.key && translations.find(t=>t.key===form.key) ? "Tarjimani tahrirlash" : "Yangi tarjima"}>
        <form onSubmit={save} className="flex flex-col gap-4">
          <Input label="Kalit (Masalan: auth.login)" required value={form.key || ""} onChange={e => setForm({ ...form, key: e.target.value })} disabled={!!(form.key && translations.find(t=>t.key===form.key))} />
          <Input label="O'zbekcha" required value={form.uz || ""} onChange={e => setForm({ ...form, uz: e.target.value })} />
          <Input label="Ruscha" required value={form.ru || ""} onChange={e => setForm({ ...form, ru: e.target.value })} />
          <Input label="Inglizcha" required value={form.en || ""} onChange={e => setForm({ ...form, en: e.target.value })} />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); setForm({}); }}>Bekor qilish</Button>
            <Button type="submit">Saqlash</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
