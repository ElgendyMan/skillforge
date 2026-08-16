import { TRPCError } from "@trpc/server";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { companies, fileAssets, proctoringEvents, proctoringSessions, reviews, testAttempts, tests, users } from "../../drizzle/schema";
import { getDb, isCompanyMember } from "../db";
import { storageGetSignedUrl } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";

async function dbOrFail() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  return db;
}

export function canViewReviewMedia(input: { role: string; isCompanyMember: boolean }) {
  return input.role === "company" && input.isCompanyMember;
}

export function isCandidateAnalyticsOwner(input: { role: string }) {
  return input.role === "candidate";
}

export function matchesMediaFilter(input: { candidateName?: string | null; email?: string | null; testTitle?: string | null; applicationStatus?: string | null }, filter: { search?: string; status?: string }) {
  const search = filter.search?.trim().toLowerCase();
  const text = `${input.candidateName ?? ""} ${input.email ?? ""} ${input.testTitle ?? ""}`.toLowerCase();
  return (!search || text.includes(search)) && (!filter.status || input.applicationStatus === filter.status);
}

function forbid(message = "You are not permitted to access this resource."): never {
  throw new TRPCError({ code: "FORBIDDEN", message });
}

export const experienceRouter = router({
  candidateAnalytics: protectedProcedure.query(async ({ ctx }) => {
    if (!isCandidateAnalyticsOwner({ role: ctx.user.role })) forbid("Candidate access is required.");
    const db = await dbOrFail();
    const rows = await db.select({ attempt: testAttempts, test: tests, company: companies, review: reviews })
      .from(testAttempts)
      .innerJoin(tests, eq(testAttempts.testId, tests.id))
      .innerJoin(companies, eq(tests.companyId, companies.id))
      .leftJoin(reviews, eq(reviews.attemptId, testAttempts.id))
      .where(eq(testAttempts.candidateId, ctx.user.id))
      .orderBy(desc(testAttempts.updatedAt));
    const attempts = rows.map(row => ({ ...row.attempt, test: row.test, company: row.company, review: row.review }));
    const completed = attempts.filter(item => item.state === "submitted");
    const scored = completed.map(item => item.reviewerScore ?? item.autoScore).filter((value): value is number => value !== null);
    const accepted = completed.filter(item => item.applicationStatus === "accepted").length;
    const rejected = completed.filter(item => item.applicationStatus === "rejected").length;
    const underReview = completed.filter(item => item.applicationStatus === "under review").length;
    return {
      attempts,
      metrics: {
        total: attempts.length,
        completed: completed.length,
        averageScore: scored.length ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length) : 0,
        bestScore: scored.length ? Math.max(...scored) : 0,
        accepted,
        rejected,
        underReview,
      },
    };
  }),

  companyMediaIndex: protectedProcedure.input(z.object({ search: z.string().trim().max(120).optional(), status: z.enum(["accepted", "rejected", "under review"]).optional() }).optional()).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "company") forbid("Company access is required.");
    const company = await (async () => { const db = await dbOrFail(); const rows = await db.select({ company: companies }).from(companies).where(sql`${companies.id} in (select companyId from companyMembers where userId = ${ctx.user.id})`).limit(1); return rows[0]?.company; })();
    if (!company) forbid();
    const db = await dbOrFail();
    const filters = [eq(tests.companyId, company.id)];
    if (input?.status) filters.push(eq(testAttempts.applicationStatus, input.status));
    if (input?.search) filters.push(or(sql`${users.name} like ${`%${input.search}%`}`, sql`${users.email} like ${`%${input.search}%`}`, sql`${tests.title} like ${`%${input.search}%`}`)!);
    return db.select({ attempt: testAttempts, test: tests, candidate: users }).from(testAttempts).innerJoin(tests, eq(testAttempts.testId, tests.id)).innerJoin(users, eq(testAttempts.candidateId, users.id)).where(and(...filters)).orderBy(desc(testAttempts.updatedAt));
  }),

  companyReviewMedia: protectedProcedure.input(z.object({ attemptId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "company") forbid("Company access is required.");
    const db = await dbOrFail();
    const owned = await db.select({ attempt: testAttempts, test: tests, company: companies })
      .from(testAttempts)
      .innerJoin(tests, eq(testAttempts.testId, tests.id))
      .innerJoin(companies, eq(tests.companyId, companies.id))
      .where(eq(testAttempts.id, input.attemptId)).limit(1);
    const member = Boolean(owned[0] && await isCompanyMember(ctx.user.id, owned[0].company.id));
    if (!owned[0] || !canViewReviewMedia({ role: ctx.user.role, isCompanyMember: member })) forbid();
    const session = await db.select().from(proctoringSessions).where(eq(proctoringSessions.attemptId, input.attemptId)).limit(1);
    if (!session[0]) return { session: null, events: [], camera: null, screen: null };
    const events = await db.select().from(proctoringEvents).where(eq(proctoringEvents.sessionId, session[0].id)).orderBy(desc(proctoringEvents.occurredAt));
    const assetIds = [session[0].cameraRecordingAssetId, session[0].screenRecordingAssetId].filter((value): value is number => value !== null);
    const assets = assetIds.length ? await db.select().from(fileAssets).where(and(eq(fileAssets.attemptId, input.attemptId))) : [];
    const assetFor = async (assetId: number | null) => {
      if (!assetId) return null;
      const asset = assets.find(item => item.id === assetId);
      if (!asset) return null;
      return { id: asset.id, name: asset.originalName, mimeType: asset.mimeType, byteSize: asset.byteSize, url: await storageGetSignedUrl(asset.storageKey) };
    };
    return { session: session[0], events, camera: await assetFor(session[0].cameraRecordingAssetId), screen: await assetFor(session[0].screenRecordingAssetId) };
  }),
});
