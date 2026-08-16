import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { buildProgressChartData, CODE_EDITOR_DEFAULT_DARK, getCodeSuggestions } from "../../client/src/lib/editorExperience";
import { canViewReviewMedia, isCandidateAnalyticsOwner, isLinkedReviewRecording, matchesMediaFilter, normalizeMediaSearch } from "./experience";

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

  it("accepts only the session-linked camera and screen asset identifiers", () => {
    expect(isLinkedReviewRecording({ id: 10, attemptId: 5, category: "camera_recording" }, 5, [10, 11])).toBe(true);
    expect(isLinkedReviewRecording({ id: 12, attemptId: 5, category: "evidence" }, 5, [10, 11])).toBe(false);
    expect(isLinkedReviewRecording({ id: 10, attemptId: 6, category: "camera_recording" }, 5, [10, 11])).toBe(false);
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

describe("new experience UI data boundaries", () => {
  it("filters media search by candidate, email, test, and exact status", () => {
    const row = { candidateName: "Mina Hassan", email: "mina@example.com", testTitle: "Web Security", applicationStatus: "under review" };
    expect(matchesMediaFilter(row, { search: "mina", status: "under review" })).toBe(true);
    expect(matchesMediaFilter(row, { search: "other", status: "under review" })).toBe(false);
    expect(matchesMediaFilter(row, { search: "security", status: "accepted" })).toBe(false);
    expect(normalizeMediaSearch("  Mi_na%\\ ")).toBe("mina");
  });

  it("keeps the editor dark by default and shapes only submitted scores for charts", () => {
    expect(CODE_EDITOR_DEFAULT_DARK).toBe(true);
    expect(buildProgressChartData([{ state: "in_progress", test: { title: "Draft" }, autoScore: 90 }, { state: "submitted", test: { title: "Web Security" }, reviewerScore: 82, autoScore: 80 }])).toEqual([{ name: "Web Security", score: 82 }]);
  });

  it("returns language-aware autocomplete suggestions", () => {
    expect(getCodeSuggestions("javascript", "console")).toContain("console.log()");
    expect(getCodeSuggestions("python", "pri")).toContain("print()");
    expect(getCodeSuggestions("javascript", "pri")).toEqual([]);
  });
});
