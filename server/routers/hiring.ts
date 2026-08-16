import { TRPCError } from "@trpc/server";
import { and, avg, count, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  attemptAnswers,
  candidateProfiles,
  companies,
  companyMembers,
  fileAssets,
  notifications,
  proctoringEvents,
  proctoringSessions,
  reviews,
  testAttempts,
  testQuestions,
  testSections,
  tests,
  users,
} from "../../drizzle/schema";
import { getCompanyForUser, getDb, isCompanyMember } from "../db";
import { storageGetSignedUrl, storagePut } from "../storage";
import { protectedProcedure, publicProcedure, router, supervisorProcedure } from "../_core/trpc";

const questionType = z.enum(["multiple_choice", "essay", "code", "vulnerability", "file_upload"]);
export const applicationStatus = z.enum(["accepted", "rejected", "under review"]);
const proctoringEvent = z.enum(["focus_lost", "focus_returned", "screen_stopped", "camera_stopped", "connection_lost", "connection_restored"]);

function forbidden(message = "You are not permitted to access this resource."): never {
  throw new TRPCError({ code: "FORBIDDEN", message });
}

function requireCandidate(role: string) {
  if (role !== "candidate") forbidden("Candidate access is required.");
}

function requireCompany(role: string) {
  if (role !== "company") forbidden("Company access is required.");
}

export function isEmailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

async function deliverEmail(input: { to: string | null; subject: string; text: string; idempotencyKey: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!isEmailDeliveryConfigured() || !apiKey || !from || !input.to) return "not_configured" as const;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text }),
    });
    return response.ok ? "sent" as const : "failed" as const;
  } catch {
    return "failed" as const;
  }
}

async function dbOrFail() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  return db;
}

async function ownedCandidateAttempt(userId: number, attemptId: number) {
  const db = await dbOrFail();
  const rows = await db.select().from(testAttempts).where(and(eq(testAttempts.id, attemptId), eq(testAttempts.candidateId, userId))).limit(1);
  if (!rows[0]) forbidden();
  return rows[0];
}

async function ownedCompanyAttempt(userId: number, attemptId: number) {
  const db = await dbOrFail();
  const rows = await db
    .select({ attempt: testAttempts, test: tests })
    .from(testAttempts)
    .innerJoin(tests, eq(testAttempts.testId, tests.id))
    .where(eq(testAttempts.id, attemptId))
    .limit(1);
  if (!rows[0] || !(await isCompanyMember(userId, rows[0].test.companyId))) forbidden();
  return rows[0];
}

export function computePriority(autoScore: number | null, reviewerScore: number | null, integrityFlags: number) {
  const base = reviewerScore ?? autoScore ?? 0;
  return Math.max(0, Math.min(100, Math.round(base - integrityFlags * 8 + (integrityFlags === 0 ? 8 : 0))));
}

export function isIntegrityFlagEvent(eventType: z.infer<typeof proctoringEvent>) {
  return eventType === "focus_lost" || eventType === "screen_stopped" || eventType === "camera_stopped";
}

export function canAccessAttemptAsset(input: { role: string; requestingUserId: number; assetOwnerUserId: number; isCompanyMember: boolean }) {
  return input.role === "supervisor" || input.requestingUserId === input.assetOwnerUserId || input.isCompanyMember;
}

export function canTransitionApplicationStatus(value: string) {
  return applicationStatus.safeParse(value).success;
}

