import DashboardLayout, { type DashboardNavItem } from "@/components/DashboardLayout";
import { Bell, BriefcaseBusiness, ClipboardCheck, Compass, LayoutDashboard, PlusSquare, ShieldCheck, UserRound } from "lucide-react";

type WorkspaceRole = "candidate" | "company" | "supervisor";

const menus: Record<WorkspaceRole, DashboardNavItem[]> = {
  candidate: [
    { icon: LayoutDashboard, label: "لوحة المرشح", path: "/candidate" },
    { icon: Compass, label: "اكتشف الاختبارات", path: "/discover" },
    { icon: ClipboardCheck, label: "طلباتي", path: "/candidate/status" },
    { icon: Bell, label: "التنبيهات", path: "/candidate/notifications" },
    { icon: UserRound, label: "ملفي المهني", path: "/candidate/profile" },
  ],
  company: [
    { icon: LayoutDashboard, label: "لوحة الشركة", path: "/company" },
    { icon: PlusSquare, label: "اختبار جديد", path: "/company/create-test" },
    { icon: ClipboardCheck, label: "المحاولات", path: "/company/attempts" },
    { icon: BriefcaseBusiness, label: "اختباراتنا", path: "/company/tests" },
    { icon: UserRound, label: "ملف الشركة", path: "/company/profile" },
    { icon: Bell, label: "التنبيهات", path: "/company/notifications" },
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
