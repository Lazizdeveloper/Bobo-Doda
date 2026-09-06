"use client";

import { useEffect, useRef } from "react";

/**
 * Admin global qidiruvidan kelgan deep-link'ni ochadi
 * (`/admin/foydalanuvchilar?userId=u-1` → shu foydalanuvchi drawer'i).
 *
 * Ilgari qidiruv bunday URL quardi, lekin birorta sahifa uni O'QIMASDI —
 * natija bosilganda sahifa ochilar, ammo yozuv tanlanmasdi.
 *
 * MUHIM: yozuv YUKLANGAN QATORLAR orasidan izlanmaydi, balki ID bo'yicha
 * ALOHIDA so'raladi. Sahifalash joriy etilgach ekranda atigi bitta sahifa
 * (10 ta) qator bo'ladi — 5-sahifadagi yozuvga havola qilingan bo'lsa, uni
 * ro'yxatdan topib bo'lmaydi va sahifa ochilib, hech narsa tanlanmasdi.
 *
 * `useSearchParams` ATAYLAB ishlatilmaydi: u Suspense chegarasini talab
 * qiladi va sahifani statik render'dan chiqaradi. Admin sahifalari allaqachon
 * `"use client"`, shuning uchun effekt ichida `location` o'qish yetarli.
 */
export function useAdminDeepLink<T>(
  param: string,
  /** ID bo'yicha yozuvni so'raydi (`GET /admin/<resurs>/:id`) */
  resolve: (id: string) => Promise<T | null>,
  onFound: (item: T) => void
) {
  /* Bir marta ishlaydi. `resolve`/`onFound` chaqiruvchida barqaror
     (modul funksiyasi va `setState`), lekin inline funksiya berilsa ham
     shu bayroq effektni takrorlanishdan saqlaydi. */
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const id = new URLSearchParams(window.location.search).get(param);
    if (!id) return;

    /* URL darhol tozalanadi — sahifa yangilanganda drawer qayta ochilmasin */
    window.history.replaceState(null, "", window.location.pathname);

    resolve(id)
      .then((item) => {
        if (item) onFound(item);
      })
      /* Topilmasa yoki ruxsat bo'lmasa — sahifa oddiy holicha qoladi.
         Bu ikkilamchi qulaylik, ekranni xato bilan to'ldirmaydi. */
      .catch(() => {});
  }, [param, resolve, onFound]);
}
