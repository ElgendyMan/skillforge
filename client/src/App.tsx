import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { startLogin } from "./const";
import { useAuth } from "./_core/hooks/useAuth";

function lazyNamed<T extends Record<string, React.ComponentType<any>>>(loader: () => Promise<T>, name: keyof T) {
  return lazy(async () => ({ default: (await loader())[name] }));
}

const platform = () => import("./pages/Platform");
const enhancers = () => import("./pages/AssessmentEnhancers");
const comparisonExperience = () => import("./pages/CompanyComparisonExperience");
const CandidateDashboard = lazyNamed(platform, "CandidateDashboard");
const CandidateProfile = lazyNamed(platform, "CandidateProfile");
const CandidateStatus = lazyNamed(enhancers, "CandidateStatus");
const CompanyAttempts = lazyNamed(platform, "CompanyAttempts");
const CompanyDashboard = lazyNamed(platform, "CompanyDashboard");
const CompanyProfile = lazyNamed(platform, "CompanyProfile");
const CompanyPublicPage = lazyNamed(platform, "CompanyPublicPage");
const CompanyTestCreator = lazyNamed(platform, "CompanyTestCreator");
const CompanyTests = lazyNamed(platform, "CompanyTests");
const DiscoverCatalog = lazyNamed(platform, "DiscoverCatalog");
const NotificationsPage = lazyNamed(platform, "NotificationsPage");
const SecureFilesPage = lazyNamed(platform, "SecureFilesPage");
const SupervisorAttempts = lazyNamed(platform, "SupervisorAttempts");
const SupervisorDashboard = lazyNamed(platform, "SupervisorDashboard");
const CompanyComparison = lazyNamed(comparisonExperience, "CompanyComparison");
const ReviewAttempt = lazyNamed(enhancers, "ReviewAttempt");
const TestRunner = lazyNamed(enhancers, "TestRunner");

type AppRole = "candidate" | "company" | "supervisor";

function workspaceForRole(role: AppRole) {
  return role === "candidate" ? "/candidate" : role === "company" ? "/company" : "/supervisor";
}

function roleLabel(role: AppRole) {
  return role === "candidate" ? "المرشح" : role === "company" ? "الشركة" : "المشرف";
}

function AuthRequiredScreen() {
  return <div className="grid min-h-screen place-items-center bg-[#07101f] p-6 text-center" dir="rtl"><div className="glass-panel max-w-md p-8"><p className="eyebrow">SkillForge Workspace</p><h1 className="mt-3 text-2xl font-semibold text-white">سجّل دخولك عشان تكمل</h1><p className="mt-3 text-sm leading-7 text-slate-400">المنصة بتفتح كل مساحة حسب دور الحساب وصلاحياته.</p><button onClick={() => startLogin()} className="mt-6 w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200">تسجيل الدخول</button></div></div>;
}

function RoleGate({ expected, children }: { expected: AppRole; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#07101f] text-sm text-slate-400" dir="rtl">جاري تجهيز مساحتك...</div>;
  if (!user) return <AuthRequiredScreen />;
  if (user.role !== expected) {
    const currentRole = user.role as AppRole;
    return <div className="grid min-h-screen place-items-center bg-[#07101f] p-6 text-center" dir="rtl"><div className="glass-panel max-w-lg p-8"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-300/10 text-amber-200">!</div><p className="eyebrow mt-5">صلاحيات المساحة</p><h1 className="mt-3 text-2xl font-semibold text-white">المسار ده مش متاح لحسابك</h1><p className="mt-3 text-sm leading-7 text-slate-400">أنت داخل بحساب <strong className="text-slate-200">{roleLabel(currentRole)}</strong>، بينما المسار ده مخصص لـ <strong className="text-slate-200">{roleLabel(expected)}</strong>. بيانات كل مساحة محمية ومفصولة حسب الدور.</p><button onClick={() => setLocation(workspaceForRole(currentRole))} className="mt-6 w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">افتح مساحة {roleLabel(currentRole)}</button></div></div>;
  }
  return <>{children}</>;
}

function Router() {
  // RoleGate must wrap role pages before their lazy components mount, so protected queries cannot run for another role.
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#07101f] text-sm text-slate-400">جاري تحميل المساحة...</div>}><Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/discover"} component={DiscoverCatalog} />
      <Route path={"/candidate"}><RoleGate expected="candidate"><CandidateDashboard /></RoleGate></Route>
      <Route path={"/candidate/dashboard"}><Redirect to="/candidate" /></Route>
      <Route path={"/candidate/profile"}><RoleGate expected="candidate"><CandidateProfile /></RoleGate></Route>
      <Route path={"/candidate/status"}><RoleGate expected="candidate"><CandidateStatus /></RoleGate></Route>
      <Route path={"/candidate/notifications"}><RoleGate expected="candidate"><NotificationsPage /></RoleGate></Route>
      <Route path={"/candidate/files"}><RoleGate expected="candidate"><SecureFilesPage /></RoleGate></Route>
      <Route path={"/company"}><RoleGate expected="company"><CompanyDashboard /></RoleGate></Route>
      <Route path={"/company/dashboard"}><Redirect to="/company" /></Route>
      <Route path={"/company/create-test"}><RoleGate expected="company"><CompanyTestCreator /></RoleGate></Route>
      <Route path={"/company/attempts"}><RoleGate expected="company"><CompanyAttempts /></RoleGate></Route>
      <Route path={"/company/compare"}><RoleGate expected="company"><CompanyComparison /></RoleGate></Route>
      <Route path={"/company/tests"}><RoleGate expected="company"><CompanyTests /></RoleGate></Route>
      <Route path={"/company/profile"}><RoleGate expected="company"><CompanyProfile /></RoleGate></Route>
      <Route path={"/company/notifications"}><RoleGate expected="company"><NotificationsPage /></RoleGate></Route>
      <Route path={"/company/files"}><RoleGate expected="company"><SecureFilesPage /></RoleGate></Route>
      <Route path={"/company/review/:id"}><RoleGate expected="company"><ReviewAttempt /></RoleGate></Route>
      <Route path={"/supervisor"}><RoleGate expected="supervisor"><SupervisorDashboard /></RoleGate></Route>
      <Route path={"/supervisor/attempts"}><RoleGate expected="supervisor"><SupervisorAttempts /></RoleGate></Route>
      <Route path={"/attempt/:id"} component={TestRunner} />
      <Route path={"/companies/:slug"} component={CompanyPublicPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch></Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