export const catalogRouter = router({
  list: publicProcedure.input(z.object({
    search: z.string().trim().max(120).optional(),
    field: z.string().trim().max(120).optional(),
    level: z.enum(["junior", "mid", "senior"]).optional(),
    companyId: z.number().int().positive().optional(),
    maxDuration: z.number().int().positive().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await dbOrFail();
    const filters = [eq(tests.status, "published")];
    if (input?.field) filters.push(eq(tests.field, input.field));
    if (input?.level) filters.push(eq(tests.level, input.level));
    if (input?.companyId) filters.push(eq(tests.companyId, input.companyId));
    if (input?.maxDuration) filters.push(sql`${tests.durationMinutes} <= ${input.maxDuration}`);
    if (input?.search) filters.push(sql`(${tests.title} LIKE ${`%${input.search}%`} OR ${tests.summary} LIKE ${`%${input.search}%`})`);
    return db.select({ test: tests, company: companies }).from(tests).innerJoin(companies, eq(tests.companyId, companies.id)).where(and(...filters)).orderBy(desc(tests.createdAt));
  }),
  detail: publicProcedure.input(z.object({ testId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await dbOrFail();
    const testRow = await db.select({ test: tests, company: companies }).from(tests).innerJoin(companies, eq(tests.companyId, companies.id)).where(and(eq(tests.id, input.testId), eq(tests.status, "published"))).limit(1);
    if (!testRow[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Test not found." });
    const sections = await db.select().from(testSections).where(eq(testSections.testId, input.testId)).orderBy(testSections.sortOrder);
    const questions = sections.length ? await db.select().from(testQuestions).where(inArray(testQuestions.sectionId, sections.map(section => section.id))).orderBy(testQuestions.sortOrder) : [];
    return { ...testRow[0], sections, questionCount: questions.length, totalPoints: questions.reduce((sum, question) => sum + question.points, 0) };
  }),
  companyPage: publicProcedure.input(z.object({ slug: z.string().trim().min(2).max(180) })).query(async ({ input }) => {
    const db = await dbOrFail();
    const company = await db.select().from(companies).where(eq(companies.slug, input.slug)).limit(1);
    if (!company[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
    const publishedTests = await db.select().from(tests).where(and(eq(tests.companyId, company[0].id), eq(tests.status, "published"))).orderBy(desc(tests.createdAt));
    return { company: company[0], tests: publishedTests };
  }),
});

export const candidateRouter = router({
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      requireCandidate(ctx.user.role);
      const db = await dbOrFail();
      const rows = await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, ctx.user.id)).limit(1);
      return rows[0] ?? null;
    }),
    save: protectedProcedure.input(z.object({
      headline: z.string().trim().max(180).nullable(),
      bio: z.string().trim().max(5000).nullable(),
      skills: z.array(z.string().trim().min(1).max(80)).max(30),
      experience: z.array(z.object({ title: z.string().max(160), company: z.string().max(160), duration: z.string().max(80) })).max(15),
      portfolioLinks: z.array(z.object({ label: z.string().max(80), url: z.string().url().max(500) })).max(12),
    })).mutation(async ({ ctx, input }) => {
      requireCandidate(ctx.user.role);
      const db = await dbOrFail();
      await db.insert(candidateProfiles).values({ userId: ctx.user.id, ...input }).onDuplicateKeyUpdate({ set: { ...input } });
      return { success: true };
    }),
  }),
  attempts: router({
    start: protectedProcedure.input(z.object({ testId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireCandidate(ctx.user.role);
      const db = await dbOrFail();
      const testRow = await db.select().from(tests).where(and(eq(tests.id, input.testId), eq(tests.status, "published"))).limit(1);
      if (!testRow[0]) throw new TRPCError({ code: "NOT_FOUND", message: "This test is not available." });
      const prior = await db.select().from(testAttempts).where(and(eq(testAttempts.testId, input.testId), eq(testAttempts.candidateId, ctx.user.id))).limit(1);
      if (prior[0]) return prior[0];
      const expiresAt = new Date(Date.now() + testRow[0].durationMinutes * 60 * 1000);
      const result = await db.insert(testAttempts).values({ testId: input.testId, candidateId: ctx.user.id, expiresAt });
      const rows = await db.select().from(testAttempts).where(eq(testAttempts.id, Number(result[0].insertId))).limit(1);
      return rows[0];
    }),
    get: protectedProcedure.input(z.object({ attemptId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      requireCandidate(ctx.user.role);
      const attempt = await ownedCandidateAttempt(ctx.user.id, input.attemptId);
      const db = await dbOrFail();
      const testRow = await db.select().from(tests).where(eq(tests.id, attempt.testId)).limit(1);
      const sections = await db.select().from(testSections).where(eq(testSections.testId, attempt.testId)).orderBy(testSections.sortOrder);
      const questionRows = sections.length ? await db.select().from(testQuestions).where(inArray(testQuestions.sectionId, sections.map(section => section.id))).orderBy(testQuestions.sortOrder) : [];
      const answers = await db.select().from(attemptAnswers).where(eq(attemptAnswers.attemptId, attempt.id));
      const safeQuestions = questionRows.map(({ correctAnswers, evaluationGuide, ...question }) => question);
      return { attempt, test: testRow[0], sections, questions: safeQuestions, answers };
    }),
    saveAnswer: protectedProcedure.input(z.object({
      attemptId: z.number().int().positive(), questionId: z.number().int().positive(), textAnswer: z.string().max(20000).nullable().optional(),
      selectedOptionIds: z.array(z.string().max(100)).max(10).nullable().optional(), codeAnswer: z.string().max(50000).nullable().optional(), language: z.string().max(40).nullable().optional(), fileAssetId: z.number().int().positive().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      requireCandidate(ctx.user.role);
      const attempt = await ownedCandidateAttempt(ctx.user.id, input.attemptId);
      if (attempt.state !== "in_progress" || attempt.expiresAt.getTime() < Date.now()) forbidden("This attempt is no longer open for saving.");
      const db = await dbOrFail();
      const questionRows = await db.select({ question: testQuestions, section: testSections }).from(testQuestions).innerJoin(testSections, eq(testQuestions.sectionId, testSections.id)).where(eq(testQuestions.id, input.questionId)).limit(1);
      if (!questionRows[0] || questionRows[0].section.testId !== attempt.testId) forbidden();
      const values = { attemptId: input.attemptId, questionId: input.questionId, textAnswer: input.textAnswer ?? null, selectedOptionIds: input.selectedOptionIds ?? null, codeAnswer: input.codeAnswer ?? null, language: input.language ?? null, fileAssetId: input.fileAssetId ?? null };
      await db.insert(attemptAnswers).values(values).onDuplicateKeyUpdate({ set: { ...values, savedAt: new Date() } });
      return { savedAt: new Date() };
    }),
    submit: protectedProcedure.input(z.object({ attemptId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireCandidate(ctx.user.role);
      const attempt = await ownedCandidateAttempt(ctx.user.id, input.attemptId);
      if (attempt.state !== "in_progress") forbidden("This attempt has already been submitted.");
      const db = await dbOrFail();
      const sections = await db.select().from(testSections).where(eq(testSections.testId, attempt.testId));
      const questionRows = sections.length ? await db.select().from(testQuestions).where(inArray(testQuestions.sectionId, sections.map(section => section.id))) : [];
      const answers = await db.select().from(attemptAnswers).where(eq(attemptAnswers.attemptId, attempt.id));
      const answerMap = new Map(answers.map(answer => [answer.questionId, answer]));
      const autoQuestions = questionRows.filter(question => question.type === "multiple_choice" && question.correctAnswers);
      const earned = autoQuestions.reduce((total, question) => {
        const candidateAnswer = answerMap.get(question.id)?.selectedOptionIds ?? [];
        const isCorrect = candidateAnswer.length === question.correctAnswers!.length && candidateAnswer.every(id => question.correctAnswers!.includes(id));
        return total + (isCorrect ? question.points : 0);
      }, 0);
      const total = autoQuestions.reduce((sum, question) => sum + question.points, 0);
      const autoScore = total ? Math.round((earned / total) * 100) : null;
      const priorityScore = computePriority(autoScore, null, attempt.integrityFlags);
      await db.update(testAttempts).set({ state: "submitted", submittedAt: new Date(), autoScore, priorityScore, applicationStatus: "under review" }).where(eq(testAttempts.id, attempt.id));
      const testRow = await db.select().from(tests).where(eq(tests.id, attempt.testId)).limit(1);
      const members = testRow[0] ? await db.select({ userId: companyMembers.userId, email: users.email }).from(companyMembers).innerJoin(users, eq(companyMembers.userId, users.id)).where(eq(companyMembers.companyId, testRow[0].companyId)) : [];
      const notificationsToCreate = await Promise.all(members.map(async member => ({
        userId: member.userId,
        type: "attempt_submitted" as const,
        title: "New assessment submission",
        content: "A candidate submitted a technical assessment and it is ready for review.",
        emailStatus: await deliverEmail({ to: member.email, subject: "New SkillForge assessment submission", text: "A candidate submitted a technical assessment and it is ready for review in SkillForge.", idempotencyKey: `attempt-submitted-${attempt.id}-${member.userId}` }),
      })));
      if (notificationsToCreate.length) await db.insert(notifications).values(notificationsToCreate);
      return { autoScore, priorityScore, applicationStatus: "under review" as const };
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      requireCandidate(ctx.user.role);
      const db = await dbOrFail();
      return db.select({ attempt: testAttempts, test: tests, company: companies }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).innerJoin(companies, eq(tests.companyId, companies.id)).where(eq(testAttempts.candidateId, ctx.user.id)).orderBy(desc(testAttempts.updatedAt));
    }),
  }),
});

export const accountRouter = router({
  activateCompany: protectedProcedure.input(z.object({
    name: z.string().trim().min(2).max(180),
    slug: z.string().trim().regex(/^[a-z0-9-]+$/).min(2).max(180),
    description: z.string().max(5000).nullable(),
    website: z.string().url().max(500).nullable(),
    industry: z.string().max(120).nullable(),
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role === "supervisor") forbidden("Supervisor accounts cannot create company workspaces.");
    const existing = await getCompanyForUser(ctx.user.id);
    if (existing) return { companyId: existing.company.id, activated: false };
    const db = await dbOrFail();
    const result = await db.insert(companies).values(input);
    const companyId = Number(result[0].insertId);
    await db.insert(companyMembers).values({ companyId, userId: ctx.user.id, memberRole: "owner" });
    await db.update(users).set({ role: "company" }).where(eq(users.id, ctx.user.id));
    return { companyId, activated: true };
  }),
});

export const companyRouter = router({
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      requireCompany(ctx.user.role);
      return getCompanyForUser(ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(180), slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(180), description: z.string().max(5000).nullable(), website: z.string().url().max(500).nullable(), industry: z.string().max(120).nullable() })).mutation(async ({ ctx, input }) => {
      requireCompany(ctx.user.role);
      if (await getCompanyForUser(ctx.user.id)) forbidden("This account already belongs to a company.");
      const db = await dbOrFail();
      const result = await db.insert(companies).values(input);
      const companyId = Number(result[0].insertId);
      await db.insert(companyMembers).values({ companyId, userId: ctx.user.id, memberRole: "owner" });
      return { companyId };
    }),
    update: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(180), description: z.string().max(5000).nullable(), website: z.string().url().max(500).nullable(), industry: z.string().max(120).nullable() })).mutation(async ({ ctx, input }) => {
      requireCompany(ctx.user.role);
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) forbidden();
      const db = await dbOrFail();
      await db.update(companies).set(input).where(eq(companies.id, membership.company.id));
      return { success: true };
    }),
    uploadLogo: protectedProcedure.input(z.object({ fileName: z.string().trim().min(1).max(300), mimeType: z.string().trim().regex(/^image\/(png|jpeg|webp|svg\+xml)$/).max(160), dataBase64: z.string().min(1).max(3_000_000) })).mutation(async ({ ctx, input }) => {
      requireCompany(ctx.user.role);
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) forbidden();
      const data = Buffer.from(input.dataBase64, "base64");
      if (!data.length || data.length > 2 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Company logos must be smaller than 2 MB." });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const stored = await storagePut(`companies/${membership.company.id}/logo/${safeName}`, data, input.mimeType);
      const db = await dbOrFail();
      await db.insert(fileAssets).values({ ownerUserId: ctx.user.id, companyId: membership.company.id, category: "company_logo", storageKey: stored.key, originalName: input.fileName, mimeType: input.mimeType, byteSize: data.length });
      await db.update(companies).set({ logoKey: stored.key }).where(eq(companies.id, membership.company.id));
      return { url: stored.url };
    }),
  }),
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    requireCompany(ctx.user.role);
    const membership = await getCompanyForUser(ctx.user.id);
    if (!membership) return null;
    const db = await dbOrFail();
    const companyId = membership.company.id;
    const [testCount] = await db.select({ value: count() }).from(tests).where(and(eq(tests.companyId, companyId), eq(tests.status, "published")));
    const [attemptCount] = await db.select({ value: count() }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).where(eq(tests.companyId, companyId));
    const [pendingCount] = await db.select({ value: count() }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).where(and(eq(tests.companyId, companyId), eq(testAttempts.applicationStatus, "under review")));
    const [score] = await db.select({ value: avg(testAttempts.reviewerScore) }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).where(eq(tests.companyId, companyId));
    const recent = await db.select({ attempt: testAttempts, test: tests, candidate: users }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).innerJoin(users, eq(testAttempts.candidateId, users.id)).where(eq(tests.companyId, companyId)).orderBy(desc(testAttempts.updatedAt)).limit(6);
    return { company: membership.company, metrics: { publishedTests: testCount.value, attempts: attemptCount.value, pendingReview: pendingCount.value, averagePerformance: Math.round(Number(score.value ?? 0)) }, recent };
  }),
  tests: router({
    create: protectedProcedure.input(z.object({
      title: z.string().trim().min(3).max(220), summary: z.string().trim().min(20).max(5000), field: z.string().trim().min(2).max(120), level: z.enum(["junior", "mid", "senior"]), durationMinutes: z.number().int().min(5).max(480), status: z.enum(["draft", "published"]), proctoringMode: z.enum(["none", "optional", "required"]),
      sections: z.array(z.object({ title: z.string().trim().min(2).max(180), instructions: z.string().max(2000).nullable().optional(), questions: z.array(z.object({ type: questionType, prompt: z.string().trim().min(3).max(10000), guidance: z.string().max(3000).nullable().optional(), points: z.number().int().min(1).max(100), options: z.array(z.object({ id: z.string().min(1).max(100), label: z.string().min(1).max(500) })).max(8).nullable().optional(), correctAnswers: z.array(z.string().min(1).max(100)).max(8).nullable().optional(), evaluationGuide: z.string().max(3000).nullable().optional(), starterCode: z.string().max(20000).nullable().optional(), supportedLanguages: z.array(z.string().max(40)).max(10).nullable().optional() })).min(1).max(30) })).min(1).max(12),
    })).mutation(async ({ ctx, input }) => {
      requireCompany(ctx.user.role);
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) forbidden("Create a company profile before publishing a test.");
      const db = await dbOrFail();
      const result = await db.insert(tests).values({ companyId: membership.company.id, title: input.title, summary: input.summary, field: input.field, level: input.level, durationMinutes: input.durationMinutes, status: input.status, proctoringMode: input.proctoringMode });
      const testId = Number(result[0].insertId);
      for (let sectionIndex = 0; sectionIndex < input.sections.length; sectionIndex += 1) {
        const section = input.sections[sectionIndex];
        const sectionResult = await db.insert(testSections).values({ testId, title: section.title, instructions: section.instructions ?? null, sortOrder: sectionIndex });
        const sectionId = Number(sectionResult[0].insertId);
        if (section.questions.length) await db.insert(testQuestions).values(section.questions.map((question, questionIndex) => ({ sectionId, type: question.type, prompt: question.prompt, guidance: question.guidance ?? null, points: question.points, options: question.options ?? null, correctAnswers: question.correctAnswers ?? null, evaluationGuide: question.evaluationGuide ?? null, starterCode: question.starterCode ?? null, supportedLanguages: question.supportedLanguages ?? null, sortOrder: questionIndex })));
      }
      return { testId };
    }),
    mine: protectedProcedure.query(async ({ ctx }) => {
      requireCompany(ctx.user.role);
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return [];
      const db = await dbOrFail();
      return db.select().from(tests).where(eq(tests.companyId, membership.company.id)).orderBy(desc(tests.updatedAt));
    }),
  }),
  attempts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      requireCompany(ctx.user.role);
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return [];
      const db = await dbOrFail();
      return db.select({ attempt: testAttempts, test: tests, candidate: users, profile: candidateProfiles }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).innerJoin(users, eq(testAttempts.candidateId, users.id)).leftJoin(candidateProfiles, eq(candidateProfiles.userId, users.id)).where(eq(tests.companyId, membership.company.id)).orderBy(desc(testAttempts.priorityScore));
    }),
    review: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), score: z.number().int().min(0).max(100), decision: applicationStatus, notes: z.string().max(6000).nullable() })).mutation(async ({ ctx, input }) => {
      requireCompany(ctx.user.role);
      const owned = await ownedCompanyAttempt(ctx.user.id, input.attemptId);
      if (owned.attempt.state !== "submitted") forbidden("Only submitted attempts may be reviewed.");
      const db = await dbOrFail();
      const priorityScore = computePriority(owned.attempt.autoScore, input.score, owned.attempt.integrityFlags);
      await db.update(testAttempts).set({ reviewerScore: input.score, applicationStatus: input.decision, priorityScore }).where(eq(testAttempts.id, input.attemptId));
      await db.insert(reviews).values({ attemptId: input.attemptId, reviewerUserId: ctx.user.id, score: input.score, decision: input.decision, notes: input.notes ?? null }).onDuplicateKeyUpdate({ set: { reviewerUserId: ctx.user.id, score: input.score, decision: input.decision, notes: input.notes ?? null } });
      const candidate = await db.select({ email: users.email }).from(users).where(eq(users.id, owned.attempt.candidateId)).limit(1);
      const emailStatus = await deliverEmail({ to: candidate[0]?.email ?? null, subject: "Your SkillForge application status changed", text: `Your assessment application is now ${input.decision}.`, idempotencyKey: `status-changed-${input.attemptId}-${input.decision}` });
      await db.insert(notifications).values({ userId: owned.attempt.candidateId, type: "status_changed", title: "Application status updated", content: `Your assessment application is now ${input.decision}.`, emailStatus });
      return { priorityScore };
    }),
    detail: protectedProcedure.input(z.object({ attemptId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      requireCompany(ctx.user.role);
      const owned = await ownedCompanyAttempt(ctx.user.id, input.attemptId);
      const db = await dbOrFail();
      const sections = await db.select().from(testSections).where(eq(testSections.testId, owned.test.id));
      const questions = sections.length ? await db.select().from(testQuestions).where(inArray(testQuestions.sectionId, sections.map(section => section.id))) : [];
      const answers = await db.select().from(attemptAnswers).where(eq(attemptAnswers.attemptId, input.attemptId));
      const session = await db.select().from(proctoringSessions).where(eq(proctoringSessions.attemptId, input.attemptId)).limit(1);
      const events = session[0] ? await db.select().from(proctoringEvents).where(eq(proctoringEvents.sessionId, session[0].id)).orderBy(proctoringEvents.occurredAt) : [];
      const candidate = await db.select({ user: users, profile: candidateProfiles }).from(users).leftJoin(candidateProfiles, eq(candidateProfiles.userId, users.id)).where(eq(users.id, owned.attempt.candidateId)).limit(1);
      return { ...owned, candidate: candidate[0], sections, questions, answers, session: session[0] ?? null, events };
    }),
  }),
});

