import { expect, test } from "@playwright/test";

const userByRole = {
  candidate: { id: 11, openId: "e2e-candidate", name: "مرشح اختبار", email: "candidate@example.test", role: "candidate" },
  company: { id: 12, openId: "e2e-company", name: "شركة اختبار", email: "company@example.test", role: "company" },
  supervisor: { id: 13, openId: "e2e-supervisor", name: "مشرف اختبار", email: "supervisor@example.test", role: "supervisor" },
} as const;

const workspaceByRole = {
  candidate: "/candidate",
  company: "/company",
  supervisor: "/supervisor",
} as const;

test.describe("role workspace navigation", () => {
  for (const [currentRole, user] of Object.entries(userByRole) as Array<[
    keyof typeof userByRole,
    (typeof userByRole)[keyof typeof userByRole]
  ]>) {
    for (const [targetRole, targetPath] of Object.entries(workspaceByRole) as Array<[
      keyof typeof workspaceByRole,
      string
    ]>) {
      if (currentRole === targetRole) continue;

      test(`${currentRole} visiting ${targetRole} sees permission guidance and can switch workspace`, async ({ page }) => {
        await page.route("**/api/trpc/auth.me**", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ result: { data: { json: user } } }),
          });
        });

        await page.goto(targetPath);
        await expect(page.getByRole("heading", { name: "المسار ده مش متاح لحسابك" })).toBeVisible();
        await expect(page.getByText(`أنت داخل بحساب ${currentRole === "candidate" ? "المرشح" : currentRole === "company" ? "الشركة" : "المشرف"}`)).toBeVisible();
        await expect(page.getByText("بيانات كل مساحة محمية ومفصولة حسب الدور")).toBeVisible();

        await page.getByRole("button", { name: `افتح مساحة ${currentRole === "candidate" ? "المرشح" : currentRole === "company" ? "الشركة" : "المشرف"}` }).click();
        await expect(page).toHaveURL(new RegExp(`${workspaceByRole[currentRole]}$`));
      });
    }
  }

  for (const [role, user] of Object.entries(userByRole) as Array<[
    keyof typeof userByRole,
    (typeof userByRole)[keyof typeof userByRole]
  ]>) {
    test(`${role} visiting the assessment runner gets a safe role or recovery state`, async ({ page }) => {
      await page.setExtraHTTPHeaders({ "x-skillforge-mock-role": role });
      await page.goto("/attempt/999999");
      if (role === "candidate") {
        await expect(page.getByText("مش قادرين نفتح المحاولة")).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole("link", { name: "العودة لمساحة المرشح" })).toHaveAttribute("href", "/candidate");
      } else {
        await expect(page.getByRole("heading", { name: "المسار ده مش متاح لحسابك" })).toBeVisible();
        await expect(page.getByRole("button", { name: `افتح مساحة ${role === "company" ? "الشركة" : "المشرف"}` })).toBeVisible();
      }
    });
  }
});
