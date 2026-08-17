import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

describe("role-aware E2E route contract", () => {
  it("maps every supported role to its own workspace", () => {
    expect(appSource).toContain('type AppRole = "candidate" | "company" | "supervisor"');
    expect(appSource).toContain('role === "candidate" ? "/candidate" : role === "company" ? "/company" : "/supervisor"');
    expect(appSource).toContain('role === "candidate" ? "المرشح" : role === "company" ? "الشركة" : "المشرف"');
  });

  it("shows a permission explanation instead of silently redirecting mismatched roles", () => {
    expect(appSource).toContain("المسار ده مش متاح لحسابك");
    expect(appSource).toContain("بيانات كل مساحة محمية ومفصولة حسب الدور");
    expect(appSource).toContain("أنت داخل بحساب");
    expect(appSource).toContain("بينما المسار ده مخصص لـ");
    expect(appSource).toContain("setLocation(workspaceForRole(currentRole))");
    expect(appSource).toContain("افتح مساحة {roleLabel(currentRole)}");
    expect(appSource).not.toContain("بنحوّلك لمساحتك الصحيحة...");
  });

  it.each([
    ["candidate", "CandidateDashboard", "/candidate"],
    ["company", "CompanyDashboard", "/company"],
    ["supervisor", "SupervisorDashboard", "/supervisor"],
  ])("guards the %s workspace before mounting its page", (role, component, path) => {
    expect(appSource).toContain(`<Route path={"${path}"}><RoleGate expected="${role}"><${component} />`);
  });

  it("keeps unauthenticated role routes behind the login state", () => {
    expect(appSource).toContain("if (!user) return <AuthRequiredScreen />;");
  });
});
