import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const comparisonSource = readFileSync(resolve(process.cwd(), "client/src/pages/CompanyComparisonExperience.tsx"), "utf8");
const dashboardShellSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");

describe("company comparison experience", () => {
  it("keeps both export actions in a visible loading and disabled state", () => {
    expect(comparisonSource).toContain('const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null)');
    expect(comparisonSource).toContain('disabled={Boolean(exporting)}');
    expect(comparisonSource).toContain('animate-spin');
    expect(comparisonSource).toContain('toast.success("تم تنزيل ملف CSV بنجاح.")');
    expect(comparisonSource).toContain('toast.error("تعذر إنشاء ملف CSV.")');
    expect(comparisonSource).toContain('toast.success("تم فتح معاينة PDF. اختر حفظ كـ PDF من نافذة الطباعة.")');
  });

  it("keeps comparison controls and cards responsive without horizontal overflow", () => {
    expect(comparisonSource).toContain('page-wrap overflow-x-hidden');
    expect(comparisonSource).toContain('sm:grid-cols-2');
    expect(comparisonSource).toContain('2xl:grid-cols-4');
    expect(comparisonSource).toContain('xl:grid-cols-[320px_minmax(0,1fr)]');
  });

  it("keeps the shared company dashboard shell constrained on narrow screens", () => {
    expect(dashboardShellSource).toContain('w-full max-w-full overflow-x-hidden');
    expect(dashboardShellSource).toContain('min-h-screen min-w-0');
    expect(dashboardShellSource).toContain('truncate font-semibold text-white');
  });
});