export const proctoringRouter = router({
  start: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), consentCamera: z.boolean(), consentScreen: z.boolean(), consentRecording: z.boolean() })).mutation(async ({ ctx, input }) => {
    requireCandidate(ctx.user.role);
    const attempt = await ownedCandidateAttempt(ctx.user.id, input.attemptId);
    const db = await dbOrFail();
    const testRow = await db.select().from(tests).where(eq(tests.id, attempt.testId)).limit(1);
    if (!testRow[0] || testRow[0].proctoringMode === "none") forbidden("Proctoring is disabled for this test.");
    if (testRow[0].proctoringMode === "required" && (!input.consentCamera || !input.consentScreen || !input.consentRecording)) forbidden("This test requires explicit camera, screen, and recording consent.");
    if (!input.consentCamera && !input.consentScreen && !input.consentRecording) forbidden("At least one explicit consent is required to start proctoring.");
    await db.insert(proctoringSessions).values({ attemptId: input.attemptId, candidateId: ctx.user.id, consentCamera: input.consentCamera, consentScreen: input.consentScreen, consentRecording: input.consentRecording, consentedAt: new Date() }).onDuplicateKeyUpdate({ set: { consentCamera: input.consentCamera, consentScreen: input.consentScreen, consentRecording: input.consentRecording, consentedAt: new Date(), endedAt: null } });
    const session = await db.select().from(proctoringSessions).where(eq(proctoringSessions.attemptId, input.attemptId)).limit(1);
    return session[0];
  }),
  logEvent: protectedProcedure.input(z.object({ sessionId: z.number().int().positive(), eventType: proctoringEvent, detail: z.string().max(500).nullable().optional() })).mutation(async ({ ctx, input }) => {
    requireCandidate(ctx.user.role);
    const db = await dbOrFail();
    const session = await db.select().from(proctoringSessions).where(and(eq(proctoringSessions.id, input.sessionId), eq(proctoringSessions.candidateId, ctx.user.id))).limit(1);
    if (!session[0]) forbidden();
    await db.insert(proctoringEvents).values({ sessionId: input.sessionId, eventType: input.eventType, detail: input.detail ?? null });
    if (isIntegrityFlagEvent(input.eventType)) await db.update(testAttempts).set({ integrityFlags: sql`${testAttempts.integrityFlags} + 1` }).where(eq(testAttempts.id, session[0].attemptId));
    return { success: true };
  }),
  finish: protectedProcedure.input(z.object({ sessionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requireCandidate(ctx.user.role);
    const db = await dbOrFail();
    const rows = await db.select().from(proctoringSessions).where(and(eq(proctoringSessions.id, input.sessionId), eq(proctoringSessions.candidateId, ctx.user.id))).limit(1);
    if (!rows[0]) forbidden();
    await db.update(proctoringSessions).set({ endedAt: new Date() }).where(eq(proctoringSessions.id, input.sessionId));
    return { success: true };
  }),
});

