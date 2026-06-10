import { Component, ReactNode, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { TrackingFormatProvider } from "@/contexts/TrackingFormatContext";
import { CustomOptionsProvider } from "@/contexts/CustomOptionsContext";
import { ProspectsProvider } from "@/contexts/ProspectsContext";
import { TodosProvider } from "@/contexts/TodosContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { CreatorAccountProvider } from "@/contexts/CreatorAccountContext";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { InstallPromptBanner } from "@/components/pwa/InstallPromptBanner";
import { UpdateBanner } from "@/components/pwa/UpdateBanner";
import { ReinstallForNewLogoNotice } from "@/components/pwa/ReinstallForNewLogoNotice";
import { AppAccessTracker } from "@/components/AppAccessTracker";
import { AutoDemoTour } from "@/components/onboarding/AutoDemoTour";
import { WhatsAppChoiceProvider } from "@/components/whatsapp/WhatsAppChoiceProvider";
import { Loader2 } from "lucide-react";

// Entry-path pages stay eager
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Index from "./pages/Index";

// Tab pages are lazy-loaded to shrink the initial bundle
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ListUp = lazy(() => import("./pages/ListUp"));
const TodoUp = lazy(() => import("./pages/TodoUp"));
const Tracking = lazy(() => import("./pages/Tracking"));
const TeamTracking = lazy(() => import("./pages/TeamTracking"));
const MemberProspectsReadOnly = lazy(() => import("./pages/MemberProspectsReadOnly"));

// Lazy load less frequently accessed pages
const Home = lazy(() => import("./pages/Home"));
const Inbox = lazy(() => import("./pages/Inbox"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Refund = lazy(() => import("./pages/Refund"));
const Admin = lazy(() => import("./pages/Admin"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Funnels = lazy(() => import("./pages/Funnels"));
const FunnelEditor = lazy(() => import("./pages/FunnelEditor"));
const FunnelAnalytics = lazy(() => import("./pages/FunnelAnalytics"));
const FunnelView = lazy(() => import("./pages/FunnelView"));
const FormsDashboard = lazy(() => import("./features/forms/pages/FormsDashboard"));
const FormResponsesPage = lazy(() => import("./features/forms/pages/FormResponsesPage"));
const PublicFormPage = lazy(() => import("./features/forms/pages/PublicFormPage"));
const SharedLeads = lazy(() => import("./pages/SharedLeads"));
const Notes = lazy(() => import("./pages/Notes"));
const NoteEditor = lazy(() => import("./pages/NoteEditor"));
const TrackingFormat = lazy(() => import("./pages/TrackingFormat"));
const RecentlyDeleted = lazy(() => import("./pages/RecentlyDeleted"));
const ExportData = lazy(() => import("./pages/ExportData"));
// Content Creator mode tabs
const CreatorIdeas = lazy(() => import("./pages/creator/Ideas"));
const CreatorStudio = lazy(() => import("./pages/creator/Studio"));
const CreatorCalendar = lazy(() => import("./pages/creator/Calendar"));
const CreatorInsights = lazy(() => import("./pages/creator/Insights"));

// Founder mode tabs
const Manage = lazy(() => import("./pages/founder/Manage"));
const ManageFunction = lazy(() => import("./pages/founder/ManageFunction"));

// Enarsia Academy (public)
const Academy = lazy(() => import("./pages/Academy"));
const AcademyTutorial = lazy(() => import("./pages/AcademyTutorial"));

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

// Error Boundary to catch rendering errors
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
          <h1 className="text-xl font-bold text-destructive mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-4">{this.state.error?.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 120000, // 2 minutes - data stays fresh longer, fewer refetches on tab switch
      gcTime: 600000, // 10 minutes - keep cache longer for snappy back-navigation
      refetchOnMount: false, // Don't refetch when components remount (tab switches)
      refetchOnReconnect: false, // Don't auto-refetch on reconnect
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <PermissionsProvider>
              <CustomOptionsProvider>
                <TrackingFormatProvider>
                  <ProspectsProvider>
                    <TodosProvider>
                    <CreatorAccountProvider>
                    <Toaster position="top-center" />
                    <InstallPromptBanner />
                    <UpdateBanner />
                    <ReinstallForNewLogoNotice />
                    <AppAccessTracker />
                    <AutoDemoTour />
                    <WhatsAppChoiceProvider />
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/tracking" element={<Tracking />} />
                        <Route path="/team-tracking" element={<TeamTracking />} />
                        <Route path="/team-tracking/member/:userId/prospects" element={<MemberProspectsReadOnly />} />
                        <Route path="/home" element={<Home />} />
                        <Route path="/action" element={<TodoUp />} />
                        <Route path="/listup" element={<ListUp />} />
                        <Route path="/inbox" element={<Inbox />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/refund" element={<Refund />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/payment-success" element={<PaymentSuccess />} />
                        <Route path="/funnels" element={<Funnels />} />
                        <Route path="/funnels/new" element={<FunnelEditor />} />
                        <Route path="/funnels/:id/edit" element={<FunnelEditor />} />
                        <Route path="/funnels/:id/analytics" element={<FunnelAnalytics />} />
                        <Route path="/f/:slug" element={<FunnelView />} />
                        <Route path="/forms" element={<FormsDashboard />} />
                        <Route path="/forms/:formId/responses" element={<FormResponsesPage />} />
                        <Route path="/share/form/:token" element={<PublicFormPage />} />
                        <Route path="/shared-leads" element={<SharedLeads />} />
                        <Route path="/notes" element={<Notes />} />
                        <Route path="/notes/:id" element={<NoteEditor />} />
                        <Route path="/tracking-format" element={<TrackingFormat />} />
                        <Route path="/recently-deleted" element={<RecentlyDeleted />} />
                        <Route path="/profile/export" element={<ExportData />} />
                        <Route path="/creator" element={<Navigate to="/creator/ideas" replace />} />
                        <Route path="/creator/ideas" element={<CreatorIdeas />} />
                        <Route path="/creator/studio" element={<CreatorStudio />} />
                        <Route path="/creator/calendar" element={<CreatorCalendar />} />
                        <Route path="/creator/insights" element={<CreatorInsights />} />
                        {/* Legacy creator paths → new /creator/* */}
                        <Route path="/ideas" element={<Navigate to="/creator/ideas" replace />} />
                        <Route path="/studio" element={<Navigate to="/creator/studio" replace />} />
                        <Route path="/calendar" element={<Navigate to="/creator/calendar" replace />} />
                        <Route path="/insights" element={<Navigate to="/creator/insights" replace />} />
                        <Route path="/manage" element={<Manage />} />
                        <Route path="/manage/:functionKey" element={<ManageFunction />} />
                        <Route path="/marketing" element={<ManageFunction fixedKey="marketing" />} />
                        <Route path="/sales" element={<ManageFunction fixedKey="sales" />} />
                        <Route path="/academy" element={<Academy />} />
                        <Route path="/academy/:slug" element={<AcademyTutorial />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                    </CreatorAccountProvider>
                    </TodosProvider>
                  </ProspectsProvider>
                </TrackingFormatProvider>
              </CustomOptionsProvider>
            </PermissionsProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
