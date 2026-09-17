# Full Product UI QA Matrix — Bosqich 24

Generated from a full-repository route/control inventory (not assumed from prior
tests). Source of truth: `app/**/page.tsx` (74 routes), `components/**`,
`lib/api/client.ts` / `lib/api/admin.ts` (service-availability boundary),
`tests/e2e/*.spec.ts` (cross-referenced against actual test bodies, not names).

**Status legend**
- `PASS (E2E)` — exercised by a real Playwright test against real backend/DB/Redis.
- `PASS (STATIC)` — verified by direct source-code audit (guard logic, validation
  rules, absence of dead/mutation controls); no dedicated browser test, but the
  page has no reachable interactive control that isn't already covered by a
  shared component's own E2E coverage, or the page is non-interactive/read-only.
- `OUT_OF_SCOPE_FEATURE_GAP` — the page's controls are wired to backend service
  calls that are `disabled()`/`disabledAsync` (Bosqich 17 mock→real migration
  never reached this feature area — Job/Proposal/Offer/Messages, KYC
  verification, service/review/appeals/reports moderation, categories CRUD,
  support tickets, staff account management). The route renders a graceful,
  non-crashing `<ErrorState>` (confirmed, no raw stack trace/Prisma error).
  Building the missing backend is out of scope for a QA/bugfix phase (would be
  "inventing a new business feature"); marked here, not silently ignored.
- `N/A` — not applicable (e.g. static legal page with no controls) with reason
  given inline.

No row in this document is `UNKNOWN`.

---

## 1. Inventory summary (programmatically derived)

- Production `page.tsx` routes discovered: **74** (`find app -name page.tsx`)
- Route groups: Public/Auth (17), Buyer/xaridor (19), Seller/mutaxassis (19),
  Admin (20, shared by Rahbariyat — see §1.1), global (`not-found`, `error`),
  1 API route handler (`app/api/support/route.ts`).
- Playwright spec files: 8 (`admin`, `auth`, `buyer-marketplace`, `disputes`,
  `logout` **new**, `purchase-lifecycle`, `seller-application`,
  `seller-services`) — **50 tests total** after this phase (was 46).
- Routes with dedicated E2E coverage: 26 (see per-panel tables).
- Routes verified `PASS (STATIC)` (guard/validation audited, no live click
  test): 21.
- Routes `OUT_OF_SCOPE_FEATURE_GAP` (disabled backend service, pre-existing):
  27 (7 buyer + 7 seller + 10 admin + 1 shared specialist-profile + 2 legal —
  see breakdown per panel; some routes are double-counted across panels
  where a shared component is reused, e.g. `/xaridor/verifikatsiya` and
  `/mutaxassis/verifikatsiya` both hit the same disabled `verificationService`).
- Routes `N/A` (static, no controls beyond nav chrome): 6
  (`/maxfiylik`, `/oferta`, `/shartlar`, `/not-found`, `/error`, `/tolov/natija`).
- **Routes untested (no dedicated Playwright assertion) that ARE fully
  functional (real backend) and therefore represent a genuine coverage gap,
  not a feature gap:** see "Known coverage gaps" at the end of each panel
  section. These are documented, not silently dropped.

### 1.1 Rahbariyat clarification
`app/rahbariyat/kirish/page.tsx` is a login page only (`AdminLoginForm
role="super_admin"`); on success it `router.replace("/admin")` — there is
**no separate Rahbariyat page tree**. All "Rahbariyat" routes are therefore
the same 20 `/admin/*` routes, reached via a different login gate. The
Rahbariyat section below documents the login gate specifically; the route
table is the Admin table.

---

## 2. PUBLIC / AUTH

