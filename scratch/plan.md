## Maqsad
Foydalanuvchi tizim strukturasidan qoniqmayotganini (xatoga o'xshayotganini) bildirdi. Oldingi o'zgarishlarimiz natijasida `/bozor` (Marketplace) sahifasi umumiy ildizga ko'chirilgan edi, biroq u o'zining navigatsiya paneli (TopNav) va layoutini yo'qotgan. Bu esa foydalanuvchi kabinetdan bozorga o'tganda xuddi tizimdan chiqib ketgandek tasavvur uyg'otadi.
Bizning maqsadimiz — butun tizim uchun yagona (Unified) arxitektura yaratish. Xaridor, Mutaxassis va Bozor sahifalarini bitta qobiq `(main)` ichiga yig'amiz.

## Foydalanuvchi Tasdig'i Talab Qilinadi
> [!IMPORTANT]
> **Yagona Layout:** Sizga shunday tuzilma ma'qulmi: Xaridor va Mutaxassis o'zining kabinetida ham, Bozor (e'lonlar/xizmatlar izlash) sahifasida ham tepada doimiy o'z menyusini (TopNav) ko'rib turadi. Tizim avtomatik ravishda foydalanuvchi roliga qarab to'g'ri menyuni ko'rsatadi.

## Kiritiladigan O'zgarishlar

### 1. `app/(main)` guruhini yaratish va Layoutni birlashtirish
Hozirda `app/xaridor/layout.tsx` va `app/mutaxassis/layout.tsx` alohida. Ularni o'chirib, bitta umumiy `app/(main)/layout.tsx` yaratamiz.

#### [NEW] `app/(main)/layout.tsx`
```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { TopNav as XaridorTopNav } from "@/components/xaridor/TopNav";
import { TopNav as MutaxassisTopNav } from "@/components/mutaxassis/TopNav";
import { GuestTopNav } from "@/components/shared/GuestTopNav"; // Yangi: tizimga kirmaganlar uchun
import { CabinetFooter } from "@/components/shared/CabinetFooter";
import { authService } from "@/lib/api";

export default function MainLayout({ children }: { children: ReactNode }) {
  // Avtorizatsiya tekshiruvi va rolni aniqlash
  // Agar xaridor bo'lsa -> XaridorTopNav
  // Agar mutaxassis bo'lsa -> MutaxassisTopNav
  // Aks holda -> GuestTopNav
}
```

#### [DELETE] `app/xaridor/layout.tsx`
#### [DELETE] `app/mutaxassis/layout.tsx`

### 2. Papkalarni ko'chirish
Barcha foydalanuvchi interfeyslarini shu bitta qobiq ichiga olamiz:
- `app/bozor` -> `app/(main)/bozor`
- `app/xaridor` -> `app/(main)/xaridor`
- `app/mutaxassis` -> `app/(main)/mutaxassis`

Natijada, har bir marshrut yagona struktura (bir xil padding, menyu va footer) asosida ishlaydi.

### 3. Tizimga kirmaganlar (Guest) uchun navigatsiya
Agar saytga mehmon (Guest) kirsa va `/bozor` ni ko'rsa, tepada "Kirish" va "Ro'yxatdan o'tish" tugmalari bo'lgan sodda menyu (`GuestTopNav`) ko'rinadi.

## Tekshirish Rejasi
1. Tizimni `npm run dev` da ishga tushirib, `/xaridor` va `/bozor` o'rtasida navigatsiya qilamiz. Menyu barqaror qolishi kerak.
2. `npm run lint` va `npx tsc --noEmit` orqali marshrut ko'chishidan kelib chiqqan xatolarni bartaraf etamiz.
