import mysql from "mysql2/promise";
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const queries = {
  users: "SELECT COUNT(*) AS count FROM users WHERE openId LIKE 'sf-mock-%'",
  candidateProfiles: "SELECT COUNT(*) AS count FROM candidateProfiles cp JOIN users u ON u.id = cp.userId WHERE u.openId LIKE 'sf-mock-%'",
  companies: "SELECT COUNT(*) AS count FROM companies WHERE slug LIKE 'sf-mock-%'",
  companyMembers: "SELECT COUNT(*) AS count FROM companyMembers cm JOIN companies c ON c.id = cm.companyId WHERE c.slug LIKE 'sf-mock-%'",
  tests: "SELECT COUNT(*) AS count FROM tests t JOIN companies c ON c.id = t.companyId WHERE c.slug LIKE 'sf-mock-%'",
  testSections: "SELECT COUNT(*) AS count FROM testSections ts JOIN tests t ON t.id = ts.testId JOIN companies c ON c.id = t.companyId WHERE c.slug LIKE 'sf-mock-%'",
  testQuestions: "SELECT COUNT(*) AS count FROM testQuestions tq JOIN testSections ts ON ts.id = tq.sectionId JOIN tests t ON t.id = ts.testId JOIN companies c ON c.id = t.companyId WHERE c.slug LIKE 'sf-mock-%'",
  testAttempts: "SELECT COUNT(*) AS count FROM testAttempts ta JOIN users u ON u.id = ta.candidateId WHERE u.openId LIKE 'sf-mock-%'",
  attemptAnswers: "SELECT COUNT(*) AS count FROM attemptAnswers aa JOIN testAttempts ta ON ta.id = aa.attemptId JOIN users u ON u.id = ta.candidateId WHERE u.openId LIKE 'sf-mock-%'",
  reviews: "SELECT COUNT(*) AS count FROM reviews r JOIN testAttempts ta ON ta.id = r.attemptId JOIN users u ON u.id = ta.candidateId WHERE u.openId LIKE 'sf-mock-%'",
  codeReviewComments: "SELECT COUNT(*) AS count FROM codeReviewComments c JOIN testAttempts ta ON ta.id = c.attemptId JOIN users u ON u.id = ta.candidateId WHERE u.openId LIKE 'sf-mock-%'",
  proctoringSessions: "SELECT COUNT(*) AS count FROM proctoringSessions ps JOIN users u ON u.id = ps.candidateId WHERE u.openId LIKE 'sf-mock-%'",
  proctoringEvents: "SELECT COUNT(*) AS count FROM proctoringEvents pe JOIN proctoringSessions ps ON ps.id = pe.sessionId JOIN users u ON u.id = ps.candidateId WHERE u.openId LIKE 'sf-mock-%'",
  candidateAnnotations: "SELECT COUNT(*) AS count FROM candidateAnnotations ca JOIN companies c ON c.id = ca.companyId WHERE c.slug LIKE 'sf-mock-%'",
  comparisonFilterTemplates: "SELECT COUNT(*) AS count FROM comparisonFilterTemplates ft JOIN companies c ON c.id = ft.companyId WHERE c.slug LIKE 'sf-mock-%'",
  notifications: "SELECT COUNT(*) AS count FROM notifications n JOIN users u ON u.id = n.userId WHERE u.openId LIKE 'sf-mock-%'",
  auditLogs: "SELECT COUNT(*) AS count FROM auditLogs a JOIN users u ON u.id = a.actorUserId WHERE u.openId LIKE 'sf-mock-%'",
};
const counts = {};
for (const [name, query] of Object.entries(queries)) {
  const [rows] = await connection.query(query);
  counts[name] = Number(rows[0].count);
}
console.log(JSON.stringify(counts, null, 2));
await connection.end();
