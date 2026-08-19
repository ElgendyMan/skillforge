import { and, eq, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { testAttempts, users } from "../drizzle/schema";
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

  it("has seeded rows owned by the expected fixture boundaries", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;
    const [candidate] = await db.select({ id: users.id }).from(users).where(eq(users.openId, "sf-mock-candidate")).limit(1);
    const rows = candidate ? await db.select({ id: testAttempts.id }).from(testAttempts).where(and(eq(testAttempts.candidateId, candidate.id))) : [];
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });
});
