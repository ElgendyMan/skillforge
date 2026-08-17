import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { canRemoveCodeReviewComment, comparedAttemptsMatchRequest, hasCompanyReviewAccess, isValidCodeCommentLine } from "./reviewTools";

function createContext(role: "candidate" | "company" | "supervisor"): TrpcContext {
  return { user: { id: 42, openId: `review-tools-${role}`, name: "Test user", email: "test@example.com", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

describe("review tool access guards", () => {
  it("limits comparison tools to company members", () => {
    expect(hasCompanyReviewAccess("company")).toBe(true);
    expect(hasCompanyReviewAccess("candidate")).toBe(false);
    expect(hasCompanyReviewAccess("supervisor")).toBe(false);
  });

  it("fails closed when even one comparison attempt lies outside the company", () => {
    expect(comparedAttemptsMatchRequest([11, 12], [12, 11])).toBe(true);
    expect(comparedAttemptsMatchRequest([11, 12], [11])).toBe(false);
    expect(comparedAttemptsMatchRequest([11, 12], [11, 13])).toBe(false);
  });

  it("allows deleting a comment only for its original reviewer inside the owning company", () => {
    expect(canRemoveCodeReviewComment({ isCompanyOwner: true, isOriginalReviewer: true })).toBe(true);
    expect(canRemoveCodeReviewComment({ isCompanyOwner: true, isOriginalReviewer: false })).toBe(false);
    expect(canRemoveCodeReviewComment({ isCompanyOwner: false, isOriginalReviewer: true })).toBe(false);
  });
});

describe("code comment line validation", () => {
  it("accepts valid submitted-code lines and rejects invalid values", () => {
    expect(isValidCodeCommentLine(1, "const x = 1;\nconsole.log(x);")).toBe(true);
    expect(isValidCodeCommentLine(2, "const x = 1;\nconsole.log(x);")).toBe(true);
    expect(isValidCodeCommentLine(0, "const x = 1;")).toBe(false);
    expect(isValidCodeCommentLine(3, "const x = 1;\nconsole.log(x);")).toBe(false);
    expect(isValidCodeCommentLine(1.5, "const x = 1;")).toBe(false);
  });
});

describe("review tool procedures", () => {
  it("rejects non-company callers before comparison or comment data can be queried", async () => {
    const candidate = appRouter.createCaller(createContext("candidate"));
    const supervisor = appRouter.createCaller(createContext("supervisor"));
    await expect(candidate.reviewTools.comparison({ attemptIds: [1, 2] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(supervisor.reviewTools.comments.list({ attemptId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(candidate.reviewTools.comments.remove({ commentId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
