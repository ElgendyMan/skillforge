import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

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

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#07101f] text-sm text-slate-400">جاري تحميل المساحة...</div>}><Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/discover"} component={DiscoverCatalog} />
      <Route path={"/candidate"} component={CandidateDashboard} />
      <Route path={"/candidate/dashboard"}><Redirect to="/candidate" /></Route>
      <Route path={"/candidate/profile"} component={CandidateProfile} />
      <Route path={"/candidate/status"} component={CandidateStatus} />
      <Route path={"/candidate/notifications"} component={NotificationsPage} />
      <Route path={"/candidate/files"} component={SecureFilesPage} />
      <Route path={"/company"} component={CompanyDashboard} />
      <Route path={"/company/dashboard"}><Redirect to="/company" /></Route>
      <Route path={"/company/create-test"} component={CompanyTestCreator} />
      <Route path={"/company/attempts"} component={CompanyAttempts} />
      <Route path={"/company/compare"} component={CompanyComparison} />
      <Route path={"/company/tests"} component={CompanyTests} />
      <Route path={"/company/profile"} component={CompanyProfile} />
      <Route path={"/company/notifications"} component={NotificationsPage} />
      <Route path={"/company/files"} component={SecureFilesPage} />
      <Route path={"/company/review/:id"} component={ReviewAttempt} />
      <Route path={"/supervisor"} component={SupervisorDashboard} />
      <Route path={"/supervisor/attempts"} component={SupervisorAttempts} />
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
