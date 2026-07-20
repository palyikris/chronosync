import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { getHomeRouteForRole } from "./utils/navigation";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";
import { AppLayout } from "./components/shared/AppLayout";
import { TimesheetPage } from "./pages/TimesheetPage";
import { CompanySettingsPage } from "./pages/CompanySettingsPage";

// Dynamic Index Redirect Component
const RootRedirect: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ABDB11]"></div>
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
          {/* Public Auth Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root Redirect Handler */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/timesheet" element={<TimesheetPage />} />

              {/* Placeholders for upcoming Admin Pages */}
              <Route
                path="/admin/dashboard"
                element={<div>Company Dashboard Placeholder</div>}
              />
              <Route
                path="/admin/users"
                element={<div>Manage Team Placeholder</div>}
              />
              <Route
                path="/admin/settings"
                element={<CompanySettingsPage />}
              ></Route>
              <Route
                path="/super-admin/companies"
                element={<div>Super Admin Company Directory Placeholder</div>}
              />
            </Route>
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
