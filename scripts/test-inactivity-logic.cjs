/**
 * Unit verification test for Inactivity Timeout logic and Landing Navigation
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

console.log("=== 1. Verifying useInactivityTimeout hook source and constants ===");
const hookPath = path.join(root, "lib/hooks/useInactivityTimeout.ts");
assert(fs.existsSync(hookPath), "useInactivityTimeout.ts must exist");
const hookSrc = fs.readFileSync(hookPath, "utf8");

assert(hookSrc.includes("30 * 60 * 1000"), "Timeout must be 30 minutes (30 * 60 * 1000)");
assert(hookSrc.includes('"mousemove"'), "Must track mousemove event");
assert(hookSrc.includes('"keydown"'), "Must track keydown event");
assert(hookSrc.includes('"click"'), "Must track click event");
assert(hookSrc.includes('"scroll"'), "Must track scroll event");
assert(hookSrc.includes('"touchstart"'), "Must track touchstart event");
assert(hookSrc.includes("bd_last_activity"), "Must use bd_last_activity for cross-tab tracking");
assert(hookSrc.includes("authService.logout()"), "Must call authService.logout()");
assert(hookSrc.includes("/kirish"), "Must direct to /kirish");

// Security check: Must NOT track unauthenticated users
assert(
  hookSrc.includes("const session = authService.getSession();\n      if (!session) return;") ||
  hookSrc.includes("if (!session) return;") ||
  hookSrc.includes("!authService.getSession()"),
  "recordActivity must skip unauthenticated users"
);

// Bug fix check: Must NOT reset timer if elapsed >= timeoutMs on mount
assert(
  !hookSrc.includes("!existing || Date.now() - existing > timeoutMs"),
  "Must NOT reset stored activity to Date.now() if expired on mount"
);
assert(
  hookSrc.includes("Date.now() - existing >= timeoutMs") && hookSrc.includes("triggerLogout"),
  "Must trigger logout if existing activity timestamp has exceeded timeoutMs on mount"
);

console.log("    -> useInactivityTimeout hook structure verified.");

console.log("=== 2. Verifying InactivityTimeout component ===");
const compPath = path.join(root, "components/shared/InactivityTimeout.tsx");
assert(fs.existsSync(compPath), "InactivityTimeout.tsx component must exist");
const compSrc = fs.readFileSync(compPath, "utf8");
assert(compSrc.includes("useInactivityTimeout"), "Component must use useInactivityTimeout hook");
assert(compSrc.includes("useToast"), "Component must use toast for user notification");
assert(compSrc.includes("router.replace"), "Component must use router.replace to prevent back-button history navigation");

console.log("    -> InactivityTimeout component verified.");

console.log("=== 3. Verifying app/layout.tsx registration ===");
const layoutPath = path.join(root, "app/layout.tsx");
const layoutSrc = fs.readFileSync(layoutPath, "utf8");
assert(layoutSrc.includes("<InactivityTimeout />"), "InactivityTimeout must be mounted in root layout");

console.log("    -> InactivityTimeout mounted in layout verified.");

console.log("=== 4. Verifying translations parity ===");
const dictPath = path.join(root, "lib/i18n/dictionary.ts");
const enPath = path.join(root, "lib/i18n/en.ts");
const dictSrc = fs.readFileSync(dictPath, "utf8");
const enSrc = fs.readFileSync(enPath, "utf8");

assert(dictSrc.includes("auth.inactivityLogoutTitle"), "dictionary.ts must have auth.inactivityLogoutTitle");
assert(dictSrc.includes("auth.inactivityLogout"), "dictionary.ts must have auth.inactivityLogout");
assert(enSrc.includes("auth.inactivityLogoutTitle"), "en.ts must have auth.inactivityLogoutTitle");
assert(enSrc.includes("auth.inactivityLogout"), "en.ts must have auth.inactivityLogout");

console.log("    -> Translations verified.");

console.log("=== 5. Verifying Landing page navigation (app/page.tsx) ===");
const landingPath = path.join(root, "app/page.tsx");
const landingSrc = fs.readFileSync(landingPath, "utf8");
assert(landingSrc.includes("authService.getSession()"), "Landing page must check authService.getSession()");
assert(landingSrc.includes("cabinetHref"), "Landing page must compute cabinetHref");
assert(landingSrc.includes("Kabinetga o'tish"), "Landing page must show Kabinetga o'tish when logged in");

console.log("    -> Landing page navigation verified.");

console.log("=== 6. Verifying Backend Logout @Public() and safe token handling ===");
const controllerPath = path.join(root, "backend/src/modules/auth/auth.controller.ts");
const controllerSrc = fs.readFileSync(controllerPath, "utf8");
assert(controllerSrc.includes("@Public()\n  @Post('logout')") || controllerSrc.includes("@Public()\r\n  @Post('logout')"), "backend logout must have @Public()");
assert(controllerSrc.includes("clearRefreshCookie(res,"), "backend logout must clear refresh cookie");

const refreshServicePath = path.join(root, "backend/src/modules/auth/refresh-token.service.ts");
const refreshServiceSrc = fs.readFileSync(refreshServicePath, "utf8");
assert(refreshServiceSrc.includes("revokeByRawToken(rawToken: string, userId?: string)"), "revokeByRawToken must support optional userId");

console.log("    -> Backend logout safety verified.");

console.log("=== 7. Verifying client.ts writeSession dispatches DATA_CHANGED_EVENT ===");
const clientPath = path.join(root, "lib/api/client.ts");
const clientSrc = fs.readFileSync(clientPath, "utf8");
assert(clientSrc.includes('DATA_CHANGED_EVENT, { detail: { key: "session"'), "writeSession must dispatch DATA_CHANGED_EVENT");

console.log("    -> client.ts writeSession dispatch verified.");

console.log("=== 8. Verifying Kirish page checks inactivity BEFORE auto-refresh ===");
const kirishPath = path.join(root, "app/(auth)/kirish/page.tsx");
const kirishSrc = fs.readFileSync(kirishPath, "utf8");
const inactIdx = kirishSrc.indexOf("reason") !== -1 ? kirishSrc.indexOf('params.get("reason") === "inactivity"') : -1;
const refreshIdx = kirishSrc.indexOf("authService.refresh()");
assert(inactIdx !== -1 && refreshIdx !== -1, "Kirish page must contain both reason check and refresh()");
assert(inactIdx < refreshIdx, "Kirish page must check inactivity before calling authService.refresh()");

console.log("    -> Kirish page inactivity priority verified.");

console.log("\nALL INACTIVITY & LOGOUT LOGIC CHECKS PASSED SUCCESSFULLY!");
