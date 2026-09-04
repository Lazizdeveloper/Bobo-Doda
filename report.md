# Bobo&Doda — to'liq ketma-ket review hisoboti

**Sana:** 2026-09-04 · **Branch:** `main` · **Commit:** `96cc120`
**Qamrov:** mutaxassis kabineti + xaridor kabineti + kirish oqimi + umumiy komponentlar + API/mock qatlami

---

## 0. Qanday tekshirildi

| Bosqich | Natija |
|---|---|
| `npm run verify` (lint + typecheck + build) | ✅ **Toza o'tdi** (exit 0), 54 marshrut build bo'ldi |
| i18n qamrovi (dasturiy skript) | ✅ 1240 kalit, uz/ru/en — **yetishmayotgan kalit yo'q** |
| Brauzer bilan yurish (Playwright, 1280px + 360px) | 23 sahifa, 2 rol · konsol xatolari, bo'sh sahifalar, gorizontal skroll tekshirildi |
| Maqsadli xato tasdiqlash testlari | 4 ta yuqori jiddiylikdagi xato **amalda takrorlandi** |
| Kod o'qish | ~27 000 qator: barcha sahifalar, komponentlar, `lib/` |

**Yaxshi xabar:** ikkala kabinetning birorta sahifasida konsol xatosi, oq ekran yoki
360px'da gorizontal skroll topilmadi. Build va tiplar toza. Quyidagilar — shundan
keyingi qatlamdagi muammolar.

Belgi: 🔬 = brauzerda amalda takrorlandi · 📖 = kodni o'qib aniqlandi

### Tuzatish holati

| To'lqin | Qamrov | Holat |
|---|---|---|
| **1 — buzilgan funksiyalar** | 1.1 · 1.2 · 1.4 · 2.9 · 2.10 · 2.13 | ✅ **Tugadi** — `npm run verify` toza, brauzerda tasdiqlangan |
| **2 — pul va ishonch** | 1.5 · 1.3 · 2.6 · 1.7 · 2.1 · 2.2 · 2.15 | ✅ **Tugadi** — `npm run verify` toza, brauzerda tasdiqlangan |
| **3 — boshi berk oqimlar** | 1.6 · 2.3 · 2.4 · 2.5 · 2.7 · 2.11 · 2.12 · 2.16 · 2.17 | ✅ **Tugadi** — `npm run verify` toza, brauzerda tasdiqlangan |
| **4 — a11y va matn** | 3.1–3.13 + 3.4b + 2.8 · 2.14 (rejadan tushib qolgan) | ✅ **Tugadi** — `npm run verify` toza, axe WCAG 2 A/AA = **0 buzilish** |
| **5 — tizim tozaligi** | 4.1 – 4.8 (hammasi) | ✅ **Tugadi** — `npm run verify` toza, brauzerda tasdiqlangan |

---

## 1. P0 — Bloklovchi / moliyaviy / boshi berk ko'cha

### 1.1 ✅ TUZATILDI · Ikkinchi bank kartasini qo'shib BO'LMAYDI
**Fayl:** `components/shared/cards.tsx` → `AddCardModal.handleAdd`

`handleAdd()` da `setSaving(true)` bor, lekin muvaffaqiyatli tugaganda
`setSaving(false)` **hech qachon chaqirilmaydi** — `finally` bloki yo'q, `reset()`
esa `saving` ni tozalamaydi. `Modal` yopilganda `null` qaytaradi, ammo
`AddCardModal` komponentining o'zi mount holida qoladi → holat saqlanib qoladi.

**Amalda tasdiqlandi:** 1-karta qo'shilgandan keyin modalni qayta ochsak:
```
{"modal":true,"label":"Karta qo'shish","disabled":true,"spinner":true}
```
Tugma abadiy aylanayotgan spinner bilan bloklangan. Foydalanuvchi **hech qachon
ikkinchi karta qo'sha olmaydi** — na Sozlamalarda, na to'lov/yechish oqimidagi
`CardPicker` ichida.

**Ta'siri:** pul yechish oqimining markazida. Karta muddati tugasa yoki xato
karta qo'shilsa — foydalanuvchi qamalib qoladi.

**Yechim:** `handleAdd` ga `finally { setSaving(false) }` qo'shish (yoki `reset()`
ichida `setSaving(false)`).

---

### 1.2 ✅ TUZATILDI · Qoralama xizmatni chop etishning YO'LI YO'Q
**Fayllar:** `components/shared/ServiceCard.tsx` · `components/shared/ServiceWizard.tsx:537`

Ikkita to'siq bir-birini yopadi:
1. `ServiceCard` da faollashtirish tugmasi `service.status !== "draft"` sharti bilan
   yashiriladi → qoralama kartasida faqat *Tahrirlash* va *O'chirish* bor.
2. Tahrirlash sehrgarida yagona saqlash tugmasi `save(initial.status, "publish")`
   chaqiradi — ya'ni **mavjud holatni saqlab qoladi**. Tahrirlashda "Chop etish"
   yoki "Qoralama sifatida saqlash" tanlovi umuman yo'q.

**Amalda tasdiqlandi:** qoralama xizmat kartasidagi tugmalar:
```
["Tahrirlash", "Tahrirlash", "O'chirish"]   ← faollashtirish yo'q
```

