import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3Cog,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ScanEye,
  ScrollText,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/useAuth";
import { getRoleLabel } from "../../utils/getRoleLabel";
import type { NavItem } from "../../types/ui";

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  isMobileOpen,
  onCollapsedChange,
  onMobileClose,
}) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const mainNavItems: NavItem[] = [
    { to: "/timesheet", label: t("navigation.timesheets"), icon: Clock },
    {
      to: "/leaves",
      label: t("navigation.leaveRequests"),
      icon: CalendarRange,
    },
    {
      to: "/admin/dashboard",
      label: t("navigation.dashboard"),
      icon: LayoutDashboard,
      roleRequired: "company_admin",
    },
    {
      to: "/admin/invoice-attachments",
      label: t("navigation.invoiceAttachments"),
      icon: FileSpreadsheet,
      roleRequired: "company_admin",
    },
    {
      to: "/admin/billing",
      label: t("navigation.automaticInvoicing"),
      icon: ReceiptText,
      roleRequired: "company_admin",
    },
    {
      to: "/admin/review",
      label: t("navigation.timesheetReview"),
      icon: ScanEye,
      roleRequired: "company_admin",
    },
    {
      to: "/admin/users",
      label: t("navigation.teamMembers"),
      icon: Users,
      roleRequired: "company_admin",
    },
    {
      to: "/admin/settings",
      label: t("navigation.companySettings"),
      icon: Columns3Cog,
      roleRequired: "company_admin",
    },
    {
      to: "/super-admin/companies",
      label: t("navigation.companies"),
      icon: Building2,
      roleRequired: "super_admin",
    },
    {
      to: "/super-admin/logs",
      label: t("navigation.logs"),
      icon: ScrollText,
      roleRequired: "super_admin",
    },
    { to: "/settings", label: t("navigation.userSettings"), icon: Settings },
  ];

  const filteredNavItems = mainNavItems.filter((item) => {
    if (!item.roleRequired) return true;
    if (
      [
        "/admin/settings",
        "/admin/review",
        "/admin/dashboard",
        "/admin/invoice-attachments",
        "/admin/billing",
        "/leaves",
      ].includes(item.to) &&
      profile?.role === "super_admin"
    ) return false;
    if (item.roleRequired === "super_admin") return profile?.role === "super_admin";
    return profile?.role === "company_admin" || profile?.role === "super_admin";
  });

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onMobileClose}
        className={`fixed inset-0 z-40 bg-text/24 backdrop-blur-[3px] transition-opacity duration-300 lg:hidden ${
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-surface-strong/94 shadow-[12px_0_36px_rgba(75,87,57,0.08)] backdrop-blur-2xl transition-[transform,width] duration-300 ease-out lg:inset-y-3 lg:left-3 lg:translate-x-0 lg:rounded-[20px] lg:border ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-17" : "lg:w-64"}`}
      >
        <div className="flex h-full flex-col">
          <div className={`flex h-16 items-center ${isCollapsed ? "px-4 lg:justify-center lg:px-2" : "px-4"}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-primary/25 shadow-[inset_0_0_0_1px_rgba(96,120,42,0.09)]">
                <img src="/logo.png" alt="ChronoSync" className="chronosync-logo h-8 w-8 object-contain" />
              </div>
              <div className={`${isCollapsed ? "lg:hidden" : ""} min-w-0`}>
                  <h1 className="truncate text-[14px] font-semibold tracking-[-0.02em] text-text">
                    Chrono<span className="text-primary-strong">Sync</span>
                  </h1>
                  <p className="truncate text-[9px] font-medium uppercase tracking-[0.11em] text-muted">
                    {profile?.role?.replace("_", " ") || t("navigation.portal")}
                  </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onMobileClose}
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-[9px] text-muted hover:bg-black/[0.04] hover:text-text lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mx-3.5 h-px bg-border" />

          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-3.5">
            <p className={`${isCollapsed ? "lg:hidden" : ""} mb-1.5 px-2.5 text-[10px] font-medium text-muted/75`}>
                {t("navigation.portal")}
            </p>
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group relative flex h-9 items-center rounded-[9px] transition-all duration-150 ${
                      isCollapsed ? "gap-2.5 px-2.5 lg:justify-center lg:gap-0 lg:px-0" : "gap-2.5 px-2.5"
                    } ${
                      isActive
                        ? "bg-black/[0.06] text-text shadow-[inset_0_0_0_1px_rgba(75,87,57,0.035)]"
                        : "text-muted-strong hover:bg-black/[0.035] hover:text-text"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`h-4 w-4 shrink-0 transition-colors duration-150 ${isActive ? "text-primary-strong stroke-[2.2]" : "stroke-[1.8]"}`} />
                      <span className={`${isCollapsed ? "lg:hidden" : ""} truncate text-[12.5px] font-medium`}>{item.label}</span>
                      {isActive && !isCollapsed ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-strong/65" /> : null}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-border p-2.5">
            <div className={`mb-1 flex items-center rounded-xl border border-border bg-white/35 ${isCollapsed ? "gap-2.5 p-2.5 lg:justify-center lg:p-1.5" : "gap-2.5 p-2.5"}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/35 text-[11px] font-semibold text-text shadow-[inset_0_0_0_1px_rgba(75,87,57,0.07)]">
                {profile?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className={`${isCollapsed ? "lg:hidden" : ""} min-w-0 flex-1`}>
                  <p className="truncate text-[12px] font-medium text-text">{profile?.full_name || "User Profile"}</p>
                  <p className="truncate text-[10px] text-muted">{getRoleLabel(profile?.role || "regular")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title={isCollapsed ? t("navigation.signOut") : undefined}
              className={`flex h-8 w-full items-center rounded-[9px] text-danger transition hover:bg-danger-bg/70 ${isCollapsed ? "gap-2.5 px-2.5 lg:justify-center lg:gap-0 lg:px-0" : "gap-2.5 px-2.5"}`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className={`${isCollapsed ? "lg:hidden" : ""} text-[12px] font-medium`}>{t("navigation.signOut")}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onCollapsedChange(!isCollapsed)}
            className="absolute -right-2.5 top-5 hidden h-5 w-5 items-center justify-center rounded-full border border-border-strong bg-surface-strong text-muted shadow-sm transition hover:text-text lg:flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        </div>
      </aside>
    </>
  );
};