| Route | Auth | Key controls | API | Playwright | Status |
|---|---|---|---|---|---|
| `/` (landing) | none | lang capsule, 8 category cards, escrow calculator (client-only), FAQ accordion, Support modal, footer legal links, **"Ish topish" CTA (×2)** | none (SupportModal → `POST /api/support`) | No dedicated test | `PASS (STATIC)` — **1 bug found & fixed this phase**: both "Ish topish" CTAs pointed to the dead `/mutaxassis/ish-elonlari` route; repointed to `/kirish?tab=register&role=mutaxassis` (the actual working "become a specialist" path). A pre-existing `display:none` dead link ("Barchasi →" in the portfolio marquee) was left in place — it has zero user reach (no CSS makes it visible), documented here as a cleanup candidate, not fixed (zero functional impact). |
| `/kirish` | guest-preferred | phone+password login, "Parolni unutdingizmi?", "Ro'yxatdan o'tish" | `POST /auth/login` | `PASS (E2E)` — `auth.spec.ts` (5 tests: render, valid login, wrong password/phone, register-then-login, forgot-password roundtrip) + `logout.spec.ts` (3 tests, land here post-logout) | `PASS (E2E)` |
| `/royxatdan-otish` | guest-preferred | phone input, "Kod yuborish" | `POST /auth/register/request-otp` | `PASS (E2E)` — `auth.spec.ts` register/dev-otp tests | `PASS (E2E)` |
| `/royxatdan-otish/tasdiqlash` | guest-preferred + sessionStorage phone | OTP input (6-digit, digit-strip, maxLength), dev-OTP box, resend | `POST /auth/register/verify-otp`, resend | `PASS (E2E)` — 5 format tests + 2 error-mapping tests + dev-otp test | `PASS (E2E)` |
| `/royxatdan-otish/parol` | guest-preferred + sessionStorage token | password + confirm | `POST /auth/register/complete` | `PASS (E2E)` | `PASS (E2E)` |
| `/parolni-unutdim` | none (redirects away if session) | phone input | `POST /auth/password-reset/request-otp` | `PASS (E2E)` | `PASS (E2E)` |
| `/parolni-unutdim/tasdiqlash` | + sessionStorage phone | OTP input | `POST /auth/password-reset/verify-otp` | `PASS (E2E)` | `PASS (E2E)` |
| `/parolni-unutdim/parol` | + sessionStorage token | new password + confirm | `POST /auth/password-reset/complete` | `PASS (E2E)` | `PASS (E2E)` |
| `/rol-tanlash` | session required | "Men mutaxassisman" / "Men xaridorman" | `POST /me/roles/choose` | `PASS (E2E)` — Xaridor branch: `auth.spec.ts`; **Mutaxassis branch: `seller-application.spec.ts` test 1** (`chooseRole(page, "Mutaxassis")`) | `PASS (E2E)` (both branches, confirmed across two spec files) |
| `/maxfiylik`, `/oferta`, `/shartlar` | none | static `LegalPage`, lang switch, footer mailto | none | No test | `N/A` — pure static content, no forms/mutations. **Minor finding**: date stamp "29.07.2026" is hardcoded, not derived — will silently go stale; documented, not fixed (cosmetic, zero functional risk). |
| `/savol-javob` | none | search, category filter, accordion, Support modal | none (client-side filter) | No test | `PASS (STATIC)` — pure client-side array filter, no backend call to fail; Support modal covered under shared-component audit below. |
| `/yordam-markazi`, `/yordam-markazi/[slug]` | none | search, category filter, article list/detail, related articles | none | No test | `PASS (STATIC)` — same as above; unknown slug renders inline `EmptyState` (200, not a crash) — verified in source. |
| `/tolov/natija` | none | 2 static links | none — **by design ignores all query params** (verified in source; do not assume `?status=` drives content) | No test | `N/A` — static redirect hub, no logic to test. |
| `/not-found` | none | "Bosh sahifaga" link | none | No test | `PASS (STATIC)` — confirmed Next.js renders this (not a framework stack trace) for unknown routes; verified by direct source read. |
| `/error` (boundary) | none | "Qayta urinish" (calls Next `reset()`), "Bosh sahifaga" | none (`console.error` only — no Sentry-equivalent sink; documented pre-existing gap, not introduced this phase) | No test | `PASS (STATIC)` |
| `POST /api/support` | none (rate-limited 5/10min/IP) | — (server route) | Telegram Bot API forward | No test | `PASS (STATIC)` — validated: category enum, message 10–2000 chars, contact required for guests, fails closed (500) if Telegram env vars unset rather than faking success. |

**Shared components used across this section (audited once, not per-page):**
`SupportModal` — validates category/message(10–2000)/guest name+contact;
auto-suppressed on `/admin*`/`/rahbariyat*`. `CountryPhoneInput` — per-country
digit-length validation (UZ/KZ/KG/TJ/TM/other), only default UZ path is
E2E-exercised. `LangSwitch` — pure client state, uz/ru/en, no dedicated test
anywhere in the app (see §9).

**Known coverage gaps (real backend, not yet E2E-asserted):**
phone-format validation error text, password-rules/mismatch error text,
`ACCOUNT_BLOCKED`/`ACCOUNT_SUSPENDED` login branch, `TOKEN_EXPIRED` branches on
the two password-completion pages, `CountryPhoneInput`'s non-UZ country
options, `LangSwitch` toggle behavior anywhere in the app.

---

## 3. BUYER / XARIDOR

**Layout guard** (`app/xaridor/layout.tsx`, audited): no session → `/kirish`;
wrong role → `/mutaxassis` or `/rol-tanlash`; renders `null` until ready (no
flash of protected content).