**Ta'siri:** "Qoralama sifatida saqlash" tugmasi mutaxassis ishini abadiy ko'rinmas
qiladi — xizmat hech qachon bozorga chiqmaydi.

**Yechim:** `ServiceCard` da `draft` uchun ham "Chop etish" tugmasi; tahrirlash
rejimida `draft` bo'lsa "Chop etish" tugmasini ko'rsatish.

---

### 1.3 ✅ TUZATILDI · Parolni tiklash umuman ishlamaydi, lekin "muvaffaqiyat" deydi
**Fayllar:** `lib/mock-api/index.ts:448` · `app/(auth)/kirish/parolni-tiklash/page.tsx`

```ts
export async function resetPassword(_input: {...}): Promise<void> {
  await delay(800);
  // Mock implementation: always succeed
}
```

Foydalanuvchi yangi parol kiritadi → `auth.resetSuccess` toast'ini ko'radi →
kirish sahifasiga yo'naltiriladi → **yangi parol ishlamaydi, eski parol esa
ishlayveradi**. Bundan tashqari telefon raqami bazada bor-yo'qligi tekshirilmaydi
va kod umuman tekshirilmaydi.

**Ta'siri:** parolini unutgan foydalanuvchi hisobini abadiy yo'qotadi va buni
tushunmaydi — chunki tizim "bo'ldi" dedi.

**Yechim:** `resetPassword` ni haqiqiy qilish (telefon bo'yicha user topish +
`WEAK_PASSWORD` tekshiruvi + parolni yozish), yoki UI'da ochiq "bu demo, parol
o'zgarmaydi" deb yozish. Birinchisi to'g'ri.

---

### 1.4 ✅ TUZATILDI · `/rol-tanlash` sessiyasiz — sahifa abadiy bloklanadi
**Fayl:** `app/(auth)/rol-tanlash/page.tsx`

Guard effekti `if (!session || !session.verified) return;` deb **erta chiqib
ketadi** — sessiyasiz foydalanuvchi hech qayerga yo'naltirilmaydi (`/kirish/tasdiqlash`
da esa bunday yo'naltirish bor). Rol kartasini bosganda `handleSeller`/`handleBuyer`
da `try/catch` yo'q → `chooseRole` `NO_SESSION` bilan yiqiladi, `setLoading(true)`
esa `true` bo'lib qoladi.

**Brauzer natijasi:**
```
PAGE ERROR @/rol-tanlash: ApiError: NO_SESSION
tugmalar disabled holati: [false,false,false,true,true]   ← ikkala rol kartasi o'chgan
URL o'zgarmadi
```

Ekranda hech qanday xato yo'q, ikkala tugma o'chgan — foydalanuvchi qotib qolgan
sahifada qoladi.

**Yechim:** sessiya yo'q bo'lsa `/kirish` ga `router.replace`; `handleSeller`/
`handleBuyer` ga `try/catch` + `setLoading(false)` + toast.

---

### 1.5 ✅ TUZATILDI · Xaridor "Jami sarflangan" summasi ikki ekranda IKKI XIL
**Fayllar:** `app/xaridor/page.tsx:78–82` · `app/xaridor/xarajatlar/page.tsx:71`

Ikki xil formula ishlatilgan:

| Ekran | Formula |
|---|---|
| Boshqaruv | `yakunlangan` **shartnomalar** `totalAmount` yig'indisi |
| Xarajatlar | `qabul_qilindi` **bosqichlar** `amount` yig'indisi |

Kodda hatto tan olingan izoh bor: `// Calculate total spent (dummy logic for now...)`.

**Amalda tasdiqlandi** (faol shartnomaning 1-bosqichi qabul qilingan holat):
```
Boshqaruv "Jami sarflangan"  = 2 000 000 so'm
Xarajatlar "Jami to'langan"  = 4 000 000 so'm
```

**Ta'siri:** ishonchga qurilgan escrow mahsulotida foydalanuvchi bir vaqtda
ikki xil "qancha to'ladim" raqamini ko'radi. Bu — mahsulotning eng og'ir toifadagi
xatosi. Mutaxassis tomonida bu allaqachon tuzatilgan (`app/mutaxassis/page.tsx`
dagi izohga qarang), xaridor tomonida esa qolib ketgan.

