"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, MetricCard } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { getAdminData, saveCategory, toggleCategoryActive } from "@/lib/api/admin";
import type { CategoryManagementItem } from "@/lib/admin-types";

export default function CategoriesManagementPage() {
  const [categories, setCategories] = useState<CategoryManagementItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryManagementItem | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form states
  const [formSlug, setFormSlug] = useState("");
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("💼");
  const [formSubcategories, setFormSubcategories] = useState("");

  function load() {
    const data = getAdminData();
    setCategories(data.categories);
  }

  useEffect(() => {
    load();
  }, []);

  function handleSave() {
    if (!formSlug.trim() || !formName.trim()) return;
    const subs = formSubcategories
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, i) => ({
        id: `sub-${formSlug}-${i}`,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        nameUz: name,
        nameRu: name,
        nameEn: name,
        active: true,
      }));

    saveCategory({
      id: formSlug.trim().toLowerCase(),
      nameUz: formName.trim(),
      nameRu: formName.trim(),
      nameEn: formName.trim(),
      slug: formSlug.trim().toLowerCase(),
      icon: formIcon.trim() || "📁",
      order: categories.length + 1,
      serviceCount: selectedCategory ? selectedCategory.serviceCount : 0,
      active: true,
      subcategories: subs,
    });

    load();
    setCreateModalOpen(false);
    setEditModalOpen(false);
  }

  function openEdit(cat: CategoryManagementItem) {
    setSelectedCategory(cat);
    setFormSlug(cat.slug);
    setFormName(cat.nameUz);
    setFormIcon(cat.icon);
    setFormSubcategories(cat.subcategories.map((s) => s.nameUz).join(", "));
    setEditModalOpen(true);
  }

  function openCreate() {
    setSelectedCategory(null);
    setFormSlug("");
    setFormName("");
    setFormIcon("📁");
    setFormSubcategories("");
    setCreateModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Kategoriyalar & Xizmatlar Taksonomiyasi"
        description="Marketplace xizmat toifalari, sub-kategoriyalar iyerarxiyasi va xizmatlar taqsimoti boshqaruvi."
        action={
          <Button type="button" tone="primary" onClick={openCreate} className="text-xs">
            + Yangi Kategoriya Qo‘shish
          </Button>
        }
      />

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Asosiy Kategoriyalar" value={categories.length} detail="Bozor yo'nalishlari" />
        <MetricCard
          label="Jami Sub-kategoriyalar"
          value={categories.reduce((sum, c) => sum + c.subcategories.length, 0)}
          detail="Quyi tor sohalar"
          tone="primary"
        />
        <MetricCard
          label="Jami Faol Xizmatlar"
          value={categories.reduce((sum, c) => sum + (c.serviceCount || 0), 0)}
          detail="Mavjud xizmatlar soni"
          tone="success"
        />
      </section>

      {/* Categories Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Card key={cat.id} padding="lg" className="flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-xl border border-line">
                    {cat.icon}
                  </span>
                  <div>
                    <h3 className="font-heading text-sm font-bold text-ink">{cat.nameUz}</h3>
                    <p className="text-3xs text-muted font-mono">slug: {cat.slug}</p>
                  </div>
                </div>
                <Badge tone={cat.active ? "success" : "neutral"} size="sm">
                  {cat.active ? "Faol" : "Nofaol"}
                </Badge>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-surface/60 p-2.5 text-xs">
                <span className="text-muted">Biriktirilgan Xizmatlar:</span>
                <span className="font-bold text-primary">{cat.serviceCount || 0} ta</span>
              </div>

              <div className="mt-3 space-y-1.5">
                <span className="text-3xs uppercase font-bold text-muted">
                  Quyi yo‘nalishlar ({cat.subcategories.length} ta):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {cat.subcategories.map((sub) => (
                    <span key={sub.id} className="rounded-md bg-card px-2 py-0.5 text-2xs border border-line text-ink">
                      {sub.nameUz}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-line/60 pt-3">
              <button
                type="button"
                onClick={() => {
                  toggleCategoryActive(cat.id);
                  load();
                }}
                className="text-2xs font-semibold text-muted hover:text-ink"
              >
                {cat.active ? "O‘chirish (Deactivate)" : "Faollashtirish"}
              </button>
              <Button type="button" size="sm" variant="outline" onClick={() => openEdit(cat)} className="text-xs">
                Tahrirlash →
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit / Create Modal */}
      {(editModalOpen || createModalOpen) && (
        <Modal
          open={editModalOpen || createModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setCreateModalOpen(false);
          }}
          title={editModalOpen ? `Kategoriyani tahrirlash: ${formName}` : "Yangi Kategoriya Qo‘shish"}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditModalOpen(false);
                  setCreateModalOpen(false);
                }}
              >
                Bekor qilish
              </Button>
              <Button
                type="button"
                tone="primary"
                onClick={handleSave}
                disabled={!formSlug.trim() || !formName.trim()}
              >
                Saqlash
              </Button>
            </div>
          }
        >
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-ink block mb-1">Kategoriya Nomi (O‘zbekcha):</label>
              <Input
                placeholder="Masalan: Sun'iy Intellekt & ML"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-ink block mb-1">Slug (URL identifikator):</label>
                <Input
                  placeholder="ai_ml"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  disabled={editModalOpen}
                />
              </div>
              <div>
                <label className="font-semibold text-ink block mb-1">Emoji / Icon:</label>
                <Input
                  placeholder="🤖"
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-ink block mb-1">
                Sub-kategoriyalar (Vergul bilan ajratilgan):
              </label>
              <Input
                placeholder="LLM integratsiyasi, Chatbotlar, Kompyuter ko'rishi"
                value={formSubcategories}
                onChange={(e) => setFormSubcategories(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
