import { chromium } from "@playwright/test";

const baseURL = process.env.PREVIEW_URL ?? "http://127.0.0.1:3000";
const roles = ["candidate", "company", "supervisor"];
const routes = [
  "/", "/discover", "/candidate", "/candidate/profile", "/candidate/status", "/candidate/notifications", "/candidate/files",
  "/company", "/company/create-test", "/company/attempts", "/company/compare", "/company/tests", "/company/profile", "/company/notifications", "/company/files", "/company/review/1",
  "/supervisor", "/supervisor/attempts", "/attempt/1", "/companies/acme", "/404", "/does-not-exist",
];
const expectedWorkspace = { candidate: "/candidate", company: "/company", supervisor: "/supervisor" };
const roleOnly = [
  ["candidate", /^\/candidate(?:\/|$)/, "مساحة المرشح"],
  ["company", /^\/company(?:\/|$)/, "مساحة الشركة"],
  ["supervisor", /^\/supervisor(?:\/|$)/, "مركز الإشراف"],
];

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
const findings = [];
const checked = [];

for (const role of roles) {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-skillforge-mock-role": role } });
  for (const route of routes) {
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedResponses = [];
    page.on("console", message => {
      const text = message.text();
      const expectedStatus = route === "/attempt/1" || route === "/companies/acme" || (route === "/company/review/1" && role === "company");
      if (message.type() === "error" && !/fonts\.gstatic\.com|CORS policy.*x-skillforge-mock-role|Failed to load resource: net::ERR_FAILED/i.test(text) && !(expectedStatus && /status of 40[34]|TRPCClientError.*not permitted/i.test(text))) consoleErrors.push(text);
    });
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("response", response => { if (response.status() >= 400 && response.status() !== 404) failedResponses.push(`${response.status()} ${response.url()}`); });
    try {
      await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForTimeout(route === "/attempt/1" ? 8500 : 250);
      const body = await page.locator("body").innerText();
      const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      checked.push({ role, route, title: await page.title(), chars: body.length });
      if (/Error 1:|Database is unavailable|Internal Server Error/i.test(body)) findings.push({ severity: "high", role, route, issue: "application error text rendered", evidence: body.match(/.{0,80}(Error 1:|Database is unavailable|Internal Server Error).{0,120}/i)?.[0] });
      if (consoleErrors.length) findings.push({ severity: "medium", role, route, issue: "browser console error", evidence: consoleErrors.slice(0, 3) });
      if (pageErrors.length) findings.push({ severity: "high", role, route, issue: "uncaught page error", evidence: pageErrors.slice(0, 3) });
      const expectedInvalidAttempt = route === "/attempt/1" && role === "candidate" && failedResponses.every(response => response.startsWith("403 "));
      const expectedInvalidReview = route === "/company/review/1" && role === "company" && failedResponses.every(response => response.startsWith("403 "));
      if (failedResponses.length && !expectedInvalidAttempt && !expectedInvalidReview) findings.push({ severity: "high", role, route, issue: "failed API/resource response", evidence: failedResponses.slice(0, 5) });
      if (route === "/attempt/1" && role === "candidate" && !body.includes("مش قادرين نفتح المحاولة")) findings.push({ severity: "high", role, route, issue: "invalid attempt lacks recovery state" });
      if (route === "/attempt/1" && role !== "candidate" && !body.includes("المسار ده مش متاح لحسابك")) findings.push({ severity: "high", role, route, issue: "non-candidate can reach runner without permission guidance" });
      if (metrics.scrollWidth > metrics.clientWidth + 2) findings.push({ severity: "medium", role, route, issue: "horizontal overflow", evidence: metrics });
      for (const [protectedRole, matcher, label] of roleOnly) {
        if (role !== protectedRole && matcher.test(route) && !body.includes("المسار ده مش متاح لحسابك")) findings.push({ severity: "high", role, route, issue: "role mismatch did not show permission guidance", evidence: label });
      }
    } catch (error) {
      findings.push({ severity: "high", role, route, issue: "navigation failed", evidence: String(error) });
    } finally {
      await page.close();
    }
  }
  const page = await context.newPage();
  await page.goto(`${baseURL}${expectedWorkspace[role]}`, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  if (!body.includes(role === "candidate" ? "مساحة المرشح" : role === "company" ? "مساحة الشركة" : "مركز الإشراف")) findings.push({ severity: "high", role, route: expectedWorkspace[role], issue: "workspace identity label missing" });
  await context.close();
}

await browser.close();
console.log(JSON.stringify({ baseURL, checked: checked.length, findings }, null, 2));
if (findings.some(finding => finding.severity === "high")) process.exitCode = 1;
