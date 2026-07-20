export function getHomeRouteForRole(role?: string): string {
  switch (role) {
    case "super_admin":
      return "/super-admin/companies";
    case "company_admin":
      return "/admin/dashboard";
    case "regular":
    default:
      return "/timesheet";
  }
}
