import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { z } from "zod";
import { attemptAnswers, attemptQuestionSnapshots, candidateAnnotations, candidateProfiles, codeReviewComments, comparisonFilterTemplates, notifications, testAttempts, testQuestions, testSections, tests, users } from "../../drizzle/schema";
import { getCompanyForUser, getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const comparisonQuestionType = z.enum(["multiple_choice", "essay", "code", "vulnerability", "file_upload"]);
export type ComparisonQuestionType = z.infer<typeof comparisonQuestionType>;
export type ComparisonFilters = { jobTitle?: string; questionType?: ComparisonQuestionType; submittedFrom?: Date; submittedTo?: Date };
const comparisonFilterInput = z.object({ jobTitle: z.string().trim().min(1).max(180).optional(), questionType: comparisonQuestionType.optional(), submittedFrom: z.coerce.date().optional(), submittedTo: z.coerce.date().optional() }).refine(input => !input.submittedFrom || !input.submittedTo || input.submittedFrom <= input.submittedTo, { message: "Submitted-date range is invalid." });

export function hasCompanyReviewAccess(role: string) { return role === "company"; }
export function comparedAttemptsMatchRequest(requestedIds: number[], foundAttemptIds: number[]) { return requestedIds.length === foundAttemptIds.length && requestedIds.every(id => foundAttemptIds.includes(id)); }
export function canRemoveCodeReviewComment(input: { isCompanyOwner: boolean; isOriginalReviewer: boolean }) { return input.isCompanyOwner && input.isOriginalReviewer; }
export function canRemoveComparisonTemplate(input: { isCompanyOwner: boolean; isOriginalCreator: boolean }) { return input.isCompanyOwner && input.isOriginalCreator; }
export function isFinalApplicationStatus(status: string) { return status === "accepted" || status === "rejected"; }
export function isWithinSubmittedRange(submittedAt: Date | null, filters: Pick<ComparisonFilters, "submittedFrom" | "submittedTo">) { return Boolean(submittedAt) && (!filters.submittedFrom || submittedAt! >= filters.submittedFrom) && (!filters.submittedTo || submittedAt! <= filters.submittedTo); }
export function isValidCodeCommentLine(lineNumber: number, code: string | null) { return Number.isInteger(lineNumber) && lineNumber >= 1 && lineNumber <= Math.max(1, (code ?? "").split("\n").length); }
export function normalizeCandidateTags(tags: string[]) { return Array.from(new Set(tags.map(tag => tag.trim().replace(/\s+/g, " ")).filter(Boolean))).slice(0, 12); }

function requireCompany(role: string) { if (!hasCompanyReviewAccess(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Company access is required." }); }
async function dbOrFail() { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); return db; }
async function requireCompanyAttempt(userId: number, attemptId: number) { const company = await getCompanyForUser(userId); if (!company) throw new TRPCError({ code: "FORBIDDEN", message: "Company membership is required." }); const db = await dbOrFail(); const rows = await db.select({ attempt: testAttempts, test: tests }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).where(and(eq(testAttempts.id, attemptId), eq(tests.companyId, company.company.id))).limit(1); if (!rows[0]) throw new TRPCError({ code: "FORBIDDEN", message: "This attempt is not owned by your company." }); return { db, company: company.company, attempt: rows[0].attempt, test: rows[0].test }; }

async function comparisonRowsForCompany(userId: number, filters: ComparisonFilters, attemptIds?: number[]) {
  const company = await getCompanyForUser(userId);
  if (!company) throw new TRPCError({ code: "FORBIDDEN", message: "Company membership is required." });
  const db = await dbOrFail();
  const conditions = [eq(tests.companyId, company.company.id), eq(testAttempts.state, "submitted")];
  if (attemptIds) conditions.push(inArray(testAttempts.id, attemptIds));
  if (filters.jobTitle) conditions.push(or(eq(tests.jobTitle, filters.jobTitle), eq(tests.title, filters.jobTitle))!);
  if (filters.submittedFrom) conditions.push(gte(testAttempts.submittedAt, filters.submittedFrom));
  if (filters.submittedTo) conditions.push(lte(testAttempts.submittedAt, filters.submittedTo));
  const rows = await db.select({ attempt: testAttempts, test: tests, candidate: users, profile: candidateProfiles }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).innerJoin(users, eq(testAttempts.candidateId, users.id)).leftJoin(candidateProfiles, eq(candidateProfiles.userId, users.id)).where(and(...conditions));
  const testIds = Array.from(new Set(rows.map(row => row.test.id)));
  const sections = testIds.length ? await db.select().from(testSections).where(inArray(testSections.testId, testIds)) : [];
  const questions = sections.length ? await db.select().from(testQuestions).where(inArray(testQuestions.sectionId, sections.map(section => section.id))) : [];
  const sectionTestId = new Map(sections.map(section => [section.id, section.testId]));
  const questionTypesByTest = new Map<number, ComparisonQuestionType[]>();
  for (const question of questions) { const testId = sectionTestId.get(question.sectionId); if (testId) questionTypesByTest.set(testId, Array.from(new Set([...(questionTypesByTest.get(testId) ?? []), question.type]))); }
  const snapshotQuestions = rows.length ? await db.select().from(attemptQuestionSnapshots).where(inArray(attemptQuestionSnapshots.attemptId, rows.map(row => row.attempt.id))) : [];
  const questionTypesByAttempt = new Map<number, ComparisonQuestionType[]>();
  for (const question of snapshotQuestions) questionTypesByAttempt.set(question.attemptId, Array.from(new Set([...(questionTypesByAttempt.get(question.attemptId) ?? []), question.type])));
  const enriched = rows.map(row => ({ ...row, questionTypes: questionTypesByAttempt.get(row.attempt.id) ?? questionTypesByTest.get(row.test.id) ?? [] }));
  return { company: company.company, rows: filters.questionType ? enriched.filter(row => row.questionTypes.includes(filters.questionType!)) : enriched };
}

export const reviewToolsRouter = router({
  comparisonFilters: protectedProcedure.query(async ({ ctx }) => {
    requireCompany(ctx.user.role);
    const company = await getCompanyForUser(ctx.user.id);
    if (!company) throw new TRPCError({ code: "FORBIDDEN", message: "Company membership is required." });
    const db = await dbOrFail();
    const companyTests = await db.select().from(tests).where(eq(tests.companyId, company.company.id));
    const sections = companyTests.length ? await db.select().from(testSections).where(inArray(testSections.testId, companyTests.map(test => test.id))) : [];
    const questions = sections.length ? await db.select().from(testQuestions).where(inArray(testQuestions.sectionId, sections.map(section => section.id))) : [];
    return { jobTitles: Array.from(new Set(companyTests.map(test => test.jobTitle ?? test.title))).sort(), questionTypes: Array.from(new Set(questions.map(question => question.type))) };
  }),
  comparisonCandidates: protectedProcedure.input(comparisonFilterInput).query(async ({ ctx, input }) => {
    requireCompany(ctx.user.role);
    const { rows } = await comparisonRowsForCompany(ctx.user.id, input);
    return rows.sort((a, b) => (b.attempt.submittedAt?.getTime() ?? 0) - (a.attempt.submittedAt?.getTime() ?? 0));
  }),
  comparison: protectedProcedure.input(z.object({ attemptIds: z.array(z.number().int().positive()).min(2).max(4) })).query(async ({ ctx, input }) => {
    requireCompany(ctx.user.role);
    const { company, rows } = await comparisonRowsForCompany(ctx.user.id, {}, input.attemptIds);
    if (!comparedAttemptsMatchRequest(input.attemptIds, rows.map(row => row.attempt.id))) throw new TRPCError({ code: "FORBIDDEN", message: "One or more attempts are outside your company scope." });
    const db = await dbOrFail();
    const candidateIds = Array.from(new Set(rows.map(row => row.candidate.id)));
    const annotations = candidateIds.length ? await db.select().from(candidateAnnotations).where(and(eq(candidateAnnotations.companyId, company.id), inArray(candidateAnnotations.candidateId, candidateIds))) : [];
    const annotationByCandidateId = new Map(annotations.map(annotation => [annotation.candidateId, annotation]));
    return input.attemptIds.map(id => {
      const row = rows.find(candidate => candidate.attempt.id === id)!;
      return { ...row, annotation: annotationByCandidateId.get(row.candidate.id) ?? null };
    });
  }),
  candidateAnnotations: router({
    upsert: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), note: z.string().trim().max(3000).optional(), tags: z.array(z.string().trim().min(1).max(40)).max(12) })).mutation(async ({ ctx, input }) => {
      requireCompany(ctx.user.role);
      const owned = await requireCompanyAttempt(ctx.user.id, input.attemptId);
      const tags = normalizeCandidateTags(input.tags);
      const note = input.note?.trim() ?? "";
      const existing = await owned.db.select().from(candidateAnnotations).where(and(eq(candidateAnnotations.companyId, owned.company.id), eq(candidateAnnotations.candidateId, owned.attempt.candidateId))).limit(1);
      if (!note && !tags.length) {
        if (existing[0]) await owned.db.delete(candidateAnnotations).where(eq(candidateAnnotations.id, existing[0].id));
        return { removed: Boolean(existing[0]), annotation: null };
      }
      if (existing[0]) {
        await owned.db.update(candidateAnnotations).set({ note, tags, updatedByUserId: ctx.user.id }).where(eq(candidateAnnotations.id, existing[0].id));
        return { removed: false, annotation: { ...existing[0], note, tags, updatedByUserId: ctx.user.id } };
      }
      const result = await owned.db.insert(candidateAnnotations).values({ companyId: owned.company.id, candidateId: owned.attempt.candidateId, note, tags, updatedByUserId: ctx.user.id });
      return { removed: false, annotation: { id: Number(result[0].insertId), companyId: owned.company.id, candidateId: owned.attempt.candidateId, note, tags, updatedByUserId: ctx.user.id } };
    }),
  }),
  templates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      requireCompany(ctx.user.role);
      const company = await getCompanyForUser(ctx.user.id);
      if (!company) throw new TRPCError({ code: "FORBIDDEN", message: "Company membership is required." });
      const db = await dbOrFail();
      return db.select().from(comparisonFilterTemplates).where(eq(comparisonFilterTemplates.companyId, company.company.id)).orderBy(desc(comparisonFilterTemplates.updatedAt));
    }),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(120), filters: comparisonFilterInput })).mutation(async ({ ctx, input }) => {
      requireCompany(ctx.user.role);
      const company = await getCompanyForUser(ctx.user.id);
      if (!company) throw new TRPCError({ code: "FORBIDDEN", message: "Company membership is required." });
      const db = await dbOrFail();
      const result = await db.insert(comparisonFilterTemplates).values({ companyId: company.company.id, createdByUserId: ctx.user.id, name: input.name, ...input.filters });
      return { id: Number(result[0].insertId) };
    }),
    remove: protectedProcedure.input(z.object({ templateId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireCompany(ctx.user.role);
      const company = await getCompanyForUser(ctx.user.id);
      const db = await dbOrFail();
      const rows = await db.select().from(comparisonFilterTemplates).where(eq(comparisonFilterTemplates.id, input.templateId)).limit(1);
      if (!canRemoveComparisonTemplate({ isCompanyOwner: Boolean(company && rows[0]?.companyId === company.company.id), isOriginalCreator: rows[0]?.createdByUserId === ctx.user.id })) throw new TRPCError({ code: "FORBIDDEN", message: "Only the template creator may remove it." });
      await db.delete(comparisonFilterTemplates).where(eq(comparisonFilterTemplates.id, input.templateId));
      return { success: true };
    }),
  }),
  comments: router({
    list: protectedProcedure.input(z.object({ attemptId: z.number().int().positive() })).query(async ({ ctx, input }) => { requireCompany(ctx.user.role); const { db } = await requireCompanyAttempt(ctx.user.id, input.attemptId); return db.select({ comment: codeReviewComments, reviewer: users }).from(codeReviewComments).innerJoin(users, eq(codeReviewComments.reviewerUserId, users.id)).where(eq(codeReviewComments.attemptId, input.attemptId)).orderBy(desc(codeReviewComments.createdAt)); }),
    create: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), attemptAnswerId: z.number().int().positive(), lineNumber: z.number().int().min(1).max(5000), body: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => { requireCompany(ctx.user.role); const owned = await requireCompanyAttempt(ctx.user.id, input.attemptId); const answer = await owned.db.select({ answer: attemptAnswers, question: testQuestions }).from(attemptAnswers).innerJoin(testQuestions, eq(attemptAnswers.questionId, testQuestions.id)).where(and(eq(attemptAnswers.id, input.attemptAnswerId), eq(attemptAnswers.attemptId, input.attemptId))).limit(1); if (!answer[0] || answer[0].question.type !== "code" || !isValidCodeCommentLine(input.lineNumber, answer[0].answer.codeAnswer)) throw new TRPCError({ code: "BAD_REQUEST", message: "Comment must point to a valid submitted code line." }); const result = await owned.db.insert(codeReviewComments).values({ ...input, reviewerUserId: ctx.user.id }); const commentId = Number(result[0].insertId); if (isFinalApplicationStatus(owned.attempt.applicationStatus)) await owned.db.insert(notifications).values({ userId: owned.attempt.candidateId, type: "feedback_published", title: "تم نشر ملاحظة جديدة على الكود", content: "أضاف فريق المراجعة ملاحظة جديدة على أحد أسطر الكود في محاولتك.", notificationKey: `feedback-published-comment-${commentId}`, emailStatus: "not_configured" }); return { id: commentId }; }),
    remove: protectedProcedure.input(z.object({ commentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { requireCompany(ctx.user.role); const db = await dbOrFail(); const rows = await db.select({ comment: codeReviewComments, test: tests }).from(codeReviewComments).innerJoin(testAttempts, eq(codeReviewComments.attemptId, testAttempts.id)).innerJoin(tests, eq(testAttempts.testId, tests.id)).where(eq(codeReviewComments.id, input.commentId)).limit(1); const company = await getCompanyForUser(ctx.user.id); const isCompanyOwner = Boolean(rows[0] && company && rows[0].test.companyId === company.company.id); const isOriginalReviewer = rows[0]?.comment.reviewerUserId === ctx.user.id; if (!canRemoveCodeReviewComment({ isCompanyOwner, isOriginalReviewer })) throw new TRPCError({ code: "FORBIDDEN", message: "Only the original reviewer may remove this comment." }); await db.delete(codeReviewComments).where(eq(codeReviewComments.id, input.commentId)); return { success: true }; }),
  }),
});
