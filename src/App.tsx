import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Tracking from "./pages/Tracking";
import ActionUp from "./pages/ActionUp";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { Toaster as Sonner } from "@/components/ui/sonner";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Sonner />
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/home" element={<Home />} />
          <Route path="/action" element={<ActionUp />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;