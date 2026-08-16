import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { isSupportedCodeLanguage, normalizeRankingSearch, validateCodeRunInput } from "./enhancements";

function contextFor(role: "candidate" | "company" | "supervisor"): TrpcContext {
  return {
    user: { id: 902, openId: `enhancement-${role}`, name: "Test", email: "test@example.com", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("isolated code execution guardrails", () => {
  it("allows only the configured language allowlist", () => {
    expect(isSupportedCodeLanguage("javascript")).toBe(true);
    expect(isSupportedCodeLanguage("python")).toBe(true);
    expect(isSupportedCodeLanguage("bash")).toBe(false);
  });

  it("rejects oversized source and stdin before contacting the runner", () => {
    expect(validateCodeRunInput({ language: "javascript", sourceCode: "console.log(1)", stdin: "" })).toBe(true);
    expect(validateCodeRunInput({ language: "javascript", sourceCode: "x".repeat(30_001), stdin: "" })).toBe(false);
    expect(validateCodeRunInput({ language: "javascript", sourceCode: "x", stdin: "x".repeat(10_001) })).toBe(false);
    expect(validateCodeRunInput({ language: "bash", sourceCode: "echo hi", stdin: "" })).toBe(false);
  });
});


describe("company ranking and ATS authorization", () => {
  it("rejects non-company callers before touching company data", async () => {
    const candidate = appRouter.createCaller(contextFor("candidate"));
    const supervisor = appRouter.createCaller(contextFor("supervisor"));
    await expect(candidate.enhancements.company.ranking({ sort: "priority", page: 0, limit: 25 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(supervisor.enhancements.company.exportAcceptedCsv()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("company ranking search", () => {
  it("normalizes wildcard characters before building a server-side search pattern", () => {
    expect(normalizeRankingSearch("  M%_ina\\ ")).toBe("mina");
  });
});
