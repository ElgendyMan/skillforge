import { chromium } from "@playwright/test";

const baseUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:3000";
const roles = { candidate: "/candidate", company: "/company", supervisor: "/supervisor" };
const viewports = { desktop: { width: 1280, height: 800 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } };
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });

async function waitForWorkspace(page, role) {
  const roleLabel = role === "candidate" ? "مساحة المرشح" : role === "company" ? "مساحة الشركة" : "مركز الإشراف";
  const readinessText = role === "candidate" ? "Web Pentest Challenge" : role === "company" ? "اختبارات منشورة" : "مرشحون";
  const roleHeading = page.getByText(roleLabel, { exact: true }).first();
  if (await roleHeading.count()) await roleHeading.waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText(readinessText, { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 });
}

async function verifyKeyboardAndDisclosure(page, role) {
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element) return { tag: null, role: null, outline: "none" };
    const style = getComputedStyle(element);
    return { tag: element.tagName, role: element.getAttribute("role"), outline: style.outlineStyle, visible: Boolean(element instanceof HTMLElement && element.offsetParent) };
  });
  if (!focus.visible || !["BUTTON", "A", "INPUT"].includes(focus.tag)) throw new Error(`${role}: keyboard focus did not land on an interactive element`);

  const groupLabel = role === "candidate" ? "الحساب والإعدادات" : role === "company" ? "إدارة الشركة" : null;
  if (groupLabel) {
    const group = page.getByRole("button", { name: groupLabel });
    const before = await group.getAttribute("aria-expanded");
    await group.click();
    const after = await group.getAttribute("aria-expanded");
    if (before !== "false" || after !== "true") throw new Error(`${role}: navigation group ARIA state did not toggle`);
    await group.click();
  }

  const details = page.locator("details").first();
  if (await details.count()) {
    const summary = details.locator("summary");
    const before = await details.getAttribute("open");
    await summary.click();
    const after = await details.getAttribute("open");
    if (before !== "" || after !== null) throw new Error(`${role}: collapsible filter state did not toggle`);
    await summary.click();
  }
}

for (const [role, path] of Object.entries(roles)) {
  for (const [viewportName, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({ extraHTTPHeaders: { "x-skillforge-mock-role": role }, viewport });
    const page = await context.newPage();
    await page.goto(`${baseUrl}${path}`);
    await page.waitForFunction(() => !document.body.innerText.includes("جاري تحميل المساحة...") && !document.body.innerText.includes("جاري تجهيز المساحة..."), null, { timeout: 30_000 });
    await waitForWorkspace(page, role);
    if (viewportName === "desktop" || viewportName === "tablet") await verifyKeyboardAndDisclosure(page, role);
    await page.screenshot({ path: `test-results/mock-${role}-${viewportName}.png`, fullPage: true });
    console.log(JSON.stringify({ role, viewport: viewportName, path, headings: await page.locator("h1,h2,h3").allTextContents(), buttons: (await page.locator("button").allTextContents()).slice(0, 30) }, null, 2));
    await context.close();
  }
}
await browser.close();
