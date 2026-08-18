import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });
const context = await browser.newContext({ extraHTTPHeaders: { "x-skillforge-mock-role": "company" } });
const page = await context.newPage();
page.on("response", async response => { if (response.url().includes("company.dashboard")) console.log("dashboard", response.status(), await response.text()); });
await page.goto("http://127.0.0.1:3000/company");
for (const seconds of [2, 5, 10]) { await page.waitForTimeout(seconds * 1000); console.log(JSON.stringify({ seconds, body: (await page.locator("body").innerText()).slice(0, 2000) }, null, 2)); }
await context.close();
await browser.close();
