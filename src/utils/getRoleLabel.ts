import type { UserRole } from "../types/auth";
import i18n from "../lib/i18n";

export const getRoleLabel = (role: UserRole | string) => {
  switch (role) {
    case "super_admin":
      return i18n.t("roles.superAdmin");
    case "company_admin":
      return i18n.t("roles.companyAdmin");
    case "regular":
      return i18n.t("roles.regularUser");
    default:
      return i18n.t("roles.unknownRole");
  }
};
