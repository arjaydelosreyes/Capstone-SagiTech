import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";

// Pages
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { FarmerDashboard } from "./pages/dashboard/farmer/FarmerDashboard";
import { FarmerScan } from "./pages/dashboard/farmer/FarmerScan";
import { FarmerHistory } from "./pages/dashboard/farmer/FarmerHistory";
import { FarmerAnalytics } from "./pages/dashboard/farmer/FarmerAnalytics";
import { AdminDashboard } from "./pages/dashboard/admin/AdminDashboard";
import { AdminUsers } from "./pages/dashboard/admin/AdminUsers";
import { AdminAnalytics } from "./pages/dashboard/admin/AdminAnalytics";
import { AdminSettings } from "./pages/dashboard/admin/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Farmer Dashboard Routes */}
              <Route path="/dashboard/farmer" element={<FarmerDashboard />} />
              <Route path="/dashboard/farmer/scan" element={<FarmerScan />} />
              <Route path="/dashboard/farmer/history" element={<FarmerHistory />} />
              <Route path="/dashboard/farmer/analytics" element={<FarmerAnalytics />} />
              
              {/* Admin Dashboard Routes */}
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
              <Route path="/dashboard/admin/users" element={<AdminUsers />} />
              <Route path="/dashboard/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/dashboard/admin/settings" element={<AdminSettings />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
