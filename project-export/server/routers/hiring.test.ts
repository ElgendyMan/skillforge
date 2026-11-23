import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { canAccessAttemptAsset, canReportTechnicalIssue, canSaveAttemptState, canTransitionApplicationStatus, computePriority, hasValidFileSignature, isAttemptExpired, isEmailDeliveryConfigured, isIntegrityFlagEvent, preferAttemptSnapshot, shouldPublishFeedbackNotification } from "./hiring";

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

describe("file signature validation", () => {
  it("accepts supported signatures and rejects content/MIME mismatches", () => {
    expect(hasValidFileSignature(Buffer.from("%PDF-1.7"), "application/pdf")).toBe(true);
    expect(hasValidFileSignature(Buffer.from("not a pdf"), "application/pdf")).toBe(false);
    expect(hasValidFileSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBe(true);
    expect(hasValidFileSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg")).toBe(true);
    expect(hasValidFileSignature(Buffer.from("RIFFxxxxWEBP"), "image/webp")).toBe(true);
    expect(hasValidFileSignature(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01]), "video/webm")).toBe(true);
    expect(hasValidFileSignature(Buffer.from("xxxxftypisom"), "video/mp4")).toBe(true);
    expect(hasValidFileSignature(Buffer.from("text evidence"), "text/plain")).toBe(true);
    expect(hasValidFileSignature(Buffer.from([0x00, 0x01]), "text/plain")).toBe(false);
    expect(hasValidFileSignature(Buffer.from("text evidence"), "image/png")).toBe(false);
  });
});

describe("human-review triage", () => {
  it("uses the score as a bounded triage value and never applies a proctoring penalty", () => {
    expect(computePriority(80, null, 0)).toBe(80);
    expect(computePriority(90, 95, 2)).toBe(95);
    expect(computePriority(null, null, 20)).toBe(0);
  });

  it("keeps frozen attempt content when live test content changes later", () => {
    const frozen = [{ originalQuestionId: 12, prompt: "النص وقت بدء المحاولة" }];
    const live = [{ id: 12, prompt: "نص جديد بعد النشر" }];
    expect(preferAttemptSnapshot(frozen, live)).toEqual(frozen);
    expect(preferAttemptSnapshot([], live)).toEqual(live);
  });

  it("keeps technical signals contextual and exposes explicit attempt state rules", () => {
    expect(canSaveAttemptState("in_progress")).toBe(true);
    expect(canSaveAttemptState("paused_for_technical_issue")).toBe(true);
    expect(canSaveAttemptState("submitted")).toBe(false);
    expect(canReportTechnicalIssue("submitted")).toBe(false);
    expect(canReportTechnicalIssue("in_progress")).toBe(true);
    expect(isAttemptExpired(new Date(1_000), 1_001)).toBe(true);
    expect(isAttemptExpired(new Date(1_000), 999)).toBe(false);
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
