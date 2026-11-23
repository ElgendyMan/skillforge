import { and, eq, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { appeals, attemptQuestionSnapshots, attemptSectionSnapshots, auditLogs, fileAssets, testAttempts, testQuestions, tests, users } from "../drizzle/schema";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";

function contextFor(user: typeof users.$inferSelect): TrpcContext {
  return {
    user,
    req: { protocol: "http", headers: { "x-skillforge-mock-role": user.role } } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("seeded mock-data authorization", () => {
  it("keeps candidate attempts private and exposes company/supervisor data only through their roles", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const mockUsers = await db.select().from(users).where(like(users.openId, "sf-mock-%"));
    const candidate = mockUsers.find(user => user.openId === "sf-mock-candidate");
    const otherCandidate = mockUsers.find(user => user.openId === "sf-mock-candidate-01");
    const company = mockUsers.find(user => user.openId === "sf-mock-company");
    const supervisor = mockUsers.find(user => user.openId === "sf-mock-supervisor");
    expect(candidate?.role).toBe("candidate");
    expect(otherCandidate?.role).toBe("candidate");
    expect(company?.role).toBe("company");
    expect(supervisor?.role).toBe("supervisor");
    if (!candidate || !otherCandidate || !company || !supervisor) return;

    const candidateCaller = appRouter.createCaller(contextFor(candidate));
    const otherCandidateCaller = appRouter.createCaller(contextFor(otherCandidate));
    const companyCaller = appRouter.createCaller(contextFor(company));
    const supervisorCaller = appRouter.createCaller(contextFor(supervisor));

    const ownAttempts = await candidateCaller.candidate.attempts.list();
    expect(ownAttempts.length).toBeGreaterThan(0);
    expect(ownAttempts.every(row => row.attempt.candidateId === candidate.id)).toBe(true);
    expect((await companyCaller.company.dashboard()).metrics.attempts).toBeGreaterThan(0);
    expect((await supervisorCaller.supervisor.overview()).attemptCount).toBeGreaterThan(0);

    const ownAttemptId = ownAttempts[0]!.attempt.id;
    await expect(otherCandidateCaller.candidate.attempts.get({ attemptId: ownAttemptId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(candidateCaller.company.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(companyCaller.candidate.attempts.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(candidateCaller.supervisor.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  }, 15_000);

  it("serves frozen question content consistently to candidate and company review", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;
    const mockUsers = await db.select().from(users).where(like(users.openId, "sf-mock-%"));
    const candidate = mockUsers.find(user => user.openId === "sf-mock-candidate");
    const company = mockUsers.find(user => user.openId === "sf-mock-company");
    if (!candidate || !company) return;
    const candidateCaller = appRouter.createCaller(contextFor(candidate));
    const companyCaller = appRouter.createCaller(contextFor(company));
    const existingAttempts = await candidateCaller.candidate.attempts.list();
    const existingTestIds = new Set(existingAttempts.map(row => row.attempt.testId));
    const publishedTests = await db.select().from(tests).where(eq(tests.status, "published"));
    const testToStart = publishedTests.find(test => !existingTestIds.has(test.id));
    expect(testToStart).toBeTruthy();
    if (!testToStart) return;
    const started = await candidateCaller.candidate.attempts.start({ testId: testToStart.id });
    const attemptId = started.id;
    const snapshots = await db.select().from(attemptQuestionSnapshots).where(eq(attemptQuestionSnapshots.attemptId, attemptId));
    expect(snapshots.length).toBeGreaterThan(0);
    const firstSnapshot = snapshots[0]!;
    const originalQuestion = await db.select({ prompt: testQuestions.prompt }).from(testQuestions).where(eq(testQuestions.id, firstSnapshot.originalQuestionId)).limit(1);
    expect(originalQuestion[0]).toBeTruthy();
    if (!originalQuestion[0]) return;
    const changedPrompt = "تعديل لاحق للمحتوى — يجب ألا يظهر داخل محاولة بدأت بالفعل";
    await db.update(testQuestions).set({ prompt: changedPrompt }).where(eq(testQuestions.id, firstSnapshot.originalQuestionId));
    try {
      const candidateView = await candidateCaller.candidate.attempts.get({ attemptId });
      const companyView = await companyCaller.company.attempts.detail({ attemptId });
      const expectedPrompts = new Map(snapshots.map(snapshot => [snapshot.originalQuestionId, snapshot.prompt]));
      expect(candidateView.questions).toHaveLength(snapshots.length);
      expect(companyView.questions).toHaveLength(snapshots.length);
      for (const question of candidateView.questions) expect(question.prompt).toBe(expectedPrompts.get(question.id));
      for (const question of companyView.questions) expect(question.prompt).toBe(expectedPrompts.get(question.id));
      expect(candidateView.questions.some(question => question.prompt === changedPrompt)).toBe(false);
      expect(companyView.questions.some(question => question.prompt === changedPrompt)).toBe(false);
    } finally {
      await db.update(testQuestions).set({ prompt: originalQuestion[0].prompt }).where(eq(testQuestions.id, firstSnapshot.originalQuestionId));
      await db.delete(attemptQuestionSnapshots).where(eq(attemptQuestionSnapshots.attemptId, attemptId));
      await db.delete(attemptSectionSnapshots).where(eq(attemptSectionSnapshots.attemptId, attemptId));
      await db.delete(testAttempts).where(eq(testAttempts.id, attemptId));
    }
  }, 15_000);

  it("records technical pauses and permits appeals only for final decisions", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;
    const mockUsers = await db.select().from(users).where(like(users.openId, "sf-mock-%"));
    const candidate = mockUsers.find(user => user.openId === "sf-mock-candidate");
    if (!candidate) return;
    const candidateCaller = appRouter.createCaller(contextFor(candidate));
    const attempts = await candidateCaller.candidate.attempts.list();
    const openAttempt = attempts.find(row => row.attempt.state === "in_progress");
    const finalAttempt = attempts.find(row => row.attempt.applicationStatus === "accepted" || row.attempt.applicationStatus === "rejected");
    expect(openAttempt).toBeTruthy();
    expect(finalAttempt).toBeTruthy();
    if (!openAttempt || !finalAttempt) return;

    const originalState = openAttempt.attempt.state;
    const originalReason = openAttempt.attempt.technicalIssueReason;
    let appealId: number | null = null;
    try {
      const pauseResult = await candidateCaller.candidate.attempts.reportTechnicalIssue({ attemptId: openAttempt.attempt.id, reason: "انقطع الاتصال أثناء حفظ الإجابة." });
      expect(pauseResult).toEqual({ success: true, state: "paused_for_technical_issue" });
      const paused = await candidateCaller.candidate.attempts.get({ attemptId: openAttempt.attempt.id });
      expect(paused.attempt.state).toBe("paused_for_technical_issue");
      expect(paused.attempt.technicalIssueReason).toBe("انقطع الاتصال أثناء حفظ الإجابة.");

      const appealResult = await candidateCaller.candidate.appeals.create({ attemptId: finalAttempt.attempt.id, reason: "أطلب مراجعة بشرية للقرار بسبب معلومات إضافية مرتبطة بإجابتي." });
      appealId = appealResult.appealId;
      expect(appealResult.status).toBe("open");
      const listed = await candidateCaller.candidate.appeals.list();
      expect(listed.some(appeal => appeal.id === appealId && appeal.attemptId === finalAttempt.attempt.id)).toBe(true);
      await expect(candidateCaller.candidate.appeals.create({ attemptId: openAttempt.attempt.id, reason: "هذا الطلب غير مسموح قبل قرار نهائي." })).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await db.update(testAttempts).set({ state: originalState, technicalIssueReason: originalReason }).where(eq(testAttempts.id, openAttempt.attempt.id));
      if (appealId) {
        await db.delete(appeals).where(eq(appeals.id, appealId));
        await db.delete(auditLogs).where(and(eq(auditLogs.action, "appeal.created"), eq(auditLogs.entityId, finalAttempt.attempt.id), eq(auditLogs.actorUserId, candidate.id)));
      }
      await db.delete(auditLogs).where(and(eq(auditLogs.action, "attempt.technical_issue_reported"), eq(auditLogs.entityId, openAttempt.attempt.id), eq(auditLogs.actorUserId, candidate.id)));
    }
  }, 15_000);

  it("returns the approved no-camera alternative when starting a candidate attempt", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;
    const mockUsers = await db.select().from(users).where(like(users.openId, "sf-mock-%"));
    const candidate = mockUsers.find(user => user.openId === "sf-mock-candidate");
    if (!candidate) return;
    const candidateCaller = appRouter.createCaller(contextFor(candidate));
    const attempts = await candidateCaller.candidate.attempts.list();
    const attempt = attempts[0];
    expect(attempt).toBeTruthy();
    if (!attempt) return;
    const started = await candidateCaller.candidate.attempts.start({ testId: attempt.test.id });
    expect(started.proctoringAlternative).toBe(true);
    const readBack = await candidateCaller.candidate.attempts.get({ attemptId: started.id });
    expect(readBack.proctoringAlternative).toBe(true);
  }, 15_000);

  it("blocks pending or quarantined file access until supervisor review", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;
    const mockUsers = await db.select().from(users).where(like(users.openId, "sf-mock-%"));
    const candidate = mockUsers.find(user => user.openId === "sf-mock-candidate");
    const supervisor = mockUsers.find(user => user.openId === "sf-mock-supervisor");
    if (!candidate || !supervisor) return;
    const candidateCaller = appRouter.createCaller(contextFor(candidate));
    const supervisorCaller = appRouter.createCaller(contextFor(supervisor));
    const files = await candidateCaller.files.listMine();
    const file = files[0]?.asset;
    expect(file).toBeTruthy();
    if (!file) return;
    const originalStatus = file.securityStatus;
    try {
      const reviewed = await supervisorCaller.files.reviewSecurity({ assetId: file.id, status: "quarantined" });
      expect(reviewed).toEqual({ success: true, status: "quarantined" });
      await expect(candidateCaller.files.secureAccess({ assetId: file.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(candidateCaller.files.reviewSecurity({ assetId: file.id, status: "available" })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await supervisorCaller.files.reviewSecurity({ assetId: file.id, status: "available" });
    } finally {
      await db.update(fileAssets).set({ securityStatus: originalStatus }).where(eq(fileAssets.id, file.id));
    }
  }, 15_000);

  it("has seeded rows owned by the expected fixture boundaries", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;
    const [candidate] = await db.select({ id: users.id }).from(users).where(eq(users.openId, "sf-mock-candidate")).limit(1);
    const rows = candidate ? await db.select({ id: testAttempts.id }).from(testAttempts).where(and(eq(testAttempts.candidateId, candidate.id))) : [];
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });
});
