"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface Category {
  id: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  active: boolean;
  order: number;
}

const mockCategories: Category[] = [
  { id: "c1", nameUz: "Veb Dasturlash", nameRu: "Веб Разработка", nameEn: "Web Development", active: true, order: 1 },
  { id: "c2", nameUz: "Dizayn", nameRu: "Дизайн", nameEn: "Design", active: true, order: 2 },
  { id: "c3", nameUz: "Marketing", nameRu: "Маркетинг", nameEn: "Marketing", active: false, order: 3 },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Category>>({});

  const columns: TableColumn<Category>[] = [
    { key: "order", header: "Tartib", render: (row) => <span className="font-mono text-xs">{row.order}</span> },
    { key: "name", header: "Nomi (UZ/RU/EN)", render: (row) => <div><p className="font-medium text-ink">{row.nameUz}</p><p className="text-3xs text-muted">{row.nameRu} / {row.nameEn}</p></div> },
    { key: "status", header: "Holati", render: (row) => <Badge tone={row.active ? "success" : "danger"}>{row.active ? "Faol" : "Yashirin"}</Badge> },
    {
      key: "actions",
      header: "Amallar",
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setForm(row); setOpen(true); }}>Tahrirlash</Button>
          <Button variant={row.active ? "danger" : "primary"} size="sm" onClick={() => setCategories(categories.map(c => c.id === row.id ? { ...c, active: !c.active } : c))}>
            {row.active ? "Yashirish" : "Faollashtirish"}
          </Button>
        </div>
      )
    },
  ];

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (form.id) {
      setCategories(categories.map(c => c.id === form.id ? { ...c, ...form } as Category : c));
    } else {
      setCategories([...categories, { ...form, id: `c${Date.now()}`, active: true } as Category]);
    }
    setOpen(false);
    setForm({});
  }

  return (
    <>
      <AdminPageHeader
        title="Kategoriyalar"
        description="Marketplace xizmat toifalarini boshqarish va tartiblash."
        action={<Button onClick={() => { setForm({ order: categories.length + 1 }); setOpen(true); }}>Toifa qo&apos;shish</Button>}
      />
      <Table
        columns={columns}
        rows={categories.sort((a, b) => a.order - b.order)}
        rowKey={(row) => row.id}
        renderMobileCard={(row) => (
          <Card padding="none" className="border-0">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{row.nameUz}</p>
                <Badge tone={row.active ? "success" : "danger"} className="mt-1">{row.active ? "Faol" : "Yashirin"}</Badge>
              </div>
              <Button size="sm" onClick={() => { setForm(row); setOpen(true); }}>Tahrirlash</Button>
            </div>
          </Card>
        )}
      />

      <Modal open={open} onClose={() => { setOpen(false); setForm({}); }} title={form.id ? "Toifani tahrirlash" : "Yangi toifa"}>
        <form onSubmit={save} className="flex flex-col gap-4">
          <Input label="Tartib raqami" type="number" required value={String(form.order || "")} onChange={e => setForm({ ...form, order: Number(e.target.value) })} />
          <Input label="Nomi (O'zbek)" required value={form.nameUz || ""} onChange={e => setForm({ ...form, nameUz: e.target.value })} />
          <Input label="Nomi (Rus)" required value={form.nameRu || ""} onChange={e => setForm({ ...form, nameRu: e.target.value })} />
          <Input label="Nomi (Ingliz)" required value={form.nameEn || ""} onChange={e => setForm({ ...form, nameEn: e.target.value })} />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); setForm({}); }}>Bekor qilish</Button>
            <Button type="submit">Saqlash</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
