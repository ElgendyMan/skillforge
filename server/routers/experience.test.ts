import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { canViewReviewMedia, isCandidateAnalyticsOwner } from "./experience";
import { getCodeSuggestions } from "../../client/src/pages/Platform";

function contextFor(role: "candidate" | "company" | "supervisor"): TrpcContext {
  return {
    user: { id: 901, openId: `experience-${role}`, name: "Experience test", email: "experience@example.com", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("candidate performance ownership", () => {
  it("allows analytics only for candidate sessions", () => {
    expect(isCandidateAnalyticsOwner({ role: "candidate" })).toBe(true);
    expect(isCandidateAnalyticsOwner({ role: "company" })).toBe(false);
    expect(isCandidateAnalyticsOwner({ role: "supervisor" })).toBe(false);
  });
});

describe("review media authorization", () => {
  it("requires both a company role and membership in the owning company", () => {
    expect(canViewReviewMedia({ role: "company", isCompanyMember: true })).toBe(true);
    expect(canViewReviewMedia({ role: "company", isCompanyMember: false })).toBe(false);
    expect(canViewReviewMedia({ role: "candidate", isCompanyMember: true })).toBe(false);
    expect(canViewReviewMedia({ role: "supervisor", isCompanyMember: false })).toBe(false);
  });
});

describe("experience procedure boundaries", () => {
  it("rejects non-candidate analytics access before returning another user’s review notes", async () => {
    const caller = appRouter.createCaller(contextFor("company"));
    await expect(caller.experience.candidateAnalytics()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects candidate access to the company media procedure", async () => {
    const caller = appRouter.createCaller(contextFor("candidate"));
    await expect(caller.experience.companyReviewMedia({ attemptId: 9999999 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("code editor boundaries", () => {
  it("returns language-aware suggestions and never suggests unknown language tokens", () => {
    expect(getCodeSuggestions("javascript", "console")).toContain("console.log()");
    expect(getCodeSuggestions("python", "pri")).toContain("print()");
    expect(getCodeSuggestions("javascript", "pri")).toEqual([]);
    expect(getCodeSuggestions("unknown", "con")).toEqual([]);
  });
});
