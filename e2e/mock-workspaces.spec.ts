import { expect, test } from "@playwright/test";

const roles = [
  { role: "candidate", home: "/candidate", pages: ["/candidate/status", "/candidate/notifications", "/candidate/profile"], label: "مساحة المرشح", nav: "اكتشف الاختبارات", navPath: "/discover" },
  { role: "company", home: "/company", pages: ["/company/attempts", "/company/compare", "/company/tests", "/company/notifications", "/company/profile"], label: "مساحة الشركة", nav: "المحاولات", navPath: "/company/attempts" },
  { role: "supervisor", home: "/supervisor", pages: ["/supervisor/attempts"], label: "مركز الإشراف", nav: "سجل المحاولات", navPath: "/supervisor/attempts" },
] as const;

test.describe("seeded role workspaces", () => {
  for (const fixture of roles) {
    test(`${fixture.role} loads seeded workspace pages and navigation`, async ({ browser }) => {
      const context = await browser.newContext({ extraHTTPHeaders: { "x-skillforge-mock-role": fixture.role }, viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await page.goto(fixture.home);
      await expect(page.getByText(fixture.label, { exact: true })).toBeVisible();
      await expect(page.locator("body")).not.toContainText("Error 1:");
      await expect(page.locator("body")).not.toContainText("Database is unavailable");

      for (const path of fixture.pages) {
        await page.goto(path);
        await expect(page.locator("body")).not.toContainText("Error 1:");
        await expect(page.locator("body")).not.toContainText("Database is unavailable");
      }

      await page.goto(fixture.home);
      const navButton = page.getByRole("button", { name: fixture.nav }).first();
      await expect(navButton).toBeVisible();
      await navButton.click();
      await expect(page).toHaveURL(new RegExp(`${fixture.navPath}$`));

      if (fixture.role === "candidate") {
        const startButton = page.getByRole("button", { name: /^ابدأ$/ }).first();
        await expect(startButton).toBeVisible();
        await startButton.click();
        await expect(page).toHaveURL(/\/attempt\/\d+$/);
      }

      if (fixture.role === "company") {
        await page.goto("/company");
        await page.getByRole("button", { name: "اختبار جديد" }).first().click();
        await expect(page).toHaveURL(/\/company\/create-test$/);
      }

      if (fixture.role === "supervisor") {
        await page.goto("/supervisor");
        await page.getByRole("button", { name: "سجل المحاولات" }).first().click();
        await expect(page).toHaveURL(/\/supervisor\/attempts$/);
      }

      if (fixture.role === "candidate") {
        const candidateSecondary = [["التنبيهات", "/candidate/notifications"], ["ملفاتي المؤمنة", "/candidate/files"], ["ملفي المهني", "/candidate/profile"]] as const;
        for (const [label, path] of candidateSecondary) {
          await page.goto("/candidate");
          await page.getByRole("button", { name: "الحساب والإعدادات" }).click();
          await page.getByRole("button", { name: label }).click();
          await expect(page).toHaveURL(new RegExp(`${path}$`));
          await expect(page.locator("body")).not.toContainText("Error 1:");
        }
      }

      if (fixture.role === "company") {
        const companySecondary = [["اختباراتنا", "/company/tests"], ["ملف الشركة", "/company/profile"], ["التنبيهات", "/company/notifications"], ["ملفات المراجعة", "/company/files"]] as const;
        for (const [label, path] of companySecondary) {
          await page.goto("/company");
          await page.getByRole("button", { name: "إدارة الشركة" }).click();
          await page.getByRole("button", { name: label }).click();
          await expect(page).toHaveURL(new RegExp(`${path}$`));
          await expect(page.locator("body")).not.toContainText("Error 1:");
        }
      }

      await page.goto(fixture.home);
      await page.getByText(/mock\./).first().click();
      await expect(page.getByRole("menuitem", { name: "تسجيل الخروج" })).toBeVisible();
      await page.getByRole("menuitem", { name: "تسجيل الخروج" }).click();
      await context.close();
      const loggedOutContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const loggedOutPage = await loggedOutContext.newPage();
      await loggedOutPage.goto(fixture.home);
      await expect(loggedOutPage.getByText("سجّل دخولك عشان تكمل", { exact: true })).toBeVisible();
      await loggedOutContext.close();
    });
  }
});
