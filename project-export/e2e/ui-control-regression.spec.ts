import { expect, test } from "@playwright/test";

const baseHeaders = (role: string) => ({ "x-skillforge-mock-role": role });

test.describe("reorganized UI controls remain functional", () => {
  test("candidate search and profile controls preserve input and routes", async ({ browser }) => {
    const context = await browser.newContext({ extraHTTPHeaders: baseHeaders("candidate"), viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto("/discover");
    const search = page.getByPlaceholder("دور باسم اختبار أو مهارة...");
    await search.fill("Web");
    await expect(search).toHaveValue("Web");
    await expect(page.locator("body")).not.toContainText("Error 1:");
    const discoverFilters = page.locator("details").first();
    await expect(discoverFilters).toHaveAttribute("open", "");
    await discoverFilters.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(discoverFilters).not.toHaveAttribute("open");
    await page.keyboard.press("Enter");
    await expect(discoverFilters).toHaveAttribute("open", "");

    await page.goto("/candidate/profile");
    const headline = page.getByLabel("العنوان المهني");
    await expect(headline).toBeVisible();
    await headline.fill("Junior Web Pentester");
    await expect(headline).toHaveValue("Junior Web Pentester");

    await page.goto("/candidate/notifications");
    await expect(page.getByRole("heading", { name: "آخر التنبيهات." })).toBeVisible();
    await page.goto("/candidate/files");
    await expect(page.getByRole("heading", { name: "ملفاتك المؤمنة." })).toBeVisible();
    await context.close();
  });

  test("company comparison filters, selection, export controls, profile, and review dialog remain available", async ({ browser }) => {
    const context = await browser.newContext({ extraHTTPHeaders: baseHeaders("company"), viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto("/company/create-test");
    await page.getByPlaceholder("مثال: Junior Web Security Challenge").fill("UI Regression Challenge");
    await page.getByPlaceholder("وضح المهارات المطلوبة وما الذي سيقيسه الاختبار...").fill("اختبار تجريبي للتحقق من كل أنواع الأسئلة ومسارات الإنشاء.");
    await page.getByRole("button", { name: "التالي" }).click();
    await page.getByRole("button", { name: "إضافة سؤال" }).click();
    for (const label of ["اختيار من متعدد", "إجابة مقالية", "كتابة كود", "اكتشاف ثغرة", "رفع ملف"]) await expect(page.getByRole("menuitem", { name: label })).toBeVisible();
    await page.getByRole("menuitem", { name: "كتابة كود" }).click();
    await expect(page.getByText("كتابة كود", { exact: true }).first()).toBeVisible();

    await page.goto("/company/compare");
    const dates = page.locator('input[type="date"]');
    await dates.first().fill("2026-01-01");
    await expect(dates.first()).toHaveValue("2026-01-01");
    await page.getByRole("button", { name: "مسح" }).click();
    await expect(dates.first()).toHaveValue("");
    const comparisonFilters = page.locator("details").first();
    await expect(comparisonFilters).toHaveAttribute("open", "");
    await comparisonFilters.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(comparisonFilters).not.toHaveAttribute("open");
    await page.keyboard.press("Enter");
    await expect(comparisonFilters).toHaveAttribute("open", "");

    const candidateButtons = page.getByRole("button").filter({ hasText: "مرشح تجريبي" });
    await expect(candidateButtons.nth(0)).toBeVisible();
    await candidateButtons.nth(0).click();
    await candidateButtons.nth(1).click();
    await expect(page.getByRole("button", { name: "أعمدة CSV" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "أعمدة CSV" }).click();
    await expect(page.getByText("اختار أعمدة ملف CSV", { exact: true })).toBeVisible();

    await page.goto("/company/profile");
    await expect(page.getByLabel("اسم الشركة")).toBeVisible();
    await expect(page.getByRole("button", { name: "حفظ البيانات" })).toBeVisible();
    await page.goto("/company/notifications");
    await expect(page.getByRole("heading", { name: "آخر التنبيهات." })).toBeVisible();
    await page.goto("/company/files");
    await expect(page.getByRole("heading", { name: "ملفات المراجعة المؤمنة." })).toBeVisible();

    await page.goto("/company");
    const recent = page.locator("main button").filter({ hasText: /مرشح/ }).first();
    await expect(recent).toBeVisible();
    await recent.click();
    await expect(page).toHaveURL(/\/company\/review\/\d+$/);
    await expect(page.getByRole("button", { name: "تعليقات الكود" })).toBeVisible();
    await page.getByRole("button", { name: "تعليقات الكود" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "إغلاق" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await context.close();
  });

  test("supervisor navigation and route state remain functional", async ({ browser }) => {
    const context = await browser.newContext({ extraHTTPHeaders: baseHeaders("supervisor"), viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto("/supervisor");
    await expect(page.getByRole("heading", { name: "متابعة المنصة." })).toBeVisible();
    await page.getByRole("button", { name: "سجل المحاولات" }).first().click();
    await expect(page).toHaveURL(/\/supervisor\/attempts$/);
    await expect(page.locator("body")).not.toContainText("Error 1:");
    await context.close();
  });
});
