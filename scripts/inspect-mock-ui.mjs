import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
const roles = { candidate: "/candidate", company: "/company", supervisor: "/supervisor" };
for (const [role, path] of Object.entries(roles)) {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-skillforge-mock-role": role }, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${process.env.PREVIEW_URL ?? "http://127.0.0.1:3000"}${path}`);
  const roleLabel = role === "candidate" ? "مساحة المرشح" : role === "company" ? "مساحة الشركة" : "مركز الإشراف";
  const readinessText = role === "candidate" ? "Web Pentest Challenge" : role === "company" ? "اختبارات منشورة" : "مرشحون";
  await page.getByText(roleLabel, { exact: true }).first().waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText(readinessText, { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `test-results/mock-${role}-desktop.png`, fullPage: true });
  const mobileContext = await browser.newContext({ extraHTTPHeaders: { "x-skillforge-mock-role": role }, viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${process.env.PREVIEW_URL ?? "http://127.0.0.1:3000"}${path}`);
  await mobilePage.waitForFunction(() => !document.body.innerText.includes("جاري تحميل المساحة...") && !document.body.innerText.includes("جاري تجهيز المساحة..."), null, { timeout: 30_000 });
  await mobilePage.getByText(readinessText, { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 });
  await mobilePage.screenshot({ path: `test-results/mock-${role}-mobile.png`, fullPage: true });
  await mobileContext.close();
  console.log(JSON.stringify({ role, path, body: (await page.locator("body").innerText()).slice(0, 1200), headings: await page.locator("h1,h2,h3").allTextContents(), buttons: await page.locator("button").allTextContents() }, null, 2));
  await context.close();
}
await browser.close();
