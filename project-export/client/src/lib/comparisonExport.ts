export type ComparisonExportRow = {
  candidateName: string;
  jobTitle: string;
  testTitle: string;
  score: number | null;
  priority: number;
  status: string;
  integrityFlags: number;
  skills: string[];
  submittedAt: Date | null;
};

export const comparisonCsvColumns = [
  { id: "candidateName", label: "المرشح" },
  { id: "jobTitle", label: "المسمى الوظيفي" },
  { id: "testTitle", label: "الاختبار" },
  { id: "score", label: "النتيجة" },
  { id: "priority", label: "الأولوية" },
  { id: "status", label: "الحالة" },
  { id: "integrityFlags", label: "تنبيهات النزاهة" },
  { id: "skills", label: "المهارات" },
  { id: "submittedAt", label: "تاريخ التقديم" },
] as const;

export type ComparisonCsvColumn = (typeof comparisonCsvColumns)[number]["id"];

export function escapeCsvValue(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function columnValue(row: ComparisonExportRow, column: ComparisonCsvColumn) {
  if (column === "skills") return row.skills.join(" | ");
  if (column === "submittedAt") return row.submittedAt ? row.submittedAt.toISOString() : "";
  return row[column] ?? "";
}

export function buildComparisonCsv(rows: ComparisonExportRow[], columns: ComparisonCsvColumn[] = comparisonCsvColumns.map(column => column.id)) {
  const selected = comparisonCsvColumns.filter(column => columns.includes(column.id));
  if (!selected.length) throw new Error("Select at least one CSV column.");
  const values = rows.map(row => selected.map(column => escapeCsvValue(columnValue(row, column.id))).join(","));
  return `\uFEFF${[selected.map(column => escapeCsvValue(column.label)).join(","), ...values].join("\n")}`;
}

export function downloadComparisonCsv(rows: ComparisonExportRow[], columns?: ComparisonCsvColumn[]) {
  const blob = new Blob([buildComparisonCsv(rows, columns)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = `skillforge-candidate-comparison-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
}

function htmlEscape(value: string | number | null | undefined) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

export function buildComparisonPrintDocument(rows: ComparisonExportRow[], filters: { jobTitle?: string; questionType?: string; submittedFrom?: string; submittedTo?: string }) {
  const filterText = [filters.jobTitle && `المسمى: ${filters.jobTitle}`, filters.questionType && `نوع السؤال: ${filters.questionType}`, filters.submittedFrom && `من: ${filters.submittedFrom}`, filters.submittedTo && `إلى: ${filters.submittedTo}`].filter(Boolean).join(" — ") || "بدون فلاتر";
  const body = rows.map(row => `<tr><td>${htmlEscape(row.candidateName)}</td><td>${htmlEscape(row.jobTitle)}</td><td>${htmlEscape(row.testTitle)}</td><td>${htmlEscape(row.score ?? "—")}</td><td>${htmlEscape(row.priority)}</td><td>${htmlEscape(row.status)}</td><td>${htmlEscape(row.integrityFlags)}</td><td>${htmlEscape(row.skills.join(" · "))}</td><td>${htmlEscape(row.submittedAt ? row.submittedAt.toLocaleDateString("ar-EG") : "—")}</td></tr>`).join("");
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>مقارنة مرشحي SkillForge</title><style>body{font-family:Arial,sans-serif;color:#102033;padding:32px}.meta{color:#52667d;margin-bottom:24px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#102b46;color:#fff}th,td{border:1px solid #d7e0e9;padding:9px;text-align:right;vertical-align:top}tr:nth-child(even){background:#f6f9fc}@media print{body{padding:0}}</style></head><body><h1>مقارنة المرشحين</h1><p class="meta">${htmlEscape(filterText)}<br/>تم الإنشاء: ${htmlEscape(new Date().toLocaleString("ar-EG"))}</p><table><thead><tr><th>المرشح</th><th>المسمى</th><th>الاختبار</th><th>النتيجة</th><th>الأولوية</th><th>الحالة</th><th>التنبيهات</th><th>المهارات</th><th>التقديم</th></tr></thead><tbody>${body}</tbody></table></body></html>`;
}

export function openComparisonPrintPreview(rows: ComparisonExportRow[], filters: { jobTitle?: string; questionType?: string; submittedFrom?: string; submittedTo?: string }) {
  const preview = window.open("", "_blank"); if (!preview) return false; preview.opener = null;
  preview.document.write(buildComparisonPrintDocument(rows, filters)); preview.document.close(); preview.focus(); window.setTimeout(() => preview.print(), 250); return true;
}
