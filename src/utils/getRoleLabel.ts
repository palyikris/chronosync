import type { UserRole } from "../types/auth";

export const getRoleLabel = (role: UserRole | string) => {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "company_admin":
      return "Company Admin";
    case "regular":
      return "Regular User";
    default:
      return "Unknown Role";
  }
};