**Yechim:** Boshqaruvda ham Xarajatlar bilan bir xil formulani ishlatish
(qabul qilingan bosqichlar yig'indisi).

---

### 1.6 ✅ TUZATILDI · Nizo ochilsa shartnoma ABADIY muzlaydi
**Fayllar:** `lib/api/state-machines.ts` (`disputeMachine`, `contractMachine`) ·
`components/shared/DisputeControl.tsx`

`nizo` holatidan chiqishning barcha yo'llari faqat `admin` aktyoriga ochiq:
```ts
{ from: "nizo", to: "faol",          actors: ["admin"] },
{ from: "nizo", to: "yakunlangan",   actors: ["admin"] },
{ from: "nizo", to: "bekor_qilingan",actors: ["admin"] },
```
Admin paneli esa `main` branch'ida **yo'q** (`admin-panel` ga chiqarilgan).
Natijada: nizo ochgan foydalanuvchi shartnomani na davom ettira oladi, na bekor
qila oladi (`canCancel` `nizo` ni qamrab olmaydi), na nizoni yopa oladi.
Escrow'dagi pul ham muzlab qoladi. UI'da "keyin nima bo'ladi / qancha kutish
kerak" degan matn ham yo'q.

**Yechim (minimal):** nizo modalida SLA/keyingi qadam matnini ko'rsatish +
"nizoni qaytarib olish" (`nizo → faol`, ochgan tomon uchun) imkonini berish.

---

### 1.7 ✅ TUZATILDI · Mutaxassis workroom'ida yuklash xatosi "Shartnoma topilmadi" bo'lib ko'rinadi
**Fayl:** `app/mutaxassis/shartnomalar/[id]/page.tsx:87`

```ts
} catch {
  if (version === loadVersionRef.current) setContract(null);   // ← xato = "topilmadi"
}
...
if (contract === null) return <EmptyState title={t("contract.notFound")} />;
```

Bu sahifada `loadError` holati **umuman yo'q** — tarmoq uzilishi, sessiya tugashi
yoki `STORAGE_FULL` ham "Shartnoma topilmadi" bo'lib chiqadi, qayta urinish tugmasi
ko'rsatilmaydi.

Bu CLAUDE.md ning aniq qoidasini buzadi:
> *"Xato hech qachon bo'sh ro'yxatga aylantirilmaydi — aks holda foydalanuvchi
> ma'lumot o'chgan deb o'ylaydi."*

Xaridor tomonidagi ayni shu sahifada (`app/xaridor/shartnomalar/[id]/page.tsx:100`)
buni to'g'ri qilingan — `setLoadError(error)` + `<ErrorState onRetry>`.

**Yechim:** xaridor versiyasidagi naqshni mutaxassis versiyasiga ko'chirish.

---

## 2. P1 — Jiddiy funksional va UX muammolari

### 2.1 ✅ TUZATILDI · Xaridorga MUTAXASSIS uchun yozilgan matn ko'rsatiladi
**Fayl:** `app/xaridor/shartnomalar/[id]/page.tsx:493` · kalit `cfund.awaitingSeller`

Kalit matni (mutaxassisga qaratilgan):
> "Buyurtmachi to'lovni amalga oshirishi kutilmoqda — to'lov tushgach **ishni boshlaysiz**"

Bu matn xaridorning o'z workroom'ida, `kutilmoqda` bosqichi ostida ko'rsatiladi.
Ya'ni **to'lashi kerak bo'lgan odam** "buyurtmachi to'lashini kutmoqdamiz, siz
ishni boshlaysiz" degan matnni o'qiydi. Mantiqan ham, roli bo'yicha ham noto'g'ri.

**Yechim:** xaridor uchun alohida kalit (masalan `bms.awaitingYourPayment`):
"To'lovingiz kutilmoqda — to'lasangiz mutaxassis ishni boshlaydi".

---

### 2.2 ✅ TUZATILDI · "To'lov" bosqichi to'lanmagan shartnomada ham yashil ko'rinadi
**Fayllar:** ikkala workroom, `pipeline` bloki

Quvurning 1-qadami (`pipeline.stageFund`) `bekor_qilingan` dan boshqa **hamma
holatda** faol (yashil) chiziladi — jumladan `imzolangan` (hali to'lanmagan)
shartnomada ham. Xaridor "to'lov bosqichi bajarilgan" deb tushunadi, holbuki ayni
shu sahifada undan to'lov so'ralmoqda.

**Yechim:** 1-qadam sharti `contract.status !== "imzolangan" && contract.status !== "bekor_qilingan"`.

---

### 2.3 ✅ TUZATILDI · Rad etilgan/qaytarib olingan taklif — mutaxassisda hech qanday izoh yo'q
**Fayl:** `app/mutaxassis/takliflarim/kelgan/[id]/page.tsx`

Xaridor tomonida (`app/xaridor/takliflarim/[id]/page.tsx`) to'rt holat uchun ham
tushuntirish bloki bor (kutilmoqda / qabul / rad / bekor). Mutaxassis tomonida esa
faqat `qabul_qilindi` uchun blok bor. Taklif rad etilsa yoki xaridor qaytarib olsa
mutaxassis: sarlavha + byudjetni ko'radi, **chat yo'qoladi** (`pending &&` sharti),
nima bo'lganini tushuntiruvchi matn ham, keyingi qadam havolasi ham yo'q.

---

### 2.4 ✅ TUZATILDI · Xabarlar ro'yxatida "o'lik" suhbatlar
**Fayl:** `app/mutaxassis/xabarlar/page.tsx:75`

```ts
const openOffers = offers.filter((o) => o.status !== "qabul_qilindi");
```
Rad etilgan va bekor qilingan takliflar ham inbox'ga tushadi — oxirgi xabar bilan.
Foydalanuvchi bosadi → 2.3 dagi sabab bilan **chat umuman ko'rsatilmaydi**.
Ya'ni ro'yxatda ko'rgan xabaringizni ocholmaysiz.

---

### 2.5 ✅ TUZATILDI · Bosqich topshirilgandan keyin holat rassinxron bo'lishi mumkin
**Fayl:** `app/mutaxassis/shartnomalar/[id]/page.tsx:111`

```ts
await milestonesService.submit(submitTarget.id);      // 1) holat o'zgardi
const message = await messagesService.send(...);      // 2) bu yiqilishi mumkin
```
Agar 2-qadam yiqilsa: umumiy xato toast'i chiqadi, modal ochiq qoladi, bosqich esa
**allaqachon topshirilgan**. Foydalanuvchi qayta bosadi → `BAD_STATE` → yana xato.
Ishi topshirilganini bilmay qoladi.

**Yechim:** `submit()` dan keyin modalni yopib holatni yangilash; xabar yuborishni
alohida (best-effort) qilish.

---

### 2.6 ✅ TUZATILDI · Nizodagi shartnoma puli hisob-kitoblardan "yo'qoladi"
**Fayllar:** `app/xaridor/xarajatlar/page.tsx:76` · `app/mutaxassis/daromad/page.tsx:69`

Ikkala ekran ham escrow/kutilayotgan summani hisoblashda
`contractById.get(...)?.status === "faol"` sharti bilan filtrlaydi. Shartnoma
`nizo` holatiga o'tishi bilan uning escrow'dagi puli:
- xaridorning "Escrow'da" raqamidan yo'qoladi,
- mutaxassisning "Kutilmoqda" raqamidan yo'qoladi.

Pul aslida joyida turibdi. Nizo paytida — aynan pul haqida xavotir eng yuqori
paytda — ikkala tomon ham pulini ko'rmay qoladi.

**Yechim:** shartga `|| status === "nizo"` qo'shish.

---

### 2.7 ✅ TUZATILDI · Mutaxassis o'z kategoriyalarini keyin O'ZGARTIRA OLMAYDI
**Fayllar:** `app/mutaxassis/royxat/page.tsx` · `lib/mock-api/index.ts` (`updateSellerProfile`)

Kategoriyalar ro'yxatdan o'tishda majburiy so'raladi (`completeSellerProfile`),
lekin `updateSellerProfile` `categories` maydonini **umuman qabul qilmaydi** va
Sozlamalar sahifasida ham bunday maydon yo'q. Kategoriyalar esa:
- Boshqaruvdagi "Sizga mos ishlar" tanlashini,
- Bozordagi mutaxassislar filtrini
boshqaradi. Ya'ni bir marta xato tanlagan mutaxassis buni tuzata olmaydi.

---

### 2.8 ✅ TUZATILDI · Tasdiqlanmagan ism yon ta'sir sifatida saqlanib ketadi
**Fayl:** `app/mutaxassis/sozlamalar/page.tsx:197` (`saveSellerData`)

Til qo'shish, portfolio qo'shish/o'chirish darhol `saveSellerData({...})` chaqiradi,
u esa **hamma maydonni**, jumladan `fullName` ni joriy state'dan yuboradi. Agar
foydalanuvchi ism maydonini o'zgartirib, "Saqlash" bosmasdan til qo'shsa — hali
tasdiqlanmagan (bo'sh bo'lishi ham mumkin) ism jimgina saqlanadi.

Shu bilan birga bitta sahifada ikki xil saqlash modeli bor: profil — qo'lda
"Saqlash", til/portfolio — avtosaqlash. Foydalanuvchi buni bilmaydi.

---

### 2.9 ✅ TUZATILDI · `catch` siz `async` funksiyalar — jim yiqilish
| Fayl | Funksiya | Oqibat |
|---|---|---|
| `app/mutaxassis/sozlamalar/page.tsx:141` | `handleAvailability` | Holat optimistik almashadi, saqlanmasa ham UI "band/tayyor" deb ko'rsatadi |
| `components/shared/AccountControls.tsx:45` | `savePreferences` | `try/finally` bor, `catch` yo'q → unhandled rejection, foydalanuvchi hech narsa ko'rmaydi |

---

### 2.10 ✅ TUZATILDI · Kirish formasi ba'zi xatolarda MUTLAQO jim
**Fayl:** `app/(auth)/kirish/page.tsx:100`

```ts
if (code === "PHONE_EXISTS")            { ... }
else if (code === "INVALID_CREDENTIALS"){ ... }
setLoading(false);
```
Boshqa har qanday xato (`WEAK_PASSWORD`, `REGISTRATION_PAUSED`, `STORAGE_FULL`,
tarmoq) uchun **hech qanday xabar ko'rsatilmaydi** — tugma aylanishni to'xtatadi,
sahifada hech narsa o'zgarmaydi. Foydalanuvchi nima bo'lganini bilmaydi.

**Yechim:** `else { setErrors({ form: t("common.error") }) }`.

---

### 2.11 ✅ TUZATILDI · "Suhbatga taklif qilish" hech qayerga olib bormaydi
**Fayl:** `app/xaridor/elonlarim/[id]/page.tsx`

Xaridor taklifni `suhbat` holatiga o'tkazadi, mutaxassisga bildirishnoma ketadi —
lekin **e'lon takliflari uchun chat kanali umuman yo'q** (chat faqat `Offer` va
`Contract` uchun mavjud). Ikki tomon yollashdan oldin gaplasha olmaydi. "Suhbat"
holatidan keyin xaridor uchun ham, mutaxassis uchun ham hech qanday keyingi qadam
ko'rsatilmaydi.

---

### 2.12 ✅ TUZATILDI · Yollashda bosqichlar jami taklif summasidan farq qilsa — ogohlantirish yo'q
**Fayl:** `app/xaridor/elonlarim/[id]/yollash/[proposalId]/page.tsx`

Bosqichlar jami (`total`) `proposal.bidAmount` bilan hech qanday bog'lanmagan.
Xaridor kelishilgan summadan ancha past summa qo'yib yollasa — hech qanday
ogohlantirish yo'q, mutaxassis esa shartnomani faqat qabul qilingandan keyin
ko'radi.

**Yechim:** `total !== proposal.bidAmount` bo'lsa ogohlantiruvchi matn ko'rsatish.

---

### 2.13 ✅ TUZATILDI · Mobil menyu havoladan keyin yopilmaydi
**Fayllar:** `components/mutaxassis/TopNav.tsx` · `components/xaridor/TopNav.tsx`

`TopNav` layout ichida bo'lgani uchun sahifalar orasida qayta mount bo'lmaydi;
`menuOpen` `true` bo'lib qoladi. **Brauzerda tasdiqlandi:** 360px'da menyudan
"Bozor" bosilgandan keyin menyu hamon ochiq, kontent ustida turibdi.

**Yechim:** har bir `<Link onClick={() => setMenuOpen(false)}>`, yoki
`useEffect(() => setMenuOpen(false), [pathname])`.

---

### 2.14 ✅ TUZATILDI · Ikki xil "profil to'liqligi" foizi
**Fayllar:** `app/mutaxassis/page.tsx:76` (4 mezon) · `app/mutaxassis/sozlamalar/page.tsx:122` (8 mezon)

Bitta profil uchun Boshqaruv va Sozlamalar **turli foiz** ko'rsatadi (masalan 75%
va 50%). Bundan tashqari Boshqaruvdagi "Ko'nikmalar" mezoni `/mutaxassis/sozlamalar`
ga olib boradi, lekin ko'nikmalar u yerda **"Tillar"** tabida — foydalanuvchi
qidirib topishi kerak (tab havolada uzatilmaydi).

---

### 2.15 ✅ TUZATILDI · Ma'lumot eksporti foydalanuvchi PAROLINI ochiq matnda beradi
**Fayllar:** `lib/mock-api/index.ts` (`exportCurrentUserData`) · `components/shared/AccountControls.tsx`

Eksport `user` obyektini to'liq qaytaradi, `User.password` esa mock'da ochiq matnda
saqlanadi. Ya'ni "Ma'lumotlarimni yuklab olish" tugmasi foydalanuvchining parolini
yuklab olinadigan `.json` fayliga yozadi. Bu fayl odatda ulashiladi/saqlanadi.

**Yechim:** eksportda `password` maydonini olib tashlash (bu mock bo'lsa ham
to'g'ri odat).

---

### 2.16 ✅ TUZATILDI · `/tolov/natija` sahifasiga hech qayerdan havola yo'q
`grep` bo'yicha butun `app/`, `components/`, `lib/` da bu marshrutga birorta havola
yo'q. To'lov callback ekranlari (success/pending/failed/expired/refunded) build
bo'ladi, lekin ularga foydalanuvchi hech qachon tushmaydi — o'lik sahifa.

Xuddi shunday, `/yordam-markazi`, `/savol-javob`, `/shartlar`, `/maxfiylik`,
`/oferta` **faqat landing footer'idan** havola qilingan — ikkala kabinet ichidan
huquqiy sahifalarga chiqish yo'li yo'q.

---

### 2.17 ✅ TUZATILDI · Support formasi sozlanmagan muhitda har doim yiqiladi
**Fayllar:** `app/api/support/route.ts` · `components/shared/SupportModal.tsx`

`/api/support` `TELEGRAM_BOT_TOKEN` va `TELEGRAM_SUPPORT_CHAT_ID` env
o'zgaruvchilarini talab qiladi; ular bo'lmasa 500 `SERVER_MISCONFIGURED` qaytaradi
va foydalanuvchi umumiy "xato" ekranini ko'radi. Bu env'lar **CLAUDE.md da
umuman hujjatlashtirilmagan** (aksincha, u yerda "server kodi, API route,
`process.env` yo'q" deb yozilgan). Netlify'da bular qo'yilmasa — sayt ichidagi
yordam tugmasi hech qachon ishlamaydi.

---

## 3. P2 — i18n, matn va foydalanish imkoniyati (a11y)

### 3.1 ✅ TUZATILDI · Mobil hamburger tugmasining nomi yo'q
Ikkala `TopNav` da ham menyu tugmasida `aria-label` yo'q, ichida faqat SVG.
Skrinrider "button" deb o'qiydi. `aria-expanded` ham yo'q.
**Brauzerda tasdiqlandi:** `burger tugma nomi: "(nomsiz)"`.

### 3.2 ✅ TUZATILDI · Qattiq yozilgan (tarjimasiz) `aria-label` lar
| Fayl | Matn | Muammo |
|---|---|---|
| `components/ui/Modal.tsx:103` | `"Yopish"` | **Har bir modalda**; ru/en da ham o'zbekcha o'qiladi. `common.close` kaliti mavjud! |
| `components/ui/Stepper.tsx:12` | `"Bosqichlar"` | o'zbekcha qattiq |
| `components/ui/Breadcrumb.tsx:19` | `"Breadcrumb"` | inglizcha |
| `components/ui/Pagination.tsx:43` | `"Pagination"` | inglizcha |
| `components/shared/LangSwitch.tsx:12` | `"Til / Язык"` | inglizcha yo'q |
| `app/xaridor/bozor/page.tsx:476–557` | **7 ta**: `"Remove category"`, `"Remove search"`, `"Remove price range"`, `"Remove delivery filter"`, `"Remove rating filter"`, `"Remove availability filter"`, `"Remove location filter"` | butunlay inglizcha |

### 3.3 ✅ TUZATILDI · Ko'rinadigan lotin qisqartmalari — tarjimasiz
| Joy | Matn |
|---|---|
| `app/mutaxassis/page.tsx:270` | `'Me'` / `'CL'` |
| `app/xaridor/page.tsx:312` | `"Me"` / `"SP"` |
| `app/xaridor/shartnomalar/[id]/page.tsx:805` | `"CL"` / `"PM"` (Click/Payme) |

O'zbek tilidagi interfeysda avatar doirasida `CL`, `SP`, `Me` — tushunarsiz.

### 3.4 ✅ TUZATILDI · Bozordagi "ommabop qidiruvlar" faqat o'zbekcha
`app/xaridor/bozor/page.tsx:31` — `POPULAR_SEARCHES` qattiq massiv
("Web sayt", "Logo dizayn", "Telegram bot", "SMM", "Kopirayting", "Mobil ilova").
Rus/ingliz tilida ham shu ko'rinadi.

### 3.4b ✅ TUZATILDI · Sozlamalarda qattiq yozilgan o'zbekcha matn *(3-to'lqin ishida topildi)*
`app/mutaxassis/sozlamalar/page.tsx` — "Tillar va ko'nikmalar" tabidagi ikki
izoh matni `t()` orqali emas, to'g'ridan-to'g'ri JSX'da yozilgan:
> "Ko'nikmalaringiz va muloqot tillaringiz xaridorlarga sizni tez topishga yordam beradi."
> "Kamida 3 ta asosiy ko'nikma qo'shing. Enter tugmasi bilan ajratiladi."

Rus/ingliz tilida ham o'zbekcha ko'rinadi. **4-to'lqinda tuzatiladi.**

### 3.5 ✅ TUZATILDI · `alt` matnlari aralash va tarjimasiz
`"1-rasm"` (o'zbekcha), `"Portfolio 1"`, `"Thumbnail 1"` (inglizcha) — 8 faylda.
Yagona i18n kaliti bo'lishi kerak.

### 3.6 ✅ TUZATILDI · Forma xatolari `aria-describedby` bilan bog'lanmagan
`components/ui/Input.tsx` va `components/ui/Select.tsx`: `aria-invalid` qo'yilgan,
lekin `<p role="alert">` xato matni input bilan **bog'lanmagan**. Skrinrider
maydonga fokuslanganda xato matnini o'qimaydi (WCAG 3.3.1). `hint` ham shunday.

### 3.7 ✅ TUZATILDI · Nomsiz forma maydonlari
- `app/xaridor/bozor/page.tsx:322–329` — min/max narx `Input` larida **na `label`,
  na `aria-label`** bor, faqat `placeholder` (WCAG 4.1.2).
- `components/shared/AccountControls.tsx` — hisobni o'chirish tasdiq maydoni
  ham faqat `placeholder` bilan (ustiga-ustak placeholder javobning o'zini
  ko'rsatib turadi).

### 3.8 ✅ TUZATILDI · `Select` ochiluvchi ro'yxatga o'xshamaydi
`components/ui/Select.tsx` da `appearance-none` bor, lekin **o'rniga hech qanday
chevron/strelka chizilmagan**. Natijada barcha tanlash maydonlari oddiy matn
maydonidan farq qilmaydi — foydalanuvchi bosish mumkinligini bilmaydi.

### 3.9 ✅ TUZATILDI · `Tabs` ARIA naqshini to'liq bajarmaydi
`role="tablist"`/`role="tab"` bor, lekin `aria-controls`, `role="tabpanel"`,
`tabIndex` boshqaruvi va **strelka tugmalari bilan navigatsiya** yo'q. E'lon
qilingan naqsh bo'yicha klaviatura bilan yurish ishlamaydi.

### 3.10 ✅ TUZATILDI · Bildirishnoma tugmasi o'qilmagan sonni e'lon qilmaydi
`components/shared/NotificationBell.tsx` — tugmaning `aria-label` i `t("ntf.open")`,
sanoq esa `<span aria-label="3">` ichida (roli yo'q element'da `aria-label`
skrinriderlarda e'tiborga olinmaydi). Skrinrider foydalanuvchisi o'qilmagan
bildirishnoma borligini bilmaydi.

### 3.11 ✅ TUZATILDI · Toast'lar
- Xato toast'i ham `aria-live="polite"` (xatolar uchun `assertive`/`role="alert"` kerak).
- Yopish tugmasi yo'q, 3.5 soniyada yo'qoladi, hover'da to'xtamaydi — xato
  matnini o'qib ulgurmaslik mumkin.

### 3.12 ✅ TUZATILDI · `formatTime` har doim `ru-RU`
`lib/format.ts:52` — `formatTime` `lang` parametri qabul qilmaydi. Chatdagi barcha vaqtlar
uch tilda ham rus lokalida.

### 3.13 ✅ TUZATILDI · Kontrast xavfi
- `components/shared/MilestoneItem.tsx` — `kutilmoqda` bosqichda `opacity-70` +
  `text-faint` (#5E7568) birgalikda oq fonda ~2.9:1 beradi (AA uchun 4.5:1 kerak).
- Ikkala workroom quvurida `text-primary` **`bg-primary/10` ustida** — CLAUDE.md
  ning o'z qoidasini buzadi: *"`bg-X/10` bor joyda matn `text-X-deep`"*.

---

## 4. P3 — Dizayn tizimi, kod sifati, hujjat nomuvofiqligi

### 4.1 ✅ TUZATILDI · `text-3xs` Tailwind'da MAVJUD EMAS
`tailwind.config.ts` da `fontSize` ro'yxati: `2xs, xs, sm, base, lg, xl, 2xl`.
`3xs` **yo'q**, lekin ishlatiladi:
- `components/ui/Badge.tsx:34` — `size="sm"` badge'lar uchun
- `components/ui/ChatImageAttach.tsx:48, 76`

Class umuman generatsiya qilinmaydi → matn meros qilib olingan o'lchamda
chiqadi. Bu **barcha kichik badge'larga** ta'sir qiladi.

### 4.2 ✅ TUZATILDI · `Button` da dizayn tizimidan tashqari ranglar
`components/ui/Button.tsx:35–36` — `toneClasses` da `amber-700/400/50/500` va
`emerald-700/400/50/500` (Tailwind standart palitrasi). CLAUDE.md aniq aytadi:
**"BOSHQA RANG QO'SHILMASIN"**. Bundan tashqari `tone` propi butun loyihada
**birorta ham marta ishlatilmagan** — o'lik kod.

### 4.3 ✅ TUZATILDI · Token bo'lmagan uslublar
`shadow-sm` (5+ joy), `rounded-2xl` (`app/xaridor/page.tsx:84`, `Modal.tsx:96`),
`bg-gradient-to-br` / `bg-gradient-to-r` (ikkala boshqaruv), `border-t-4`
(xaridor sozlamalari) — dizayn tokenlaridan (`shadow-card`, `rounded-card`)
tashqarida.

### 4.4 ✅ TUZATILDI · 5% xizmat haqi YAGONA MANBADAN olinmaydi
CLAUDE.md: *"`lib/fees.ts` — YAGONA MANBA … Landing, FAQ va yordam maqolalari
va'da qilgan 5% aynan shu yerdan hisoblanadi."*

Amalda `PLATFORM_FEE_PERCENT` faqat `daromad/page.tsx` da ishlatiladi. 5% raqami
**qattiq yozilgan**:
- `app/page.tsx:831` — `<div className="val">5%</div>`
- `lib/faq-content.ts:147–151` (uz/ru/en)
- `lib/help-articles.ts:122, 128, 134` (uz/ru/en)
- `lib/i18n/dictionary.ts:1975` va `lib/i18n/en.ts:1257` (`a5` kaliti)

Foizni o'zgartirsangiz — hisob-kitob o'zgaradi, va'dalar esa eski qoladi.

### 4.5 ✅ TUZATILDI · CLAUDE.md eskirgan ma'lumotlar
| Da'vo | Haqiqat |
|---|---|
| "server kodi, API route, `process.env` yo'q — 100% client-side" | `app/api/support/route.ts` bor (`runtime = "nodejs"`, `process.env` ishlatadi) |
| To'lov usullari: "Bank kartasi / Mahalliy hamyon (Payme/Click/Kaspi)" | Kodda 3 ta variant: karta / Click / Payme. `pay.localOption`, `pay.localHint` kalitlari o'lik |
| `lib/currency.ts` "butunlay olib tashlandi" | To'g'ri, lekin git status'da hali `D` holatida (commit qilinmagan) |

### 4.6 ✅ TUZATILDI · Validatsiya qatlamidagi teshiklar
- `hireProposal` (`lib/mock-api/index.ts`) — `dueDate` `text()`/sana
  tekshiruvidan **o'tmaydi**, xom holda saqlanadi. CLAUDE.md esa barcha
  `hireProposal` yozuvlari validatsiyadan o'tadi deydi.
- `app/xaridor/elonlarim/[id]/page.tsx:159` — `new Date(job.deadline).toISOString()`
  noto'g'ri sana bo'lsa `RangeError` tashlaydi va **butun sahifa error boundary'ga
  yiqiladi**.
- `getReviewByContract` egalik tekshiruvisiz — istalgan shartnoma id bo'yicha
  sharh o'qish mumkin.

### 4.7 ✅ TUZATILDI · `cancelContract` da amallar tartibi xavfli
`lib/mock-api/index.ts:886` — `creditBalance(...)` `assertTransition(...)` dan
**oldin** chaqiriladi. Hozircha holat mashinasi ikkala rolga ham ruxsat bergani
uchun muammo chiqmaydi, lekin qoida qattiqlashtirilsa: balans to'ldiriladi,
shartnoma esa bekor qilinmaydi → pul ikkilanadi.

### 4.8 ✅ TUZATILDI · Mayda kod muammolari
- `app/mutaxassis/sozlamalar/page.tsx:179` — portfolio id `pf-${Date.now()}`
  (loyihaning qolgan qismi `crypto.randomUUID` ishlatadi; bir millisekundda
  qo'shilsa to'qnashadi).
- `acceptOffer` — xabarlar `offer.id` dan `contract.id` ga ko'chiriladi, lekin
  `sb2_thread_reads` ko'chirilmaydi → "o'qilmagan" belgisi noto'g'ri chiqadi.
- `app/mutaxassis/xabarlar/page.tsx` — har bir taklif uchun alohida
  `messagesService.list()` (N+1); bittasi yiqilsa butun sahifa xato ko'rsatadi.
- `components/shared/NotificationBell.tsx` — `panelRef` e'lon qilingan, lekin
  ishlatilmaydi (o'lik).
- `lib/i18n/en.ts:1276` — `foot_contact_us` kaliti hech qayerda ishlatilmaydi.
- `next.config.mjs` CSP `font-src 'self'` vs `netlify.toml` da Google Fonts
  ruxsati — shriftlar `@fontsource` orqali lokal, ya'ni `netlify.toml` dagi
  ruxsat ortiqcha va ikki fayl bir-biriga mos emas.
- `app/mutaxassis/ish-elonlari/[id]/taklif/page.tsx:150–151` — qoplama xat maydonida
  `placeholder` va `hint` **bir xil matn**.
- Ikkala `TopNav` da `refresh()` funksiyasi `DATA_CHANGED_EVENT` ga obuna
  bo'lmaydi → ism o'zgartirilsa avatar harflari sahifa yangilanmaguncha eski qoladi.

---

## 5. Yaxshi ishlangan joylar

Bularni buzib qo'ymaslik uchun alohida qayd etaman:

- **Xato holatlari qatlami** — `ApiError` taksonomiyasi + `ErrorState` (kod bo'yicha
  matn tanlash + `retryable`) juda puxta. Faqat ikki joyda qo'llanmagan (1.7, 2.9).
- **i18n intizomi** — 1240 kalit, uch tilda **bitta ham bo'shliq yo'q**. Bu
  kamdan-kam uchraydi.
- **Egalik tekshiruvlari** mock qatlamida izchil (`sellerId`/`buyerId`/`assertOwnCard`).
- **Holat mashinalari** (`state-machines.ts`) — o'tishlar aktyor bilan birga
  e'lon qilingan, bu keyinchalik backend'ga ko'chirish uchun tayyor asos.
- **Seed sanalarini avtomatik siljitish** (`ensureSeed`) — demo hech qachon
  eskirmaydi, o'ylangan yechim.
- **Xaridor taklif tafsiloti sahifasi** (`/xaridor/takliflarim/[id]`) — to'rt
  holatning har biri uchun tushuntirish + keyingi qadam. Mutaxassis tomoni uchun
  aynan shu namuna sifatida olinishi kerak.
- **Karta xavfsizligi** — to'liq raqam saqlanmaydi, prefiks bo'yicha tur aniqlash,
  muddat tekshiruvi.
- **Responsive** — 360px da birorta sahifada gorizontal skroll yo'q (tekshirildi).

---

## 6. Tavsiya etilgan tuzatish tartibi

**1-to'lqin — buzilgan funksiyalar (yarim kun):**
1.1 karta modali · 1.2 qoralama chop etish · 1.4 rol-tanlash · 2.10 kirish xatosi ·
2.9 `catch` siz funksiyalar · 2.13 mobil menyu

**2-to'lqin — pul va ishonch (yarim kun):**
1.5 jami sarflangan · 1.3 parolni tiklash · 2.6 nizodagi escrow · 1.7 workroom
xato holati · 2.1 noto'g'ri matn · 2.2 quvur bosqichi · 2.15 eksportdagi parol

**3-to'lqin — boshi berk oqimlar (1 kun):**
1.6 nizo · 2.3 + 2.4 taklif holatlari · 2.5 topshirish rassinxroni · 2.7
kategoriyalar · 2.11 suhbat kanali · 2.12 summa ogohlantirishi · 2.16 o'lik
sahifalar · 2.17 support env

**4-to'lqin — a11y va matn (1 kun):**
3.1–3.13 to'liq blok (aksariyati bir qatorlik tuzatish)

**5-to'lqin — tizim tozaligi:**
4.1 `text-3xs` · 4.2 `Button.tone` · 4.4 5% yagona manba · 4.5 CLAUDE.md
yangilash · 4.6 validatsiya teshiklari

---

*Hisobot 2026-09-04 da `96cc120` commit'i bo'yicha tayyorlandi.*
