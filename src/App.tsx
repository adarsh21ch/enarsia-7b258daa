import { Component, ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { TrackingFormatProvider } from "@/contexts/TrackingFormatContext";
import { CustomOptionsProvider } from "@/contexts/CustomOptionsContext";
import { ProspectsProvider } from "@/contexts/ProspectsContext";
import { TodosProvider } from "@/contexts/TodosContext";
import { Toaster } from "sonner";
import { InstallPromptBanner } from "@/components/pwa/InstallPromptBanner";
import { UpdateBanner } from "@/components/pwa/UpdateBanner";

// Direct imports
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Tracking from "./pages/Tracking";
import TodoUp from "./pages/TodoUp";
import ListUp from "./pages/ListUp";
import Inbox from "./pages/Inbox";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import Admin from "./pages/Admin";
import PaymentSuccess from "./pages/PaymentSuccess";

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
      staleTime: 60000, // 1 minute - data considered fresh, prevents unnecessary refetches
      gcTime: 300000, // 5 minutes - keep unused data in cache for faster navigation
      refetchOnMount: false, // Don't refetch when components remount (tab switches)
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CustomOptionsProvider>
              <TrackingFormatProvider>
                <ProspectsProvider>
                  <TodosProvider>
                    <Toaster position="top-center" />
                    <InstallPromptBanner />
                    <UpdateBanner />
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/tracking" element={<Tracking />} />
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
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </TodosProvider>
                </ProspectsProvider>
              </TrackingFormatProvider>
            </CustomOptionsProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
