import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

describe("role-aware route protection", () => {
  it("maps every supported role to its own workspace", () => {
    expect(appSource).toContain('type AppRole = "candidate" | "company" | "supervisor"');
    expect(appSource).toContain('role === "candidate" ? "/candidate" : role === "company" ? "/company" : "/supervisor"');
  });

  it("redirects mismatched roles before rendering protected page children", () => {
    expect(appSource).toContain("if (loading || !user || user.role === expected) return;");
    expect(appSource).toContain("setLocation(workspaceForRole(user.role as AppRole));");
    expect(appSource).toContain("if (user.role !== expected) return <div");
    expect(appSource).toContain('<Route path={"/candidate"}><RoleGate expected="candidate"><CandidateDashboard /></RoleGate></Route>');
    expect(appSource).toContain('<Route path={"/supervisor"}><RoleGate expected="supervisor"><SupervisorDashboard /></RoleGate></Route>');
  });

  it("does not leave unauthenticated role routes mounting the protected page", () => {
    expect(appSource).toContain("if (!user) return <AuthRequiredScreen />;");
  });
});
