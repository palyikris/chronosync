import { Navigate, Outlet } from "react-router-dom";
import { PageLoading } from "../components/shared/PageLoading";
import { LoadError } from "../components/shared/LoadError";
import { useCompanyModules } from "./useCompanyModules";
import type { ModuleId } from "./catalog";

export function ModuleRoute({ module }: { module: ModuleId }) {
  const { hasModule, isLoading, isError, isFetching, refetch } = useCompanyModules();
  if (isLoading) return <PageLoading />;
  if (isError) return <LoadError retrying={isFetching} onRetry={() => { void refetch(); }} />;
  return hasModule(module) ? <Outlet /> : <Navigate to="/timesheet" replace />;
}
