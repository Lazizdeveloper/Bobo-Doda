# Bobo&Doda

Markaziy Osiyo uchun ikki tomonlama xizmatlar marketplace frontend’i. Xaridor
mutaxassis yoki tayyor xizmat topadi, ish e’loni joylaydi va bosqichli escrow
shartnomasi orqali ishlaydi. Mutaxassis xizmatlarini sotadi, e’lonlarga taklif
yuboradi, ishni topshiradi va daromadini boshqaradi.

## Frontend qamrovi

- UZ/RU/EN interfeys va UZS’da aniq moliyaviy hisob
- Mutaxassis va xaridor onboarding’i
- Xizmatlar katalogi, saqlanganlar, qidiruv va filtrlar
- Ish e’lonlari, takliflar, bevosita offer va yollash
- Bosqichli shartnoma, escrow, topshirish, qabul va revision
- Click, Payme va bank kartasi checkout holatlari
- Chat, bildirishnomalar, reyting va sharhlar
- KYC/verifikatsiya markazi
- Nizo ochish va dalillar biriktirish
- Yordam markazi va support ticketlar
- Notification/privacy sozlamalari, data export va account deletion
- Foydalanish shartlari, maxfiylik siyosati va ommaviy oferta
- Payment success/pending/failed/expired/refunded callback ekranlari

## Ishga tushirish

```bash
npm install
npm run dev
```

Production tekshiruvi:

```bash
npm run lint
npm run build
```

Launch bloklari va keyingi infratuzilma ishlari:
[PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md).

## Muhim arxitektura chegarasi

Hozirgi repository frontend mahsulot oqimlarini local ma’lumot adapteri orqali
ishlatadi. Production relizda `lib/mock-api` server API client’iga almashtirilishi
shart. Autentifikatsiya, KYC hujjatlari, payment secretlar, transaction status,
webhook, escrow ledger va support/nizo ma’lumotlari brauzerda saqlanmasligi kerak.

Click, Payme va Visa checkout frontend’lari tayyor, ammo haqiqiy pul operatsiyasi
faqat merchant shartnomasi va server integratsiyasi bilan faollashtiriladi.
KZT/KGS/TJS/TMT ko‘rsatish faqat backend real FX kursi va har bir yozuvning
asl valyutasini qaytargandan keyin yoqilishi kerak; hozir soxta konvertatsiya yo‘q.
