import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("deferred route registration", () => {
  it("keeps heavy platform pages behind lazy boundaries and a shared Suspense fallback", () => {
    expect(appSource).toContain("function lazyNamed");
    expect(appSource).toContain('const platform = () => import("./pages/Platform")');
    expect(appSource).toContain('const enhancers = () => import("./pages/AssessmentEnhancers")');
    expect(appSource).toContain("<Suspense fallback=");
    expect(appSource).toContain("const TestRunner = lazyNamed(enhancers, \"TestRunner\")");
    expect(appSource).toContain("const CompanyComparison = lazyNamed(enhancers, \"CompanyComparison\")");
  });
});
