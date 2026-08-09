"use client";

import { useEffect } from "react";

export function OfflineSupport() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ilova service worker'siz ham ishlaydi; keyingi tashrifda qayta uriniladi.
    });
  }, []);

  return null;
}
