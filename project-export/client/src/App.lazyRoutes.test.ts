import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const platformSource = readFileSync(resolve(process.cwd(), "client/src/pages/Platform.tsx"), "utf8");
const enhancersSource = readFileSync(resolve(process.cwd(), "client/src/pages/AssessmentEnhancers.tsx"), "utf8");
const comparisonExperienceSource = readFileSync(resolve(process.cwd(), "client/src/pages/CompanyComparisonExperience.tsx"), "utf8");

describe("deferred route registration", () => {
  it("keeps heavy platform pages behind lazy boundaries and a shared Suspense fallback", () => {
    expect(appSource).toContain("function lazyNamed");
    expect(appSource).toContain('const platform = () => import("./pages/Platform")');
    expect(appSource).toContain('const enhancers = () => import("./pages/AssessmentEnhancers")');
    expect(appSource).toContain("<Suspense fallback=");
    expect(appSource).toContain("const TestRunner = lazyNamed(enhancers, \"TestRunner\")");
    expect(appSource).toContain('const comparisonExperience = () => import("./pages/CompanyComparisonExperience")');
    expect(appSource).toContain("const CompanyComparison = lazyNamed(comparisonExperience, \"CompanyComparison\")");
  });

  it("keeps every lazy route bound to a real named page export", () => {
    ["CandidateDashboard", "CandidateProfile", "CompanyAttempts", "CompanyDashboard", "CompanyProfile", "CompanyPublicPage", "CompanyTestCreator", "CompanyTests", "DiscoverCatalog", "NotificationsPage", "SecureFilesPage", "SupervisorAttempts", "SupervisorDashboard"].forEach(name => {
      expect(appSource).toContain(`lazyNamed(platform, "${name}")`);
      expect(platformSource).toContain(`export function ${name}`);
    });
    ["CandidateStatus", "ReviewAttempt", "TestRunner"].forEach(name => {
      expect(appSource).toContain(`lazyNamed(enhancers, "${name}")`);
      expect(enhancersSource).toContain(`export function ${name}`);
    });
    expect(comparisonExperienceSource).toContain("export function CompanyComparison");
  });
});
