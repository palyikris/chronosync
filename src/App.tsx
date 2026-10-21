import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { getHomeRouteForRole } from "./utils/navigation";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";
import { AppLayout } from "./components/shared/AppLayout";
import { TimesheetPage } from "./pages/TimesheetPage";
import { CompanySettingsPage } from "./pages/CompanySettingsPage";
import { UserManagementPage } from "./pages/UserManagementPage";
import { AdminDashboardPage } from "./pages/DashboardPage";
import { CompanyManagementPage } from "./pages/CompanyManagementPage";
import { UserSettingsPage } from "./pages/UserSettingsPage";
import { AuthProvider } from "./context/AuthContext";
import TimesheetReviewPage from "./pages/TimesheetReviewPage";
import AuditLogPage from "./pages/LogsPage";
import LeaveRequestsPage from "./pages/LeaveRequestsPage";
import { DashboardHeader } from "./components/dashboard/DashboardHeader";

const DashboardHeaderPreview: React.FC = () => {
  const [startDate, setStartDate] = React.useState("2026-10-01");
  const [endDate, setEndDate] = React.useState("2026-10-21");

  return (
    <main className="min-h-screen bg-bg p-8">
      <DashboardHeader
        startDate={startDate}
        endDate={endDate}
        isDateRangeValid={startDate <= endDate}
        isRefreshing={false}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        companyId="preview"
      />
    </main>
  );
};

// Dynamic Index Redirect Component
const RootRedirect: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary-strong"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getHomeRouteForRole(profile.role)} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {import.meta.env.DEV ? (
            <Route path="/dashboard-header-preview" element={<DashboardHeaderPreview />} />
          ) : null}
          {/* Public Auth Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root Redirect Handler */}
          <Route path="/" element={<Navigate to={"/login"} />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/timesheet" element={<TimesheetPage />} />
              <Route path="/leaves" element={<LeaveRequestsPage />} />

              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route
                path="/admin/settings"
                element={<CompanySettingsPage />}
              ></Route>
              <Route
                path="/super-admin/companies"
                element={<CompanyManagementPage />}
              />
              <Route
                element={
                  <ProtectedRoute allowedRoles={["company_admin"]} />
                }
              >
                <Route
                  path="/admin/review"
                  element={<TimesheetReviewPage />}
                />
              </Route>
              <Route
                path="/super-admin/logs"
                element={<AuditLogPage></AuditLogPage>}
              ></Route>
              <Route path="/settings" element={<UserSettingsPage />} />
            </Route>
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