**TopNav** (`components/xaridor/TopNav.tsx`): Dashboard, Bozor, Shartnomalar,
Yordam, Settings-avatar. **Fixed this phase**: added a persistent "Chiqish"
control (desktop + mobile) — previously logout was reachable only by opening
Settings and scrolling to the bottom ("Hisob" tab), which failed the
"obvious logout" requirement audited in §9/§13.

| Route | Controls (summary) | API | Playwright | Status |
|---|---|---|---|---|
| `/xaridor` (dashboard) | action-center rows + "Mablag'lash", "Barchasini ko'rish", recent-contracts list, help teaser | `contractsService.list`, `milestonesService.listMine`, `usersService.getCurrent` (all real) | `PASS (E2E)` — `buyer-marketplace.spec.ts`, `logout.spec.ts` | `PASS (E2E)` |
| `/xaridor/bozor` | search, category select, price min/max, delivery select, sort select, clear-filters, pagination(12/page), service cards | `servicesService.listPublic` (real) | `PASS (E2E)` — load + 1 category-filter click (`buyer-marketplace.spec.ts`) | `PASS (E2E)` load; **gap**: search/price/delivery/sort/pagination/URL-sync not individually click-tested (see gaps below) |
| `/xaridor/bozor/mutaxassis/[id]` | portfolio lightbox, rating filter chips, "Taklif yuborish" | `catalogService.getSpecialist` **[disabled]** | No test (page always errors) | `OUT_OF_SCOPE_FEATURE_GAP` |
| `/xaridor/bozor/xizmat/[id]` | buy modal (milestone rows, sum validator, deadline) | `servicesService.get`, `contractsService.create` (real, idempotency key) | `PASS (E2E)` — `purchase-lifecycle.spec.ts`, `disputes.spec.ts` | `PASS (E2E)` |
| `/xaridor/elonlarim` (+`yangi`,`[id]`,`suhbat`,`yollash`) — 5 routes | job-post wizard, proposal inbox, hire flow | `jobsService`/`proposalsService` **[all disabled]** | No test (always errors / never completes) | `OUT_OF_SCOPE_FEATURE_GAP` — "B yo'l" (Job/Proposal marketplace path) never migrated to real backend; confirmed no nav entry either (TopNav deliberately omits these). |
| `/xaridor/takliflarim`, `/xaridor/takliflarim/[id]` | sent-offers list, chat, withdraw | `offersService` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` |
| `/xaridor/xabarlar` | thread list | `messagesService` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` |
| `/xaridor/shartnomalar` | tabs, table/mobile-card, row-click | `contractsService.list`, `milestonesService.listMine` (real) | `PASS (E2E)` — implicit via workroom tests navigating through it | `PASS (E2E)` |
| `/xaridor/shartnomalar/[id]` | fund/pay (+ polling states), accept/revision-request milestone modals, receipt modal, dispute open/withdraw, cancel | all real | `PASS (E2E)` — `purchase-lifecycle.spec.ts` (fund→accept→complete), `disputes.spec.ts` (open→withdraw, Idempotency-Key regression) | `PASS (E2E)` core path; **gap**: revision-request path, contract-cancel, receipt-modal print not individually tested |
| `/xaridor/verifikatsiya` | KYC form | `verificationService` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` |
| `/xaridor/xarajatlar` | stat cards, table, receipt modal | `milestonesService.listMine`, `contractsService.list` (real) | `PASS (E2E)` — explicit regression test asserting no permanent ErrorState (this page was previously always-broken before a prior phase's fix; test guards the regression) | `PASS (E2E)` |
| `/xaridor/sozlamalar` | 4 reachable tabs (Profil/Xavfsizlik/Sozlamalar/Hisob incl. logout); 2 **dead/unreachable** tabs (Billing, Notifications — built but not in nav whitelist) | `usersService.*` (real), `paymentsService.getCards` **[disabled, caught→[]]** | `PASS (E2E)` — load-only smoke test (`buyer-marketplace.spec.ts`); logout button now also covered (`logout.spec.ts`) | `PASS (E2E)` load+logout; **finding, not fixed**: Billing/Notifications tabs are fully built React code with no route to them (not in `navTabs` or `?tab=` whitelist) — since their own backing calls (`paymentsService.addCard`/`removeCard`, notification prefs save) are also disabled, hiding them is **already correct behavior**, not a bug — documented for product awareness only. Currency picker (UZS/USD) in Preferences is inert (no persistence call) — minor, documented, not fixed this phase (would need either backend FX work or a UI-only removal; low severity, out of the bug-fix budget for this pass). |

**Known coverage gaps (real backend, not yet E2E-asserted):**
marketplace search/price/delivery/sort/pagination controls beyond one
category click; contract-workroom revision-request/cancel/receipt-print;
Settings profile-save/avatar-upload/password-change/preferences-save flows
(only page-load is smoke-tested).

---

## 4. SELLER / MUTAXASSIS

**Layout guard** (`app/mutaxassis/layout.tsx`, audited): no session → `/kirish`;
wrong role → `/xaridor`/`/rol-tanlash`; `!profileDone` → forced to
`/mutaxassis/royxat`. **No `sellerStatus` gate at the layout level** — a
PENDING/REJECTED seller can still browse Services/Contracts/Earnings; only
`/mutaxassis/royxat` itself branches on application status (this is correct
per this phase's seller-application lifecycle fix — see prior commit `db3ba6b`).

**TopNav** (`components/mutaxassis/TopNav.tsx`): Dashboard, Xizmatlarim,
Shartnomalar, Daromad, Yordam, Settings-avatar. **Fixed this phase**: same
persistent "Chiqish" addition as buyer TopNav.

| Route | Controls (summary) | API | Playwright | Status |
|---|---|---|---|---|
| `/mutaxassis` (dashboard) | reapply link (if rejected), stat cards (read-only), recent-contracts | `contractsService.list`, `milestonesService.listMine`, `servicesService.listMine`, `usersService.getCurrent`, `sellerApplicationService.getCurrent` (all real) | `PASS (E2E)` — `seller-services.spec.ts`, `seller-application.spec.ts` (dashboard CTA), `logout.spec.ts` | `PASS (E2E)` |
| `/mutaxassis/royxat` | full 4-state application lifecycle (see commit `db3ba6b` this session) | `sellerApplicationService.*`, `usersService.updateName`, `authService.refresh` (all real) | `PASS (E2E)` — **8 dedicated tests**, `seller-application.spec.ts` (fresh→pending→refresh→multi-tab-race→admin-reject→reapply→admin-approve→approved-blocks-reapply) | `PASS (E2E)` — most thoroughly tested route in the app |
| `/mutaxassis/ish-elonlari` (+`[id]`,`taklif`) — 3 routes | job browse/detail/apply | `jobsService`/`proposalsService` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` — also **fixed this phase**: the only real, discoverable entry point (landing page "Ish topish" CTA) was repointed away from this dead route; the route itself is correctly absent from TopNav already. |
| `/mutaxassis/takliflarim` (+`[id]`,`kelgan/[id]`) — 3 routes | proposal/offer inbox, accept/decline, chat | `proposalsService`/`offersService` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` |
| `/mutaxassis/xabarlar` | thread list | `messagesService` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` |
| `/mutaxassis/shartnomalar` | tabs, table/mobile-card | `contractsService.list`, `milestonesService.listMine` (real) | `PASS (E2E)` — implicit (dashboard link-through); no dedicated filter/tab test | `PASS (E2E)` load; gap: tab filters untested |
| `/mutaxassis/shartnomalar/[id]` | accept/reject contract, submit/resubmit milestone, receipt modal, dispute summary | all real | `PASS (E2E)` — `purchase-lifecycle.spec.ts` (seller side: accept, fund-confirm, submit milestone), `disputes.spec.ts` (seller sees dispute) | `PASS (E2E)` core path; gap: revision-requested resubmit, receipt modal untested |
| `/mutaxassis/xizmatlarim` | tabs, pause/resume/archive/submit-for-review buttons | `servicesService.*` (real) | `PASS (E2E)` — load only (`seller-services.spec.ts`) | `PASS (E2E)` load; **gap**: pause/resume/archive/submit action buttons not individually clicked (only the create-wizard's own "submit for review" is tested via the new-service flow) |
| `/mutaxassis/xizmatlarim/[id]` (edit) | `ServiceWizard` in edit mode | `servicesService.get` (real) | No dedicated test | `PASS (STATIC)` — shares `ServiceWizard` component, which IS E2E-tested via the "new service" flow; edit-mode ownership guard (`sellerId === myId`) verified in source. |
| `/mutaxassis/xizmatlarim/yangi` | 4-step wizard (category/title-desc/price-delivery/review), draft autosave | `servicesService.create/update/submit` (real) | `PASS (E2E)` — full happy path, `seller-services.spec.ts` | `PASS (E2E)`; gap: draft-save path (vs. publish), validation-error paths untested |
| `/mutaxassis/daromad` | 3 read-only stat cards, payments table, receipt modal, monthly chart | `milestonesService.listMine`, `contractsService.list`, `paymentsService.getBalance` (all real) | No test | `PASS (STATIC)` — **explicitly audited for no editable balance/payout input anywhere**: confirmed every monetary figure across Dashboard/Daromad/Profil/Shartnomalar is static `<p>`/`<span>` text; no "withdraw" control exists (matches `PAYOUTS_ENABLED=false` by design, not a bug). |
| `/mutaxassis/sozlamalar` | 9 tabs, all reachable via nav + `?tab=` | mix of real (profile/skills/portfolio/availability/notifications/logout) and disabled (`paymentsService.getCards`, caught→`[]`) | `PASS (E2E)` — load-only smoke test + logout (`logout.spec.ts`) | `PASS (E2E)` load+logout; gap: the other 8 tabs' save/validation logic untested |
| `/mutaxassis/profil` | read-only public-profile preview | `usersService.*`, `servicesService.listMine`, `reviewsService.listMine` **[stub, always `[]`]** | No test | `PASS (STATIC)` — read-only page, only 2 controls (edit link, portfolio lightbox), both trivial/non-mutating. **Finding**: Reviews section can never show real data platform-wide (`reviewsService.create` also disabled) — pre-existing, documented, not a regression. |
| `/mutaxassis/verifikatsiya` | KYC form (shared `VerificationCenter`) | `verificationService` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` |
| `/mutaxassis/yordam` | ticket form + list (shared `HelpCenter`) | `supportService` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` |

**Minor finding, not fixed:** `ServiceCard`'s archive-button visibility
condition (`active|paused|draft`) excludes `rejected` — a rejected service can
be re-edited/resubmitted but not archived from the list. Low severity
(workaround exists via edit→resubmit), flagged for product/dev follow-up
rather than fixed blind in a QA pass (changing state-machine button
visibility without product confirmation risks second-guessing an intentional
design choice).

**Known coverage gaps (real backend, not yet E2E-asserted):**
contracts-list tab filters; service pause/resume/archive/submit-for-review
buttons (list-level, not wizard-level); Daromad page interactions; Profil,
Verifikatsiya(N/A), Yordam pages; 8 of 9 Sozlamalar tabs' actual save logic.

---

## 5. ADMIN (also reached via Rahbariyat super_admin login)

**Layout guard** (`app/admin/layout.tsx`, audited): no session → `/rahbariyat/kirish`
(if under `/admin/super`) or `/admin/kirish`; `mustChangePassword` hard gate
(all routes except the change-password page itself); `/admin/super/*` requires
`role==="super_admin"`; every other route requires its mapped
`AdminPermission` (`routePermission()` — full map verified in source and
reproduced below).

**Sidebar** (real nav, permission-gated): Boshqaruv Paneli, Foydalanuvchilar,
Shartnomalar, Nizolar & Arbitraj, To'lovlar/Qaytarish/Chiqarish, Audit
Jurnali, (super_admin) ~~Adminlar & Rollar~~ **removed this phase** (see
finding below).

| Route | Permission | Controls (summary) | API | Playwright | Status |
|---|---|---|---|---|---|
| `/admin` (dashboard) | `dashboard` | 2 nav cards, audit-log preview | `getAdminCounters` (partial-real, see finding), `staffListAuditLogs` (real) | `PASS (E2E)` | `PASS (E2E)` |
| `/admin/kirish` | pre-auth | email/password, MFA/TOTP swap-in | `adminLogin` (real) | `PASS (E2E)` — implicit via `staffLogin` helper in every admin test + dedicated permission/mustChangePassword tests | `PASS (E2E)` |
| `/admin/parolni-almashtirish` | special-cased | current/new/confirm password | `staffChangePassword` (real) | `PASS (E2E)` — `mustChangePassword hard gate` test | `PASS (E2E)` |
| `/admin/ruxsat-yoq` | none | static 403 + link home | none | `PASS (E2E)` — `ruxsat testi` test asserts this exact page | `PASS (E2E)` |
| `/admin/foydalanuvchilar` | `users` | filters, search, table, detail modal, activate/suspend/block (+reason modal), pagination | `staffListUsers/GetUser/Suspend/Block/Reactivate` (all real) | `PASS (E2E)` — load + row-data assertion | `PASS (E2E)` load; gap: block/suspend/reactivate action buttons not clicked in E2E |
| `/admin/shartnomalar` | `orders` | filters, table, **read-only** detail modal (no mutation buttons — by design) | `staffListContracts/GetContract` (real) | `PASS (E2E)` — load + row-data assertion | `PASS (E2E)` |
| `/admin/tolovlar` | `payments` | 4 tabs, refund-create modal (amount server-derived, not admin-entered), payouts tab (static kill-switch banner) | `staffListPayments/Refunds/Payouts/LedgerTransactions`, `staffCreateRefund` (all real, Idempotency-Key) | `PASS (E2E)` — load + full refund-create flow + explicit "no unsafe mutation button" regression test | `PASS (E2E)` — **financial-safety-critical, most rigorously tested admin route** |
| `/admin/nizolar` | `disputes` | filters, table, review-start/resolve/reject (amount-split validated against escrowed total) | `staffListDisputes/GetDispute/StartReview/Resolve/Reject` (real, Idempotency-Key) | `PASS (E2E)` — full resolve flow + Idempotency-Key regression test | `PASS (E2E)` |
| `/admin/audit` | `audit` | filters (action/resource-type), read-only table | `staffListAuditLogs` (real) | `PASS (E2E)` | `PASS (E2E)` |
| `/admin/loyihalar` | `jobs` | filters, table, force-close modal | `listJobsQueue`/`closeJobAsAdmin`/`findJobById` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` — not sidebar-linked (URL-only). |
| `/admin/xizmatlar` | `services` | filters, table, approve/pause, violation-flag modal | `listServicesQueue`/`findServiceById`/`setServiceStatus` **[disabled]** | `PASS (E2E)` — **explicit regression test asserting the graceful (no-console-error) ErrorState is the correct, expected behavior** | `OUT_OF_SCOPE_FEATURE_GAP` (with a test guarding it degrades safely) |
| `/admin/verifikatsiya` | `kyc` | filters, table, detail modal **renders raw ID/passport images** | `listVerificationsQueue`/`findVerificationByUserId`/`adminModerate` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` — **PII-handling note for when re-enabled**: confirmed access is already scoped behind the `kyc` permission; no additional exposure today since the page cannot load data. |
| `/admin/kategoriyalar` | `categories` | filters, table, create/edit modal | `getAdminData`/`saveCategory`/`toggleCategoryActive` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` — minor UI polish finding (create button visible even in ErrorState) documented, not fixed (page is non-functional regardless; low marginal value). |
| `/admin/sharhlar` | `reviews` | filters, table, delete-review modal | `listReviewsQueue`/`deleteReview` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` |
| `/admin/fikrlar` | `support` | search/type/status filters, table, detail modal, note+resolve | **`lib/feedback.ts` — pure `localStorage`, not `lib/api/admin.ts`** | No test | `PASS (STATIC)` (doesn't crash) but **data-integrity finding**: per-browser only, never server-synced — real user feedback submitted on the live site never reaches this queue on another admin's machine/session. Documented, not fixed (would require a new backend table — out of scope). Also uses native `window.confirm()` instead of the app's `DangerousActionModal` pattern (inconsistent, cosmetic). |
| `/admin/shikoyatlar` | `reports` | filters, table, sanction/dismiss modal | `listReportsQueue`/`updateTrustReport` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` |
| `/admin/apellyatsiyalar` | `appeals` | filters, table, unsuspend/uphold modal | `listAppealsQueue`/`handleUserAppeal` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` |
| `/admin/sozlamalar` | `settings` | per-setting toggle/input, auto-save | `getAdminData`/`updatePlatformSetting` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` |
| `/admin/super/adminlar` | `admins` + super_admin | staff CRUD, permission checkboxes | `getAdminAccounts`/`addAdmin`/`setAdminActive`/`updateAdminAccount` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` — **P0 finding, fixed this phase**: this was the *only* broken admin route still linked from the sidebar (super_admin nav) — a real user clicking a real, visible nav item always hit a dead page. Sidebar link removed (same established pattern already used by buyer/seller TopNav for their own not-yet-migrated feature areas); the route itself is left in place (direct-URL access still shows the existing graceful `ErrorState`). |
| `/admin/yordam` | `support` | filters, table, reply/close-with-reason | `listTicketsQueue`/`findTicketById`/`replyToTicket`/`adminModerate`/`getTicketConversation` **[disabled]** | No test | `OUT_OF_SCOPE_FEATURE_GAP` |

**Route → permission map** (verified in source, `routePermission()`):
`/admin`→`dashboard`, `/admin/foydalanuvchilar`→`users`, `/admin/xizmatlar`→`services`,
`/admin/loyihalar`→`jobs`, `/admin/shartnomalar`→`orders`, `/admin/verifikatsiya`→`kyc`,
`/admin/nizolar`→`disputes`, `/admin/shikoyatlar`→`reports`, `/admin/apellyatsiyalar`→`appeals`,
`/admin/sharhlar`→`reviews`, `/admin/tolovlar`→`payments`, `/admin/yordam`→`support`,
`/admin/fikrlar`→`support`, `/admin/kategoriyalar`→`categories`, `/admin/sozlamalar`→`settings`,
`/admin/audit`→`audit`, `/admin/super/adminlar`→`admins` (+ role check).

**Financial/ledger safety audit (§26/§27 of the task):** confirmed **zero**
direct-edit controls for ledger/financial state anywhere in the admin panel —
refund amounts are server-derived from the contract (not admin-typed), the
payments/ledger/payouts tabs are pure read-only tables, dispute award amounts
are hard-validated to sum exactly to the escrowed amount. Matches the
dedicated `admin.spec.ts` regression test that asserts specific dangerous
button patterns (`/mark.*succeeded/i`, `/edit ledger/i`, etc.) are absent.

**Sensitive-data audit:** no plaintext passwords/OTP/tokens/TOTP secrets
rendered anywhere. One plaintext-password *input* exists (temp password when
creating a new admin, `type="password"`, never echoed back) — this is the
`/admin/super/adminlar` page, currently unreachable via the (now-removed)
nav link and non-functional regardless (disabled backend).

**AdminGlobalSearch (⌘K):** present on every admin page's header; its backing
call (`adminGlobalSearch`) is also disabled — it silently returns empty
results for every query rather than erroring. Documented as a known,
non-crashing gap; not hidden/removed this phase (empty-results is an
acceptable, non-misleading state for a search box, unlike a full-page dead
end — lower priority than the two fixed dead-CTA bugs above).

---

## 6. RAHBARIYAT

Confirmed (§1.1) to be the identical `/admin/*` route tree, reached via a
distinct login gate (`/rahbariyat/kirish`, `role="super_admin"`). All
controls/permissions/logout behavior are therefore identical to §5.
`admin.spec.ts`'s `staffLogin(..., "rahbariyat")` helper and this phase's
`logout.spec.ts` admin test both authenticate through this exact gate — not
merely assumed to inherit Admin coverage.

---

## 7. LOGOUT MATRIX (§68 of the task)

| Panel | Button exists | API/session | Redirect | Back-button protection | Direct-route protection | Refresh after logout |
|---|---|---|---|---|---|---|
| Buyer | **Fixed this phase** — now in TopNav header (was Settings-only) | `POST /auth/logout` (best-effort) + local `bd_session` clear | `/kirish` | `PASS (E2E)` — verified `goBack()` lands back on `/kirish` (layout re-redirects) | `PASS (E2E)` — direct nav to `/xaridor` redirects to `/kirish` | `PASS (E2E)` |
| Seller | **Fixed this phase** — same TopNav pattern | same | `/kirish` | `PASS (E2E)` | `PASS (E2E)` | `PASS (E2E)` |
| Admin | Pre-existing, sidebar footer + mobile drawer | local `bd_staff_session`/`bd_staff_account` clear (staff auth is a fully separate token/cookie system from marketplace, confirmed in source) | `/rahbariyat/kirish` (super_admin) or `/admin/kirish` | `router.replace()` used (not `push`) — **stronger** than back-then-redirect: no protected history entry remains at all; verified via direct-URL re-check instead (see code comment in `logout.spec.ts`) | `PASS (E2E)` | Implied by direct-route protection test (same mechanism) |
| Rahbariyat | Same as Admin (identical route tree) | Same | Same | Same | `PASS (E2E)` — exercised via the same admin logout test (login gate was `/rahbariyat/kirish`) | Same |

All 3 physical logout mechanisms (marketplace, staff) confirmed to use
**separate auth systems** with separate localStorage keys (`bd_session` vs
`bd_staff_session`/`bd_staff_account`) — verified in source
(`lib/api/http.ts` vs `lib/api/staff-http.ts`), matching the architecture's
documented intent ("xodim va bozor sessiyasi mustaqil").

---

## 8. SECURITY / STORAGE / HYGIENE AUDITS (static, this phase)

- **Hardcoded `localhost`/`127.0.0.1` in production source:** none found
  (`grep -rn "localhost\|127.0.0.1" app lib components`) — the one match is a
  comment, not a code path; `API_BASE` is fully env-driven
  (`NEXT_PUBLIC_API_URL`, no localhost fallback). **PASS.**
- **Mock/fake/dummy business data reachable from production pages:** none —
  `lib/mock-api` is not imported by any `app/` page (0 matches); all
  `mock`/`fake`/`dummy` string hits in `app/` are either migration-history
  comments or the legitimate `fake_profile` complaint-category enum value
  (`app/admin/shikoyatlar/page.tsx`). **PASS.**
- **localStorage/sessionStorage inventory** (every key found, full list):
  - `bd_session` — marketplace session snapshot `{userId, role, profileDone,
    verified}` — **no token**.
  - `bd_staff_session` — `{adminId, role, expiresAt}` — **no token**.
  - `bd_staff_account` — `AdminAccount` shape (id/name/email/role/permissions/
    flags) — **no password/token**.
  - `sb2_admin_session`, and the rest of `lib/admin-api.ts`'s keys — confirmed
    **dead code**, not imported by any `app/` page directly; reachable only
    through `lib/api/admin.ts`'s explicit `adminMock` wrapper for the
    still-not-migrated feature areas listed in §5 (consistent with those
    routes already being `OUT_OF_SCOPE_FEATURE_GAP`). Its `AdminSession` type
    is `{adminId, role, expiresAt}` — no secret, even if written.
  - `sb_lang` — UI language preference, benign.
  - Auth-flow `sessionStorage` keys (`bd_register_otp_phone`,
    `bd_registration_token`, `bd_reset_otp_phone`, `bd_reset_token`,
    `bd_prefill_phone`) — the two `*_token` values are opaque, single-use,
    10-minute-TTL grant tokens (not JWTs, not passwords) — this exact design
    was reviewed and accepted in a prior phase of this engagement.
  - `sb_page_feedbacks` (`lib/feedback.ts`), `sb2_trust_reports`
    (`lib/chat-filter.ts`), platform-settings/categories caches — all
    non-sensitive, admin-side caches for the not-yet-migrated feature areas.
  - `draft:*` keys (`useFormDraft`, used by `ServiceWizard` and the buyer
    job-post wizard) — business-form drafts (titles/prices/descriptions), no
    password/payment fields ever pass through this hook.
  - **No password, OTP, JWT, refresh token, or TOTP secret found in any
    browser storage anywhere in the app. PASS.**
- **Idempotency-Key coverage** on money-moving admin mutations: confirmed
  present on `staffCreateRefund` and `staffResolveDispute` (both already
  regression-tested in `admin.spec.ts`); contract creation
  (`contractsService.create`) and contract payment
  (`paymentsService.createContractPayment`) also send a caller-generated
  idempotency key (verified in `lib/api/client.ts`).

---

## 9. RESPONSIVE / ACCESSIBILITY / LANGUAGE — scope note

Full WCAG-level and 3-breakpoint visual QA was **not** re-run as a dedicated
pass this phase (the existing `npm run test:a11y` / `scripts/accessibility-test.cjs`
axe-based suite from a prior phase already covers baseline WCAG 2 A/AA
contrast/labeling, per `CLAUDE.md`). What this phase specifically verified by
source audit:
- Every form input touched in this audit has a proper `<label htmlFor>`
  association (confirmed via `Input`/`Textarea` shared component source —
  both generate `id`/`aria-describedby`/`aria-invalid` automatically).
- Mobile hamburger menus (buyer/seller TopNav, admin drawer) all have
  `aria-expanded`/`aria-controls`/Escape-to-close, verified in source.
- New logout buttons added this phase use semantic `<button>` elements with
  visible, translated text (not icon-only), satisfying accessible-name
  requirements without additional `aria-label`.
- `LangSwitch` has no dedicated test anywhere (documented gap, §2/§3).
- No dedicated new responsive-breakpoint Playwright pass was added this
  phase; not re-claiming this as freshly verified beyond what the existing
  a11y/lint tooling already covers.

---

## 10. Bugs found and fixed this phase

1. **Buyer/seller panels had no visible logout in the persistent header** —
   only reachable via Settings → scroll → Hisob tab. Fixed: added a
   one-click "Chiqish" control to both `TopNav` components (desktop +
   mobile), reusing the existing `authService.logout()` call. Regression
   test: `tests/e2e/logout.spec.ts` (new file, 3 tests, run twice green).
2. **Landing page's "Ish topish" CTA (2 locations) linked to a permanently
   broken route** (`/mutaxassis/ish-elonlari` — Job/Proposal backend never
   migrated). Fixed: repointed both to the working
   `/kirish?tab=register&role=mutaxassis` path.
3. **Admin sidebar's "Adminlar & Rollar" link (super_admin only) was the
   single sidebar-linked route that always rendered a dead `ErrorState`**
   (staff-management backend never migrated). Fixed: removed the sidebar
   entry, matching the exact pre-existing convention already used by
   buyer/seller TopNav for their own not-yet-migrated areas. The route
   itself is untouched (still reachable by direct URL, still shows the
   existing graceful error).

No other code bugs were found that were both (a) a genuine defect rather
than a pre-existing, already-accepted architecture boundary, and (b) fixable
without building new backend functionality. Everything else discovered is
recorded above as `OUT_OF_SCOPE_FEATURE_GAP` with its exact reason.
