"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, type TableColumn } from "@/components/ui/Table";
import { addAdmin, getAdminAccounts, setAdminActive } from "@/lib/api/admin";
import { adminErrorText } from "@/lib/admin-error-text";
import type { AdminAccount } from "@/lib/admin-types";
import type { AdminPermission } from "@/lib/admin-types";

const operationalPermissions: { value: AdminPermission; label: string }[] = [
  { value: "users", label: "Foydalanuvchilar" },
  { value: "kyc", label: "KYC" },
  { value: "disputes", label: "Nizolar" },
  { value: "payments", label: "To‘lovlar" },
  { value: "support", label: "Yordam" },
];

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "", email: "", title: "", password: "",
    permissions: operationalPermissions.map((item) => item.value),
  });
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    getAdminAccounts().then(setAdmins).catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await addAdmin(form);
      setAdmins(await getAdminAccounts());
      setOpen(false);
      setForm({
        fullName: "", email: "", title: "", password: "",
        permissions: operationalPermissions.map((item) => item.value),
      });
    } catch (err) {
      setError(adminErrorText(err));
    }
  }

  async function toggle(item: AdminAccount) {
    setError("");
    try {
      setAdmins(await setAdminActive(item.id, !item.active));
    } catch (err) {
      setError(adminErrorText(err));
    }
  }

  const columns: TableColumn<AdminAccount>[] = [
    { key: "name", header: "Administrator", render: (row) => <div><p className="font-medium">{row.fullName}</p><p className="text-2xs text-faint">{row.email}</p></div> },
    { key: "role", header: "Rol", render: (row) => <Badge tone={row.role === "super_admin" ? "danger" : "primary"}>{row.role === "super_admin" ? "Super Admin" : "Admin"}</Badge> },
    { key: "status", header: "Holat", render: (row) => <Badge tone={row.active ? "success" : "danger"}>{row.active ? "Faol" : "Bloklangan"}</Badge> },
    { key: "created", header: "Ruxsatlar", render: (row) => <span className="text-xs text-muted">{row.role === "super_admin" ? "Barchasi" : `${row.permissions.length} modul`}</span> },
    { key: "action", header: "Amal", render: (row) => <Button variant={row.active ? "danger" : "secondary"} size="sm" onClick={() => toggle(row)}>{row.active ? "Bloklash" : "Faollashtirish"}</Button> },
  ];

  if (loadError) {
    return (
      <>
        <AdminPageHeader title="Adminlar boshqaruvi" description="CEO yangi operatsion admin yaratadi yoki uning kirishini to‘xtatadi." />
        <ErrorState error={loadError} onRetry={load} />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Adminlar boshqaruvi"
        description="CEO yangi operatsion admin yaratadi yoki uning kirishini to‘xtatadi. Super Admin vakolati delegatsiya qilinmaydi."
        action={<Button onClick={() => setOpen(true)}>Admin qo‘shish</Button>}
        backHref="/admin"
      />
      {error && <p role="alert" className="mb-4 rounded-input bg-danger/10 p-3 text-xs text-danger-deep">{error}</p>}
      <Table columns={columns} rows={admins} rowKey={(row) => row.id} renderMobileCard={(row) => (
        <Card padding="none" className="border-0"><div className="flex justify-between gap-3"><div><p className="font-medium">{row.fullName}</p><p className="text-xs text-muted">{row.email}</p></div><Badge tone={row.role === "super_admin" ? "danger" : "primary"}>{row.role === "super_admin" ? "Super Admin" : "Admin"}</Badge></div><Button className="mt-4 w-full" variant={row.active ? "danger" : "secondary"} size="sm" onClick={() => toggle(row)}>{row.active ? "Bloklash" : "Faollashtirish"}</Button></Card>
      )} />
      <Modal open={open} onClose={() => setOpen(false)} title="Yangi operatsion admin">
        <form onSubmit={create} className="flex flex-col gap-4">
          <Input label="To‘liq ism" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required maxLength={100} />
          <Input label="Korporativ email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Lavozim" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={100} />
          <Input label="Vaqtinchalik parol" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={10} hint="Kamida 10 belgi, katta-kichik harf va raqam" />
          <fieldset>
            <legend className="mb-2 text-xs font-medium text-muted">Modul ruxsatlari</legend>
            <div className="grid grid-cols-2 gap-2">
              {operationalPermissions.map((permission) => (
                <label key={permission.value} className="flex items-center gap-2 text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(permission.value)}
                    onChange={(e) => setForm({
                      ...form,
                      permissions: e.target.checked
                        ? [...form.permissions, permission.value]
                        : form.permissions.filter((item) => item !== permission.value),
                    })}
                  />
                  {permission.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Bekor qilish</Button><Button type="submit">Yaratish</Button></div>
        </form>
      </Modal>
    </>
  );
}
