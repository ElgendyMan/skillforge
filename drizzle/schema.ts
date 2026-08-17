import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["candidate", "company", "supervisor"]).default("candidate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const candidateProfiles = mysqlTable("candidateProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  headline: varchar("headline", { length: 180 }),
  bio: text("bio"),
  skills: json("skills").$type<string[]>().notNull(),
  experience: json("experience").$type<Array<{ title: string; company: string; duration: string }>>().notNull(),
  portfolioLinks: json("portfolioLinks").$type<Array<{ label: string; url: string }>>().notNull(),
  avatarKey: varchar("avatarKey", { length: 500 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  description: text("description"),
  website: varchar("website", { length: 500 }),
  industry: varchar("industry", { length: 120 }),
  logoKey: varchar("logoKey", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const companyMembers = mysqlTable("companyMembers", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  userId: int("userId").notNull(),
  memberRole: mysqlEnum("memberRole", ["owner", "reviewer"]).default("owner").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [unique("company_member_unique").on(table.companyId, table.userId)]);

export const tests = mysqlTable("tests", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  jobTitle: varchar("jobTitle", { length: 180 }),
  summary: text("summary").notNull(),
  field: varchar("field", { length: 120 }).notNull(),
  level: mysqlEnum("level", ["junior", "mid", "senior"]).notNull(),
  durationMinutes: int("durationMinutes").notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  proctoringMode: mysqlEnum("proctoringMode", ["none", "optional", "required"]).default("optional").notNull(),
  attemptsAllowed: int("attemptsAllowed").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const testSections = mysqlTable("testSections", {
  id: int("id").autoincrement().primaryKey(),
  testId: int("testId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  instructions: text("instructions"),
  sortOrder: int("sortOrder").notNull(),
});

export const testQuestions = mysqlTable("testQuestions", {
  id: int("id").autoincrement().primaryKey(),
  sectionId: int("sectionId").notNull(),
  type: mysqlEnum("type", ["multiple_choice", "essay", "code", "vulnerability", "file_upload"]).notNull(),
  prompt: text("prompt").notNull(),
  guidance: text("guidance"),
  points: int("points").default(10).notNull(),
  options: json("options").$type<Array<{ id: string; label: string }>>(),
  correctAnswers: json("correctAnswers").$type<string[]>(),
  evaluationGuide: text("evaluationGuide"),
  starterCode: text("starterCode"),
  supportedLanguages: json("supportedLanguages").$type<string[]>(),
  sortOrder: int("sortOrder").notNull(),
});

export const testAttempts = mysqlTable("testAttempts", {
  id: int("id").autoincrement().primaryKey(),
  testId: int("testId").notNull(),
  candidateId: int("candidateId").notNull(),
  state: mysqlEnum("state", ["in_progress", "submitted"]).default("in_progress").notNull(),
  applicationStatus: mysqlEnum("applicationStatus", ["accepted", "rejected", "under review"]).default("under review").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  submittedAt: timestamp("submittedAt"),
  expiresAt: timestamp("expiresAt").notNull(),
  autoScore: int("autoScore"),
  reviewerScore: int("reviewerScore"),
  priorityScore: int("priorityScore").default(0).notNull(),
  integrityFlags: int("integrityFlags").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [unique("attempt_candidate_test_unique").on(table.testId, table.candidateId)]);

export const attemptAnswers = mysqlTable("attemptAnswers", {
  id: int("id").autoincrement().primaryKey(),
  attemptId: int("attemptId").notNull(),
  questionId: int("questionId").notNull(),
  textAnswer: text("textAnswer"),
  selectedOptionIds: json("selectedOptionIds").$type<string[]>(),
  codeAnswer: text("codeAnswer"),
  language: varchar("language", { length: 40 }),
  fileAssetId: int("fileAssetId"),
  savedAt: timestamp("savedAt").defaultNow().onUpdateNow().notNull(),
}, table => [unique("answer_attempt_question_unique").on(table.attemptId, table.questionId)]);

export const proctoringSessions = mysqlTable("proctoringSessions", {
  id: int("id").autoincrement().primaryKey(),
  attemptId: int("attemptId").notNull().unique(),
  candidateId: int("candidateId").notNull(),
  consentCamera: boolean("consentCamera").default(false).notNull(),
  consentScreen: boolean("consentScreen").default(false).notNull(),
  consentRecording: boolean("consentRecording").default(false).notNull(),
  consentedAt: timestamp("consentedAt").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
  cameraRecordingAssetId: int("cameraRecordingAssetId"),
  screenRecordingAssetId: int("screenRecordingAssetId"),
});

export const proctoringEvents = mysqlTable("proctoringEvents", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  eventType: mysqlEnum("eventType", ["focus_lost", "focus_returned", "screen_stopped", "camera_stopped", "connection_lost", "connection_restored"]).notNull(),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  detail: varchar("detail", { length: 500 }),
});

export const fileAssets = mysqlTable("fileAssets", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull(),
  companyId: int("companyId"),
  attemptId: int("attemptId"),
  category: mysqlEnum("category", ["evidence", "code_project", "camera_recording", "screen_recording", "company_logo", "candidate_avatar"]).notNull(),
  storageKey: varchar("storageKey", { length: 600 }).notNull().unique(),
  originalName: varchar("originalName", { length: 300 }).notNull(),
  mimeType: varchar("mimeType", { length: 160 }).notNull(),
  byteSize: int("byteSize").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  attemptId: int("attemptId").notNull().unique(),
  reviewerUserId: int("reviewerUserId").notNull(),
  score: int("score").notNull(),
  decision: mysqlEnum("decision", ["accepted", "rejected", "under review"]).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const codeReviewComments = mysqlTable("codeReviewComments", {
  id: int("id").autoincrement().primaryKey(),
  attemptId: int("attemptId").notNull(),
  attemptAnswerId: int("attemptAnswerId").notNull(),
  reviewerUserId: int("reviewerUserId").notNull(),
  lineNumber: int("lineNumber").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const comparisonFilterTemplates = mysqlTable("comparisonFilterTemplates", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  jobTitle: varchar("jobTitle", { length: 180 }),
  questionType: mysqlEnum("questionType", ["multiple_choice", "essay", "code", "vulnerability", "file_upload"]),
  submittedFrom: timestamp("submittedFrom"),
  submittedTo: timestamp("submittedTo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["attempt_submitted", "status_changed", "review_ready", "feedback_published"]).notNull(),
  notificationKey: varchar("notificationKey", { length: 220 }).unique(),
  title: varchar("title", { length: 220 }).notNull(),
  content: text("content").notNull(),
  readAt: timestamp("readAt"),
  emailStatus: mysqlEnum("emailStatus", ["queued", "not_configured", "sent", "failed"]).default("not_configured").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  action: varchar("action", { length: 160 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: int("entityId"),
  detail: text("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
