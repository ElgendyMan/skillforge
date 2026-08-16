import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { CandidateDashboard, CandidatePerformance, CandidateProfile, CandidateStatus, CodePlaygroundPage, CompanyAttempts, CompanyDashboard, CompanyProfile, CompanyPublicPage, CompanyRankingPage, CompanyReviewMediaIndex, CompanyReviewMediaPage, CompanyTestCreator, CompanyTests, DiscoverCatalog, NotificationsPage, ReviewAttempt, SecureFilesPage, SupervisorAttempts, SupervisorDashboard, TestRunner } from "./pages/Platform";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/discover"} component={DiscoverCatalog} />
      <Route path={"/candidate"} component={CandidateDashboard} />
      <Route path={"/candidate/profile"} component={CandidateProfile} />
      <Route path={"/candidate/status"} component={CandidateStatus} />
      <Route path={"/candidate/performance"} component={CandidatePerformance} />
      <Route path={"/candidate/notifications"} component={NotificationsPage} />
      <Route path={"/candidate/files"} component={SecureFilesPage} />
      <Route path={"/company"} component={CompanyDashboard} />
      <Route path={"/company/create-test"} component={CompanyTestCreator} />
      <Route path={"/company/attempts"} component={CompanyAttempts} />
      <Route path={"/company/ranking"} component={CompanyRankingPage} />
      <Route path={"/company/tests"} component={CompanyTests} />
      <Route path={"/company/profile"} component={CompanyProfile} />
      <Route path={"/company/notifications"} component={NotificationsPage} />
      <Route path={"/company/files"} component={SecureFilesPage} />
      <Route path={"/company/review/:id"} component={ReviewAttempt} />
      <Route path={"/company/media"} component={CompanyReviewMediaIndex} />
      <Route path={"/company/review/:id/media"} component={CompanyReviewMediaPage} />
      <Route path={"/supervisor"} component={SupervisorDashboard} />
      <Route path={"/supervisor/attempts"} component={SupervisorAttempts} />
      <Route path={"/attempt/:id"} component={TestRunner} />
      <Route path={"/attempt/:attemptId/code/:questionId"} component={CodePlaygroundPage} />
      <Route path={"/companies/:slug"} component={CompanyPublicPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
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
