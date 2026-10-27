import React, { lazy, Suspense } from "react";
import { PageLoading } from "./components/shared/PageLoading";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/useAuth";
import { getHomeRouteForRole } from "./utils/navigation";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";
import { AppLayout } from "./components/shared/AppLayout";
import { AuthProvider } from "./context/AuthContext";

const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const AuthActionPage = lazy(() => import("./pages/AuthActionPage").then(m => ({ default: m.AuthActionPage })));
const TimesheetPage = lazy(() => import("./pages/TimesheetPage").then(m => ({ default: m.TimesheetPage })));
const CompanySettingsPage = lazy(() => import("./pages/CompanySettingsPage").then(m => ({ default: m.CompanySettingsPage })));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage").then(m => ({ default: m.UserManagementPage })));
const AdminDashboardPage = lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.AdminDashboardPage })));
const CompanyManagementPage = lazy(() => import("./pages/CompanyManagementPage").then(m => ({ default: m.CompanyManagementPage })));
const UserSettingsPage = lazy(() => import("./pages/UserSettingsPage").then(m => ({ default: m.UserSettingsPage })));
const TimesheetReviewPage = lazy(() => import("./pages/TimesheetReviewPage"));
const AuditLogPage = lazy(() => import("./pages/LogsPage"));
const LeaveRequestsPage = lazy(() => import("./pages/LeaveRequestsPage"));
const DashboardHeader = lazy(() => import("./components/dashboard/DashboardHeader").then(m => ({ default: m.DashboardHeader })));
const InvoiceAttachmentsPage = lazy(() => import("./pages/InvoiceAttachmentsPage").then(m => ({ default: m.InvoiceAttachmentsPage })));
const ClientBillingPage = lazy(() => import("./pages/ClientBillingPage").then(m => ({ default: m.ClientBillingPage })));

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
        <Suspense fallback={<PageLoading />}>
          <Routes>
            {import.meta.env.DEV ? (
              <>
                <Route
                  path="/dashboard-header-preview"
                  element={<DashboardHeaderPreview />}
                />
                <Route
                  path="/client-billing-preview"
                  element={<ClientBillingPage preview />}
                />
              </>
            ) : null}
            {/* Public Auth Route */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/invite" element={<AuthActionPage key="invite" />} />
            <Route path="/auth/magic" element={<AuthActionPage key="magic" />} />
            <Route path="/auth/recover" element={<AuthActionPage key="recover" />} />

            {/* Root Redirect Handler */}
            <Route path="/" element={<RootRedirect />} />

            {/* Protected Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/timesheet" element={<TimesheetPage />} />
                <Route path="/leaves" element={<LeaveRequestsPage />} />

                <Route element={<ProtectedRoute requireAdmin />}>
                  <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                  <Route path="/admin/users" element={<UserManagementPage />} />
                  <Route path="/admin/settings" element={<CompanySettingsPage />} />
                </Route>
                <Route
                  element={<ProtectedRoute allowedRoles={["company_admin"]} />}
                >
                  <Route path="/admin/review" element={<TimesheetReviewPage />} />
                  <Route
                    path="/admin/invoice-attachments"
                    element={<InvoiceAttachmentsPage />}
                  />
                  <Route
                    path="/admin/billing"
                    element={<ClientBillingPage />}
                  />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
                  <Route path="/super-admin/companies" element={<CompanyManagementPage />} />
                  <Route path="/super-admin/logs" element={<AuditLogPage />} />
                </Route>
                <Route path="/settings" element={<UserSettingsPage />} />
              </Route>
            </Route>

            {/* Catch-all Redirect */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
