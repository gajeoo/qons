import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute } from "./components/AdminRoute";
import { AppLayout } from "./components/AppLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicLayout } from "./components/PublicLayout";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import {
  AboutPage,
  AccountPausedPage,
  AdminChatPage,
  AdminDashboardPage,
  AdminLeadsPage,
  AdminSubscribersPage,
  AdminUsersPage,
  AmenitiesPage,
  AnalyticsPage,
  AutomationsPage,
  BlogPage,
  CheckoutSuccessPage,
  ContactPage,
  DashboardPage,
  FeaturesPage,
  HoaPage,
  LandingPage,
  LoginPage,
  OnboardingPage,
  PayrollPage,
  MapPage,
  PricingPage,
  PropertiesPage,
  ResidentsPage,
  SchedulePage,
  SettingsPage,
  SignupPage,
  StaffPage,
  TasksPage,
  TeamPage,
  TimeTrackingPage,
} from "./pages";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={false}>
        <Toaster />
        <Routes>
          {/* Public pages */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>
          </Route>

          {/* Authenticated pages */}
          <Route element={<ProtectedRoute />}>
            {/* Account paused - trial expired, no subscription */}
            <Route path="/account-paused" element={<AccountPausedPage />} />

            {/* Checkout success - public layout for clean look */}
            <Route element={<PublicLayout />}>
              <Route
                path="/checkout/success"
                element={<CheckoutSuccessPage />}
              />
            </Route>

            {/* Onboarding - standalone (no sidebar) */}
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* App pages with sidebar */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/residents" element={<ResidentsPage />} />
              <Route path="/staff" element={<StaffPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/time-tracking" element={<TimeTrackingPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/automations" element={<AutomationsPage />} />
              <Route path="/payroll" element={<PayrollPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/amenities" element={<AmenitiesPage />} />
              <Route path="/hoa" element={<HoaPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Admin pages */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/leads" element={<AdminLeadsPage />} />
                <Route
                  path="/admin/subscribers"
                  element={<AdminSubscribersPage />}
                />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/chat" element={<AdminChatPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
