import { describe, expect, it } from "vitest";
import { buildComparisonCsv, escapeCsvValue } from "./comparisonExport";

describe("comparison CSV export", () => {
  it("escapes commas, quotes, and newlines without losing Arabic content", () => {
    expect(escapeCsvValue('أحمد, "مختبر"\nأمن')).toBe('"أحمد, ""مختبر""\nأمن"');
  });

  it("exports the approved comparison fields with a UTF-8 BOM", () => {
    const csv = buildComparisonCsv([{ candidateName: "أحمد", jobTitle: "Web Pentester", testTitle: "اختبار XSS", score: 91, priority: 95, status: "مقبول", integrityFlags: 0, skills: ["XSS", "Burp"], submittedAt: new Date("2026-08-17T00:00:00Z") }]);
    expect(csv.startsWith("\uFEFFالمرشح,المسمى الوظيفي")).toBe(true);
    expect(csv).toContain("أحمد,Web Pentester,اختبار XSS,91,95,مقبول,0,XSS | Burp");
  });

  it("includes only the user-selected CSV columns in the selected order", () => {
    const csv = buildComparisonCsv([{ candidateName: "أحمد", jobTitle: "Web Pentester", testTitle: "اختبار XSS", score: 91, priority: 95, status: "مقبول", integrityFlags: 0, skills: ["XSS"], submittedAt: new Date("2026-08-17T00:00:00Z") }], ["candidateName", "status", "priority"]);
    expect(csv).toContain("المرشح,الأولوية,الحالة");
    expect(csv).toContain("أحمد,95,مقبول");
    expect(csv).not.toContain("Web Pentester");
  });
});
