import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { canAccessAttemptAsset, canTransitionApplicationStatus, computePriority, isEmailDeliveryConfigured, isIntegrityFlagEvent, shouldPublishFeedbackNotification } from "./hiring";

const originalApiKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.RESEND_FROM_EMAIL;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalApiKey;
  if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
  else process.env.RESEND_FROM_EMAIL = originalFrom;
});

describe("email delivery configuration", () => {
  it("requires both the Resend key and verified sender address", () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    expect(isEmailDeliveryConfigured()).toBe(false);

    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "SkillForge <noreply@example.com>";
    expect(isEmailDeliveryConfigured()).toBe(true);
  });
});

describe("priority recommendation", () => {
  it("rewards strong scores without integrity flags and applies a bounded deduction otherwise", () => {
    expect(computePriority(80, null, 0)).toBe(88);
    expect(computePriority(90, 95, 2)).toBe(79);
    expect(computePriority(null, null, 20)).toBe(0);
  });
});

describe("proctoring integrity flags", () => {
  it("flags only events that need contextual review", () => {
    expect(isIntegrityFlagEvent("focus_lost")).toBe(true);
    expect(isIntegrityFlagEvent("screen_stopped")).toBe(true);
    expect(isIntegrityFlagEvent("camera_stopped")).toBe(true);
    expect(isIntegrityFlagEvent("connection_restored")).toBe(false);
  });
});

describe("published feedback notifications", () => {
  it("notifies only for final decisions with feedback and never repeats an existing notice", () => {
    expect(shouldPublishFeedbackNotification({ decision: "accepted", feedbackCount: 1, notificationAlreadyExists: false })).toBe(true);
    expect(shouldPublishFeedbackNotification({ decision: "rejected", feedbackCount: 3, notificationAlreadyExists: false })).toBe(true);
    expect(shouldPublishFeedbackNotification({ decision: "under review", feedbackCount: 3, notificationAlreadyExists: false })).toBe(false);
    expect(shouldPublishFeedbackNotification({ decision: "accepted", feedbackCount: 0, notificationAlreadyExists: false })).toBe(false);
    expect(shouldPublishFeedbackNotification({ decision: "accepted", feedbackCount: 1, notificationAlreadyExists: true })).toBe(false);
  });
});

describe("attempt asset permissions", () => {
  it("keeps recordings and evidence scoped to the owner, authorized company, or supervisor", () => {
    expect(canAccessAttemptAsset({ role: "candidate", requestingUserId: 7, assetOwnerUserId: 7, isCompanyMember: false })).toBe(true);
    expect(canAccessAttemptAsset({ role: "candidate", requestingUserId: 8, assetOwnerUserId: 7, isCompanyMember: false })).toBe(false);
    expect(canAccessAttemptAsset({ role: "company", requestingUserId: 16, assetOwnerUserId: 7, isCompanyMember: true })).toBe(true);
    expect(canAccessAttemptAsset({ role: "company", requestingUserId: 17, assetOwnerUserId: 7, isCompanyMember: false })).toBe(false);
    expect(canAccessAttemptAsset({ role: "supervisor", requestingUserId: 30, assetOwnerUserId: 7, isCompanyMember: false })).toBe(true);
  });
});

function createContext(role: "candidate" | "company" | "supervisor"): TrpcContext {
  return {
    user: {
      id: 42,
      openId: `test-${role}`,
      name: "Test user",
      email: "test@example.com",
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("role-gated procedures", () => {
  it("rejects cross-role dashboard access before querying application data", async () => {
    const candidate = appRouter.createCaller(createContext("candidate"));
    const company = appRouter.createCaller(createContext("company"));
    const supervisor = appRouter.createCaller(createContext("supervisor"));

    await expect(candidate.company.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(company.candidate.profile.get()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(candidate.supervisor.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(supervisor.company.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("application status contract", () => {
  it("accepts only the three defined decision values", () => {
    expect(canTransitionApplicationStatus("accepted")).toBe(true);
    expect(canTransitionApplicationStatus("rejected")).toBe(true);
    expect(canTransitionApplicationStatus("under review")).toBe(true);
    expect(canTransitionApplicationStatus("pending")).toBe(false);
    expect(canTransitionApplicationStatus("")) .toBe(false);
  });
});

describe("ownership fail-closed behavior", () => {
  it("rejects an attempt identifier that is not owned by the authenticated candidate", async () => {
    const candidate = appRouter.createCaller(createContext("candidate"));
    await expect(candidate.candidate.attempts.get({ attemptId: 9_999_999 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects review-detail access for a non-company caller before attempt data is exposed", async () => {
    const candidate = appRouter.createCaller(createContext("candidate"));
    await expect(candidate.company.attempts.detail({ attemptId: 9_999_999 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
