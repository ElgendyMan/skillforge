import DashboardLayout, { type DashboardNavItem } from "@/components/DashboardLayout";
import { Bell, BriefcaseBusiness, ClipboardCheck, Compass, Eye, LayoutDashboard, LockKeyhole, PlusSquare, ShieldCheck, Sparkles, UserRound, UsersRound } from "lucide-react";

type WorkspaceRole = "candidate" | "company" | "supervisor";

const menus: Record<WorkspaceRole, DashboardNavItem[]> = {
  candidate: [
    { icon: LayoutDashboard, label: "لوحة المرشح", path: "/candidate" },
    { icon: Compass, label: "اكتشف الاختبارات", path: "/discover" },
    { icon: ClipboardCheck, label: "طلباتي", path: "/candidate/status" },
    { icon: Sparkles, label: "تحليلات أدائي", path: "/candidate/performance" },
    { icon: Bell, label: "التنبيهات", path: "/candidate/notifications" },
    { icon: LockKeyhole, label: "ملفاتي المؤمنة", path: "/candidate/files" },
    { icon: UserRound, label: "ملفي المهني", path: "/candidate/profile" },
  ],
  company: [
    { icon: LayoutDashboard, label: "لوحة الشركة", path: "/company" },
    { icon: PlusSquare, label: "اختبار جديد", path: "/company/create-test" },
    { icon: ClipboardCheck, label: "المحاولات", path: "/company/attempts" },
    { icon: Eye, label: "مراجعة التسجيلات", path: "/company/media" },
    { icon: UsersRound, label: "ترتيب المرشحين", path: "/company/ranking" },
    { icon: BriefcaseBusiness, label: "اختباراتنا", path: "/company/tests" },
    { icon: UserRound, label: "ملف الشركة", path: "/company/profile" },
    { icon: Bell, label: "التنبيهات", path: "/company/notifications" },
    { icon: LockKeyhole, label: "ملفات المراجعة", path: "/company/files" },
  ],
  supervisor: [
    { icon: ShieldCheck, label: "الإشراف", path: "/supervisor" },
    { icon: ClipboardCheck, label: "سجل المحاولات", path: "/supervisor/attempts" },
  ],
};

export default function PortalShell({ role, children }: { role: WorkspaceRole; children: React.ReactNode }) {
  const title = role === "candidate" ? "مساحة المرشح" : role === "company" ? "مساحة الشركة" : "مركز الإشراف";
  return <DashboardLayout brand="SkillForge" roleLabel={title} items={menus[role]}>{children}</DashboardLayout>;
}
