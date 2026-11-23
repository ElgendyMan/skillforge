import DashboardLayout, { type DashboardNavGroup, type DashboardNavItem } from "@/components/DashboardLayout";
import { Bell, BriefcaseBusiness, ClipboardCheck, Compass, GitCompareArrows, LayoutDashboard, LockKeyhole, PlusSquare, ShieldCheck, UserRound } from "lucide-react";

type WorkspaceRole = "candidate" | "company" | "supervisor";

const menus: Record<WorkspaceRole, { primary: DashboardNavItem[]; groups: DashboardNavGroup[] }> = {
  candidate: {
    primary: [
      { icon: LayoutDashboard, label: "لوحة المرشح", path: "/candidate" },
      { icon: Compass, label: "اكتشف الاختبارات", path: "/discover" },
      { icon: ClipboardCheck, label: "طلباتي", path: "/candidate/status" },
    ],
    groups: [{ label: "الحساب والإعدادات", defaultOpen: false, items: [
      { icon: Bell, label: "التنبيهات", path: "/candidate/notifications" },
      { icon: LockKeyhole, label: "ملفاتي المؤمنة", path: "/candidate/files" },
      { icon: UserRound, label: "ملفي المهني", path: "/candidate/profile" },
    ] }],
  },
  company: {
    primary: [
      { icon: LayoutDashboard, label: "لوحة الشركة", path: "/company" },
      { icon: PlusSquare, label: "اختبار جديد", path: "/company/create-test" },
      { icon: ClipboardCheck, label: "المحاولات", path: "/company/attempts" },
      { icon: GitCompareArrows, label: "مقارنة المرشحين", path: "/company/compare" },
    ],
    groups: [{ label: "إدارة الشركة", defaultOpen: false, items: [
      { icon: BriefcaseBusiness, label: "اختباراتنا", path: "/company/tests" },
      { icon: UserRound, label: "ملف الشركة", path: "/company/profile" },
      { icon: Bell, label: "التنبيهات", path: "/company/notifications" },
      { icon: LockKeyhole, label: "ملفات المراجعة", path: "/company/files" },
    ] }],
  },
  supervisor: {
    primary: [
      { icon: ShieldCheck, label: "الإشراف", path: "/supervisor" },
      { icon: ClipboardCheck, label: "سجل المحاولات", path: "/supervisor/attempts" },
    ],
    groups: [],
  },
};

export default function PortalShell({ role, children }: { role: WorkspaceRole; children: React.ReactNode }) {
  const title = role === "candidate" ? "مساحة المرشح" : role === "company" ? "مساحة الشركة" : "مركز الإشراف";
  return <DashboardLayout brand="SkillForge" roleLabel={title} items={menus[role].primary} groups={menus[role].groups}>{children}</DashboardLayout>;
}