export const fileRouter = router({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrFail();
    if (ctx.user.role === "candidate") {
      return db.select({ asset: fileAssets, test: tests, company: companies }).from(fileAssets).leftJoin(testAttempts, eq(fileAssets.attemptId, testAttempts.id)).leftJoin(tests, eq(testAttempts.testId, tests.id)).leftJoin(companies, eq(tests.companyId, companies.id)).where(eq(fileAssets.ownerUserId, ctx.user.id)).orderBy(desc(fileAssets.createdAt));
    }
    if (ctx.user.role === "company") {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return [];
      return db.select({ asset: fileAssets, test: tests, company: companies }).from(fileAssets).innerJoin(testAttempts, eq(fileAssets.attemptId, testAttempts.id)).innerJoin(tests, eq(testAttempts.testId, tests.id)).innerJoin(companies, eq(tests.companyId, companies.id)).where(eq(tests.companyId, membership.company.id)).orderBy(desc(fileAssets.createdAt));
    }
    return db.select({ asset: fileAssets, test: tests, company: companies }).from(fileAssets).leftJoin(testAttempts, eq(fileAssets.attemptId, testAttempts.id)).leftJoin(tests, eq(testAttempts.testId, tests.id)).leftJoin(companies, eq(tests.companyId, companies.id)).orderBy(desc(fileAssets.createdAt)).limit(100);
  }),
  upload: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), category: z.enum(["evidence", "code_project", "camera_recording", "screen_recording"]), fileName: z.string().trim().min(1).max(300), mimeType: z.string().trim().min(3).max(160), dataBase64: z.string().min(1).max(14_000_000) })).mutation(async ({ ctx, input }) => {
    const attempt = await ownedCandidateAttempt(ctx.user.id, input.attemptId);
    requireCandidate(ctx.user.role);
    const data = Buffer.from(input.dataBase64, "base64");
    if (!data.length || data.length > 10 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Files must be smaller than 10 MB." });
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const stored = await storagePut(`attempts/${attempt.id}/${ctx.user.id}/${safeName}`, data, input.mimeType);
    const db = await dbOrFail();
    const result = await db.insert(fileAssets).values({ ownerUserId: ctx.user.id, attemptId: attempt.id, category: input.category, storageKey: stored.key, originalName: input.fileName, mimeType: input.mimeType, byteSize: data.length });
    const assetId = Number(result[0].insertId);
    if (input.category === "camera_recording") {
      await db.update(proctoringSessions).set({ cameraRecordingAssetId: assetId }).where(eq(proctoringSessions.attemptId, attempt.id));
    }
    if (input.category === "screen_recording") {
      await db.update(proctoringSessions).set({ screenRecordingAssetId: assetId }).where(eq(proctoringSessions.attemptId, attempt.id));
    }
    return { assetId, fileName: input.fileName };
  }),
  secureAccess: protectedProcedure.input(z.object({ assetId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrFail();
    const asset = await db.select().from(fileAssets).where(eq(fileAssets.id, input.assetId)).limit(1);
    if (!asset[0]) throw new TRPCError({ code: "NOT_FOUND", message: "File not found." });
    let companyMember = false;
    if (asset[0].attemptId) {
      const attempt = await db.select({ test: tests }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).where(eq(testAttempts.id, asset[0].attemptId)).limit(1);
      companyMember = Boolean(attempt[0] && await isCompanyMember(ctx.user.id, attempt[0].test.companyId));
    }
    const allowed = canAccessAttemptAsset({ role: ctx.user.role, requestingUserId: ctx.user.id, assetOwnerUserId: asset[0].ownerUserId, isCompanyMember: companyMember });
    if (!allowed) forbidden();
    const url = await storageGetSignedUrl(asset[0].storageKey);
    return { url, fileName: asset[0].originalName, mimeType: asset[0].mimeType };
  }),
});

export const notificationRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrFail();
    return db.select().from(notifications).where(eq(notifications.userId, ctx.user.id)).orderBy(desc(notifications.createdAt));
  }),
  markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrFail();
    const result = await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, ctx.user.id)));
    if (!result[0].affectedRows) forbidden();
    return { success: true };
  }),
});

export const supervisorRouter = router({
  overview: supervisorProcedure.query(async () => {
    const db = await dbOrFail();
    const [candidateCount] = await db.select({ value: count() }).from(users).where(eq(users.role, "candidate"));
    const [companyCount] = await db.select({ value: count() }).from(companies);
    const [testCount] = await db.select({ value: count() }).from(tests);
    const [attemptCount] = await db.select({ value: count() }).from(testAttempts);
    return { candidateCount: candidateCount.value, companyCount: companyCount.value, testCount: testCount.value, attemptCount: attemptCount.value };
  }),
  attempts: supervisorProcedure.query(async () => {
    const db = await dbOrFail();
    return db.select({ attempt: testAttempts, test: tests, candidate: users, company: companies }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).innerJoin(users, eq(testAttempts.candidateId, users.id)).innerJoin(companies, eq(tests.companyId, companies.id)).orderBy(desc(testAttempts.updatedAt)).limit(100);
  }),
});
