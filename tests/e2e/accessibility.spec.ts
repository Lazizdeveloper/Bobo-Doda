import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Frontend WCAG 2.1 AA Accessibility Audit", () => {
  const publicRoutes = [
    { name: "Landing", path: "/" },
    { name: "Kirish (User Login)", path: "/kirish" },
    { name: "Ro'yxatdan o'tish", path: "/royxatdan-otish" },
    { name: "Parolni unutdim", path: "/parolni-unutdim" },
    { name: "SuperAdmin Login", path: "/rahbariyat/kirish" },
    { name: "Operator Admin Login", path: "/admin/kirish" },
    { name: "Maxfiylik", path: "/maxfiylik" },
    { name: "Oferta", path: "/oferta" },
    { name: "Shartlar", path: "/shartlar" },
    { name: "Savol-Javob", path: "/savol-javob" },
  ];

  for (const { name, path } of publicRoutes) {
    test(`A11y check for ${name} (${path})`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .disableRules(["color-contrast"]) // Ba'zi dinamik mavzu fonlarida brauzer xatoligi bo'lmasligi uchun alohida ko'riladi
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
