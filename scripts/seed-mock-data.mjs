import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (process.env.NODE_ENV === "production") throw new Error("Mock data seeding is disabled in production");

const pool = await mysql.createConnection(databaseUrl);
const prefix = "sf-mock-";
const now = Date.now();
const ago = minutes => new Date(now - minutes * 60_000);
const future = minutes => new Date(now + minutes * 60_000);

async function insert(table, row) {
  const keys = Object.keys(row);
  const values = keys.map(key => row[key]);
  const placeholders = keys.map(() => "?").join(", ");
  const [result] = await pool.execute(`INSERT INTO \`${table}\` (${keys.map(key => `\`${key}\``).join(", ")}) VALUES (${placeholders})`, values);
  return Number(result.insertId);
}

async function exec(sql, params = []) {
  await pool.execute(sql, params);
}

async function insertMany(table, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const values = rows.flatMap(row => keys.map(key => row[key]));
  const placeholders = rows.map(() => `(${keys.map(() => "?").join(", ")})`).join(", ");
  await pool.execute(`INSERT INTO \`${table}\` (${keys.map(key => `\`${key}\``).join(", ")}) VALUES ${placeholders}`, values);
}

async function clean() {
  const mockUserIds = `(SELECT id FROM users WHERE openId LIKE '${prefix}%')`;
  const mockCompanyIds = `(SELECT id FROM companies WHERE slug LIKE '${prefix}%')`;
  await exec(`DELETE ce FROM proctoringEvents ce JOIN proctoringSessions ps ON ce.sessionId = ps.id JOIN testAttempts ta ON ps.attemptId = ta.id WHERE ta.candidateId IN ${mockUserIds}`);
  await exec(`DELETE aa FROM attemptAnswers aa JOIN testAttempts ta ON aa.attemptId = ta.id WHERE ta.candidateId IN ${mockUserIds}`);
  await exec(`DELETE c FROM codeReviewComments c JOIN testAttempts ta ON c.attemptId = ta.id WHERE ta.candidateId IN ${mockUserIds}`);
  await exec(`DELETE r FROM reviews r JOIN testAttempts ta ON r.attemptId = ta.id WHERE ta.candidateId IN ${mockUserIds}`);
  await exec(`DELETE ps FROM proctoringSessions ps JOIN testAttempts ta ON ps.attemptId = ta.id WHERE ta.candidateId IN ${mockUserIds}`);
  await exec(`DELETE fa FROM fileAssets fa WHERE fa.ownerUserId IN ${mockUserIds} OR fa.companyId IN ${mockCompanyIds}`);
  await exec(`DELETE n FROM notifications n WHERE n.notificationKey LIKE '${prefix}%' OR n.userId IN ${mockUserIds}`);
  await exec(`DELETE ca FROM candidateAnnotations ca WHERE ca.companyId IN ${mockCompanyIds} OR ca.candidateId IN ${mockUserIds}`);
  await exec(`DELETE ft FROM comparisonFilterTemplates ft WHERE ft.companyId IN ${mockCompanyIds}`);
  await exec(`DELETE aa FROM auditLogs aa WHERE aa.actorUserId IN ${mockUserIds}`);
  await exec(`DELETE ta FROM testAttempts ta WHERE ta.candidateId IN ${mockUserIds}`);
  await exec(`DELETE tq FROM testQuestions tq JOIN testSections ts ON tq.sectionId = ts.id JOIN tests t ON ts.testId = t.id WHERE t.companyId IN ${mockCompanyIds}`);
  await exec(`DELETE ts FROM testSections ts JOIN tests t ON ts.testId = t.id WHERE t.companyId IN ${mockCompanyIds}`);
  await exec(`DELETE cm FROM companyMembers cm WHERE cm.companyId IN ${mockCompanyIds} OR cm.userId IN ${mockUserIds}`);
  await exec(`DELETE cp FROM candidateProfiles cp WHERE cp.userId IN ${mockUserIds}`);
  await exec(`DELETE t FROM tests t WHERE t.companyId IN ${mockCompanyIds}`);
  await exec(`DELETE c FROM companies c WHERE c.slug LIKE '${prefix}%'`);
  await exec(`DELETE u FROM users u WHERE u.openId LIKE '${prefix}%'`);
}

const roleUsers = {};
async function seedUsers() {
  roleUsers.candidate = await insert("users", { openId: `${prefix}candidate`, name: "سلمى المرشحة التجريبية", email: "mock.candidate@skillforge.test", loginMethod: "mock", role: "candidate", createdAt: ago(9000), updatedAt: ago(10), lastSignedIn: ago(5) });
  roleUsers.company = await insert("users", { openId: `${prefix}company`, name: "فريق التوظيف التجريبي", email: "mock.company@skillforge.test", loginMethod: "mock", role: "company", createdAt: ago(9000), updatedAt: ago(10), lastSignedIn: ago(5) });
  roleUsers.supervisor = await insert("users", { openId: `${prefix}supervisor`, name: "المشرف التجريبي", email: "mock.supervisor@skillforge.test", loginMethod: "mock", role: "supervisor", createdAt: ago(9000), updatedAt: ago(10), lastSignedIn: ago(5) });
  for (let i = 1; i <= 18; i++) {
    await insert("users", { openId: `${prefix}candidate-${String(i).padStart(2, "0")}`, name: `مرشح تجريبي ${String(i).padStart(2, "0")}`, email: `mock.candidate.${i}@skillforge.test`, loginMethod: "mock", role: "candidate", createdAt: ago(8000 - i), updatedAt: ago(i), lastSignedIn: ago(i) });
  }
  for (let i = 1; i <= 3; i++) {
    const userId = await insert("users", { openId: `${prefix}company-${String(i).padStart(2, "0")}`, name: `مراجع شركة تجريبية ${i}`, email: `mock.reviewer.${i}@skillforge.test`, loginMethod: "mock", role: "company", createdAt: ago(7000 - i), updatedAt: ago(i), lastSignedIn: ago(i) });
    roleUsers[`company${i}`] = userId;
  }
  await insert("candidateProfiles", { userId: roleUsers.candidate, headline: "مهندس أمن سيبراني تجريبي", bio: "ملف مرشح تجريبي غني للاختبار البصري والتفاعلي.", skills: JSON.stringify(["Web Security", "Burp Suite", "OWASP", "Linux"]), experience: JSON.stringify([{ title: "Security Engineer", company: "Mock Labs", duration: "2 years" }, { title: "Penetration Tester", company: "DemoSec", duration: "1 year" }]), portfolioLinks: JSON.stringify([{ label: "GitHub", url: "https://github.com/example" }, { label: "Portfolio", url: "https://example.com" }]), updatedAt: ago(1) });
  const [rows] = await pool.query(`SELECT id, openId FROM users WHERE openId LIKE '${prefix}candidate-%' ORDER BY id`);
  for (const [index, row] of rows.entries()) {
    await insert("candidateProfiles", { userId: row.id, headline: `متخصص ${index % 2 ? "تطوير" : "أمن"} تجريبي`, bio: "بيانات تجريبية للاختبار فقط.", skills: JSON.stringify(["JavaScript", "Linux", "Security", "Automation"]), experience: JSON.stringify([{ title: "Engineer", company: "Mock Studio", duration: `${1 + (index % 5)} years` }]), portfolioLinks: JSON.stringify([{ label: "Portfolio", url: "https://example.com" }]), updatedAt: ago(index) });
  }
}

const companyIds = [];
async function seedCompanies() {
  for (let i = 1; i <= 3; i++) {
    const companyId = await insert("companies", { name: `شركة SkillForge التجريبية ${i}`, slug: `${prefix}company-${i}`, description: "شركة تجريبية ببيانات كبيرة لاختبار لوحة التوظيف والعزل والصلاحيات.", website: "https://example.com", industry: ["Cybersecurity", "FinTech", "SaaS"][i - 1], createdAt: ago(6000 - i), updatedAt: ago(i) });
    companyIds.push(companyId);
    await insert("companyMembers", { companyId, userId: roleUsers.company, memberRole: "owner", createdAt: ago(5000) });
    await insert("companyMembers", { companyId, userId: roleUsers[`company${i}`], memberRole: "reviewer", createdAt: ago(4000) });
  }
}

const testIds = [];
const questionIdsByTest = new Map();
async function seedTests() {
  const types = ["multiple_choice", "essay", "code", "vulnerability", "file_upload"];
  for (let companyIndex = 0; companyIndex < companyIds.length; companyIndex++) {
    for (let testIndex = 1; testIndex <= 10; testIndex++) {
      const testId = await insert("tests", { companyId: companyIds[companyIndex], title: `${["Web Pentest", "Red Team", "Cloud Defense"][companyIndex]} Challenge ${testIndex}`, jobTitle: ["Junior Pentester", "Web Security Engineer", "Application Security Lead"][testIndex % 3], summary: "اختبار تجريبي شامل يقيس التفكير الأمني والبرمجة والتحليل العملي.", field: ["Web Security", "Red Team", "Cloud Security"][companyIndex], level: ["junior", "mid", "senior"][testIndex % 3], durationMinutes: 45 + (testIndex % 4) * 15, status: testIndex === 10 ? "draft" : "published", proctoringMode: testIndex % 3 === 0 ? "required" : "optional", attemptsAllowed: 1, createdAt: ago(3000 - testIndex), updatedAt: ago(testIndex) });
      testIds.push({ id: testId, companyId: companyIds[companyIndex], status: testIndex === 10 ? "draft" : "published" });
      const questionIds = [];
      for (let sectionIndex = 1; sectionIndex <= 3; sectionIndex++) {
        const sectionId = await insert("testSections", { testId, title: ["Fundamentals", "Practical Analysis", "Final Review"][sectionIndex - 1], instructions: "اقرأ السؤال بالكامل وسجل إجابة واضحة وقابلة للمراجعة.", sortOrder: sectionIndex });
        for (let questionIndex = 0; questionIndex < 5; questionIndex++) {
          const type = types[(sectionIndex + questionIndex + companyIndex) % types.length];
          const row = { sectionId, type, prompt: `سؤال ${type} تجريبي رقم ${sectionIndex}-${questionIndex + 1}: حلل السيناريو ووضح منهجيتك.`, guidance: "استخدم منهجية منظمة واذكر الافتراضات.", points: 10 + questionIndex * 2, options: type === "multiple_choice" ? JSON.stringify([{ id: "a", label: "الخيار الأول" }, { id: "b", label: "الخيار الثاني" }, { id: "c", label: "الخيار الثالث" }]) : null, correctAnswers: type === "multiple_choice" ? JSON.stringify([questionIndex % 2 ? "b" : "a"]) : null, evaluationGuide: "الدقة، وضوح التفكير، وربط الإجابة بالسياق الأمني.", starterCode: type === "code" ? "function solve(input) {\n  // اكتب الحل هنا\n  return input;\n}" : null, supportedLanguages: type === "code" ? JSON.stringify(["javascript", "python", "typescript"]) : null, sortOrder: questionIndex + 1 };
          questionIds.push(await insert("testQuestions", row));
        }
      }
      questionIdsByTest.set(testId, questionIds);
    }
  }
}

async function seedAttemptsAndReviews() {
  const [candidateRows] = await pool.query(`SELECT id FROM users WHERE openId LIKE '${prefix}candidate%' ORDER BY id`);
  let attemptCounter = 0;
  for (const candidate of candidateRows) {
    for (let testIndex = 0; testIndex < 4; testIndex++) {
      const test = testIds[(candidate.id + testIndex) % testIds.length];
      if (test.status !== "published") continue;
      const submitted = (candidate.id + testIndex) % 4 !== 0;
      const attemptId = await insert("testAttempts", { testId: test.id, candidateId: candidate.id, state: submitted ? "submitted" : "in_progress", applicationStatus: submitted ? ["accepted", "rejected", "under review"][attemptCounter % 3] : "under review", startedAt: ago(1200 - attemptCounter), submittedAt: submitted ? ago(1000 - attemptCounter) : null, expiresAt: submitted ? ago(900 - attemptCounter) : future(90), autoScore: submitted ? 55 + (attemptCounter % 41) : null, reviewerScore: submitted && attemptCounter % 3 !== 2 ? 60 + (attemptCounter % 36) : null, priorityScore: submitted ? 60 + (attemptCounter % 36) : 0, integrityFlags: submitted ? attemptCounter % 3 : 0, updatedAt: ago(attemptCounter % 80) });
      const questionIds = questionIdsByTest.get(test.id) ?? [];
      const answerRows = questionIds.map((questionId, q) => ({ attemptId, questionId, textAnswer: q % 5 === 1 ? "تحليل تجريبي مفصل يوضح خطوات التحقق." : null, selectedOptionIds: q % 5 === 0 ? JSON.stringify([q % 2 ? "b" : "a"]) : null, codeAnswer: q % 5 === 2 ? "function solve(input) { return input.trim(); }" : null, language: q % 5 === 2 ? "javascript" : null, fileAssetId: null, savedAt: ago(attemptCounter % 120) }));
      await insertMany("attemptAnswers", answerRows);
      if (submitted && attemptCounter % 2 === 0) {
        const reviewerUserId = roleUsers.company;
        await insert("reviews", { attemptId, reviewerUserId, score: 60 + (attemptCounter % 36), decision: ["accepted", "rejected", "under review"][attemptCounter % 3], notes: "مراجعة تجريبية: نقاط القوة واضحة، ونحتاج متابعة الجزء العملي.", createdAt: ago(800 - attemptCounter), updatedAt: ago(attemptCounter % 60) });
        const firstAnswer = questionIds[2];
        const [answerRows] = await pool.query("SELECT id FROM attemptAnswers WHERE attemptId = ? AND questionId = ? LIMIT 1", [attemptId, firstAnswer]);
        if (answerRows[0]) await insert("codeReviewComments", { attemptId, attemptAnswerId: answerRows[0].id, reviewerUserId, lineNumber: 1, body: "جرّب فصل التحقق عن المعالجة لتحسين قابلية الاختبار.", createdAt: ago(attemptCounter % 100) });
      }
      if (submitted && attemptCounter % 3 === 0) {
        const camera = await insert("fileAssets", { ownerUserId: candidate.id, companyId: test.companyId, attemptId, category: "camera_recording", storageKey: `${prefix}camera/${attemptId}.webm`, originalName: `camera-${attemptId}.webm`, mimeType: "video/webm", byteSize: 1024 * 1024, createdAt: ago(attemptCounter % 100) });
        const screen = await insert("fileAssets", { ownerUserId: candidate.id, companyId: test.companyId, attemptId, category: "screen_recording", storageKey: `${prefix}screen/${attemptId}.webm`, originalName: `screen-${attemptId}.webm`, mimeType: "video/webm", byteSize: 2 * 1024 * 1024, createdAt: ago(attemptCounter % 100) });
        const sessionId = await insert("proctoringSessions", { attemptId, candidateId: candidate.id, consentCamera: true, consentScreen: true, consentRecording: true, consentedAt: ago(1100 - attemptCounter), startedAt: ago(1080 - attemptCounter), endedAt: submitted ? ago(1000 - attemptCounter) : null, cameraRecordingAssetId: camera, screenRecordingAssetId: screen });
        await insert("proctoringEvents", { sessionId, eventType: attemptCounter % 2 ? "focus_lost" : "focus_returned", occurredAt: ago(950 - attemptCounter), detail: "Mock event for review testing" });
      }
      attemptCounter++;
    }
  }
}

async function seedCompanyTools() {
  for (const [index, companyId] of companyIds.entries()) {
    await insert("comparisonFilterTemplates", { companyId, createdByUserId: roleUsers.company, name: `فلتر الفريق ${index + 1}`, jobTitle: index % 2 ? "Web Security Engineer" : null, questionType: index % 2 ? "code" : "essay", submittedFrom: ago(3000), submittedTo: new Date(), createdAt: ago(2000), updatedAt: ago(10) });
    const [candidateRows] = await pool.query(`SELECT id FROM users WHERE openId LIKE '${prefix}candidate-%' ORDER BY id LIMIT 8`);
    for (const candidate of candidateRows) await insert("candidateAnnotations", { companyId, candidateId: candidate.id, note: `ملاحظة تجريبية للشركة ${index + 1} عن المرشح ${candidate.id}`, tags: JSON.stringify(["shortlist", index % 2 ? "security" : "follow-up"]), updatedByUserId: roleUsers.company, createdAt: ago(candidate.id % 90), updatedAt: ago(candidate.id % 45) });
  }
  const [users] = await pool.query(`SELECT id, role FROM users WHERE openId LIKE '${prefix}%'`);
  for (const user of users) {
    for (let i = 0; i < 6; i++) await insert("notifications", { userId: user.id, type: ["attempt_submitted", "status_changed", "review_ready", "feedback_published"][i % 4], notificationKey: `${prefix}notification-${user.id}-${i}`, title: "إشعار تجريبي جديد", content: "هذا إشعار تجريبي للتأكد من حالات القراءة والتنقل داخل المنصة.", readAt: i % 3 === 0 ? ago(i * 10) : null, emailStatus: "not_configured", createdAt: ago(i * 30) });
    await insert("auditLogs", { actorUserId: user.id, action: "mock_fixture_created", entityType: "seed", entityId: null, detail: "Development-only SkillForge mock data", createdAt: ago(1) });
  }
}

try {
  console.log("[mock-seed] cleaning old fixtures");
  await clean();
  console.log("[mock-seed] users and profiles");
  await seedUsers();
  console.log("[mock-seed] companies");
  await seedCompanies();
  console.log("[mock-seed] tests, sections, and questions");
  await seedTests();
  console.log("[mock-seed] attempts, answers, reviews, and proctoring");
  await seedAttemptsAndReviews();
  console.log("[mock-seed] company tools and notifications");
  await seedCompanyTools();
  console.log(JSON.stringify({ ok: true, prefix, companies: companyIds.length, tests: testIds.length, candidates: 18, message: "Mock data seeded for development only" }, null, 2));
} finally {
  await pool.end();
}
