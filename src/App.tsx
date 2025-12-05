import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Tracking from "./pages/Tracking";
import Home from "./pages/Home";
import ActionUp from "./pages/ActionUp";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

// Lazy load Dashboard to isolate potential issues
import { lazy, Suspense } from "react";
const Dashboard = lazy(() => import("./pages/Dashboard"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>}>
                <Dashboard />
              </Suspense>
            } />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/home" element={<Home />} />
            <Route path="/action" element={<ActionUp />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
