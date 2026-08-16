import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { auditLogs, candidateProfiles, companies, testAttempts, testQuestions, testSections, tests, users } from "../../drizzle/schema";
import { getCompanyForUser, getDb, isCompanyMember } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

const languageMap = {
  python: 71,
  javascript: 63,
  typescript: 74,
  java: 62,
  c: 50,
  cpp: 54,
  go: 60,
  rust: 73,
} as const;

type SupportedLanguage = keyof typeof languageMap;

function requireCandidate(role: string) {
  if (role !== "candidate") throw new TRPCError({ code: "FORBIDDEN", message: "Candidate access is required." });
}

function requireCompany(role: string) {
  if (role !== "company") throw new TRPCError({ code: "FORBIDDEN", message: "Company access is required." });
}

async function dbOrFail() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  return db;
}

async function companyForUser(userId: number) {
  const membership = await getCompanyForUser(userId);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Company membership is required." });
  return membership.company;
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export const enhancementRouter = router({
  code: router({
    run: protectedProcedure.input(z.object({
      attemptId: z.number().int().positive(),
      questionId: z.number().int().positive(),
      language: z.enum(["python", "javascript", "typescript", "java", "c", "cpp", "go", "rust"]),
      sourceCode: z.string().min(1).max(30_000),
      stdin: z.string().max(10_000).default(""),
    })).mutation(async ({ ctx, input }) => {
      requireCandidate(ctx.user.role);
      const db = await dbOrFail();
      const attempt = await db.select({ attempt: testAttempts, test: tests }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).where(and(eq(testAttempts.id, input.attemptId), eq(testAttempts.candidateId, ctx.user.id))).limit(1);
      if (!attempt[0]) throw new TRPCError({ code: "FORBIDDEN", message: "This attempt is not yours." });
      if (attempt[0].attempt.state !== "in_progress" || attempt[0].attempt.expiresAt.getTime() < Date.now()) throw new TRPCError({ code: "FORBIDDEN", message: "This attempt is no longer open." });
      const question = await db.select({ question: testQuestions, section: testSections }).from(testQuestions).innerJoin(testSections, eq(testQuestions.sectionId, testSections.id)).where(eq(testQuestions.id, input.questionId)).limit(1);
      if (!question[0] || question[0].section.testId !== attempt[0].attempt.testId || question[0].question.type !== "code") throw new TRPCError({ code: "FORBIDDEN", message: "This code question is not part of the current attempt." });
      if (question[0].question.supportedLanguages?.length && !question[0].question.supportedLanguages.some(value => value.toLowerCase() === input.language)) throw new TRPCError({ code: "BAD_REQUEST", message: "This language is not enabled for the question." });
      if (!validateCodeRunInput(input)) throw new TRPCError({ code: "BAD_REQUEST", message: "Code input exceeds the allowed language, size, or input limits." });
      const apiUrl = process.env.JUDGE0_API_URL;
      const apiKey = process.env.JUDGE0_API_KEY;
      if (!apiUrl || !apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Code execution is not configured yet. Add the isolated execution service credentials." });
      const headers: Record<string, string> = { "Content-Type": "application/json", "X-Auth-Token": apiKey };
      const submission = await fetch(`${apiUrl.replace(/\/$/, "")}/submissions?base64_encoded=false&wait=false`, { method: "POST", headers, body: JSON.stringify({ language_id: languageMap[input.language as SupportedLanguage], source_code: input.sourceCode, stdin: input.stdin, cpu_time_limit: 2, wall_time_limit: 4, memory_limit: 128000, max_output_size: 20_000, enable_network: false }) });
      if (!submission.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: "The isolated execution service rejected the request." });
      const token = (await submission.json() as { token?: string }).token;
      if (!token) throw new TRPCError({ code: "BAD_GATEWAY", message: "The isolated execution service returned no run token." });
      let result: Record<string, unknown> | null = null;
      for (let i = 0; i < 12; i += 1) {
        await new Promise(resolve => setTimeout(resolve, 350));
        const response = await fetch(`${apiUrl.replace(/\/$/, "")}/submissions/${token}?base64_encoded=false`, { headers });
        if (!response.ok) continue;
        const body = await response.json() as Record<string, unknown>;
        if (body.status && typeof body.status === "object" && (body.status as { id?: number }).id && (body.status as { id: number }).id <= 2) continue;
        result = body;
        break;
      }
      if (!result) result = { status: { id: 13, description: "Time Limit Exceeded" }, stdout: "", stderr: "Execution timed out." };
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "code_run", entityType: "testAttempt", entityId: input.attemptId, detail: JSON.stringify({ questionId: input.questionId, language: input.language, status: result.status, stdoutLength: typeof result.stdout === "string" ? result.stdout.length : 0 }) });
      return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", compileOutput: result.compile_output ?? "", time: result.time ?? null, memory: result.memory ?? null };
    }),
  }),
  company: router({
    ranking: protectedProcedure.input(z.object({ search: z.string().trim().max(120).optional(), status: z.enum(["accepted", "rejected", "under review"]).optional(), minScore: z.number().int().min(0).max(100).optional(), sort: z.enum(["priority", "score", "recent"]).default("priority"), page: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(100).default(25) })).query(async ({ ctx, input }) => {
      requireCompany(ctx.user.role);
      const company = await companyForUser(ctx.user.id);
      const db = await dbOrFail();
      const filters = [eq(tests.companyId, company.id)];
      if (input.status) filters.push(eq(testAttempts.applicationStatus, input.status));
      if (input.minScore !== undefined) filters.push(gte(sql`COALESCE(${testAttempts.reviewerScore}, ${testAttempts.autoScore}, 0)`, input.minScore));
      if (input.search) filters.push(sql`(${users.name} LIKE ${`%${input.search}%`} OR ${users.email} LIKE ${`%${input.search}%`} OR ${candidateProfiles.headline} LIKE ${`%${input.search}%`})`);
      const rows = await db.select({ attempt: testAttempts, test: tests, candidate: users, profile: candidateProfiles }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).innerJoin(users, eq(testAttempts.candidateId, users.id)).leftJoin(candidateProfiles, eq(candidateProfiles.userId, users.id)).where(and(...filters)).orderBy(input.sort === "score" ? desc(sql`COALESCE(${testAttempts.reviewerScore}, ${testAttempts.autoScore}, 0)`) : input.sort === "recent" ? desc(testAttempts.updatedAt) : desc(testAttempts.priorityScore)).limit(input.limit).offset(input.page * input.limit);
      return rows;
    }),
    exportAcceptedCsv: protectedProcedure.query(async ({ ctx }) => {
      requireCompany(ctx.user.role);
      const company = await companyForUser(ctx.user.id);
      const db = await dbOrFail();
      const rows = await db.select({ attempt: testAttempts, test: tests, candidate: users, profile: candidateProfiles }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).innerJoin(users, eq(testAttempts.candidateId, users.id)).leftJoin(candidateProfiles, eq(candidateProfiles.userId, users.id)).where(and(eq(tests.companyId, company.id), eq(testAttempts.applicationStatus, "accepted"))).orderBy(desc(testAttempts.priorityScore));
      const header = ["candidate_name", "email", "headline", "skills", "test", "field", "level", "auto_score", "reviewer_score", "priority_score", "status", "submitted_at"].join(",");
      const lines = rows.map(row => [row.candidate.name, row.candidate.email, row.profile?.headline, Array.isArray(row.profile?.skills) ? row.profile.skills.join(" | ") : "", row.test.title, row.test.field, row.test.level, row.attempt.autoScore, row.attempt.reviewerScore, row.attempt.priorityScore, row.attempt.applicationStatus, row.attempt.submittedAt?.toISOString()].map(csvCell).join(","));
      return { fileName: `${company.slug}-accepted-candidates.csv`, csv: [header, ...lines].join("\n") };
    }),
  }),
});

export function isSupportedCodeLanguage(value: string): value is SupportedLanguage {
  return value in languageMap;
}

export function validateCodeRunInput(input: { language: string; sourceCode: string; stdin: string }) {
  return isSupportedCodeLanguage(input.language) && input.sourceCode.length > 0 && input.sourceCode.length <= 30_000 && input.stdin.length <= 10_000;
}
