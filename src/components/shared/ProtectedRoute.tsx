import React from "react";
import { useAuth } from "../../context/useAuth";
import { Navigate, Outlet } from "react-router-dom";
import type { ProtectedRouteProps } from "../../types/ui";

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requireAdmin = false,
  allowedRoles,
}) => {
  const { user, profile, loading, isSuperAdmin, isCompanyAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not logged in? Redirect to /login
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  // Requires admin privileges but user is regular? Redirect to personal timesheet
  if (requireAdmin && (!isSuperAdmin && !isCompanyAdmin)) {
    return <Navigate to="/timesheet" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={profile.role === "super_admin" ? "/super-admin/companies" : "/timesheet"} replace />;
  }

  return <Outlet />;
};
